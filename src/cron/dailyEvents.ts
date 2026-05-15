import cron from 'node-cron';
import {
  fetchCoffeePhotoUrl,
  getRandomMorningGreeting,
  fetchMorningHeaderForDate,
  fetchDailyFactsForDate,
  fetchFinancePost,
  fetchDigestFacts,
} from '@/events/fetchRealEvents.js';
import { fetchTrackOfDay, buildTrackMessage } from '@/events/fetchers/trackOfDay.js';
import { fetchMovieOfDay } from '@/events/fetchers/movieOfDay.js';
import { bot } from '@/botInstance.js';
import { TIMEZONE } from '@/config/constants.js';
import { getRandomUser } from '@/config/users.js';
import { loadUserMemory } from '@/context/userMemory.js';
import { buildCoffeeGreetingPrompt, buildDailyDialoguePrompt, buildDailyDialogueWithFactPrompt } from '@/config/prompts.js';
import { gptunnelChat } from '@/ai/gptunnel.js';
import { getCronChatIds, isEnabled } from '@/modules/moduleConfig.js';
import { logger } from '@/utils/logger.js';

function generateSpreadDelays(count: number, maxMinutes: number, minGapMinutes: number): number[] {
  const delays: number[] = [];
  for (let i = 0; i < count; i++) {
    let attempt = 0;
    let delay: number;
    do {
      delay = Math.floor(Math.random() * maxMinutes) * 60_000;
      attempt++;
    } while (attempt < 100 && delays.some((d) => Math.abs(d - delay) < minGapMinutes * 60_000));
    delays.push(delay);
  }
  return delays.sort((a, b) => a - b);
}

async function sendToChatIds(
  chatIds: string[],
  send: (chatId: string) => Promise<unknown>,
): Promise<void> {
  const results = await Promise.allSettled(chatIds.map(send));
  for (const r of results) {
    if (r.status === 'rejected') {
      logger.error('[daily-events] Send failed', { err: String(r.reason) });
    }
  }
}

export function setupDailyEventsCron() {
  // 8:55 AM — coffee photo + date + holidays + personal greeting
  cron.schedule(
    '55 8 * * *',
    async () => {
      const chatIds = getCronChatIds('daily-events');
      if (chatIds.length === 0) return;

      try {
        const now = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }),
        );

        const [coffeeUrl, headerText] = await Promise.all([
          fetchCoffeePhotoUrl(),
          fetchMorningHeaderForDate(now),
        ]);

        const greeting = getRandomMorningGreeting();

        let personalGreeting = '';
        const targetUser = getRandomUser();
        if (targetUser) {
          try {
            const memories = await loadUserMemory(targetUser.id);
            const prompt = buildCoffeeGreetingPrompt(targetUser, memories);
            const personal = await gptunnelChat([{ role: 'user', content: prompt }]);
            if (personal.trim()) {
              const mention = targetUser.username
                ? `@${targetUser.username}`
                : targetUser.firstName;
              personalGreeting = `\n\n${mention}, ${personal.trim()}`;
            }
          } catch (err) {
            logger.error('[daily-events] Personal greeting error', { err: String(err) });
          }
        }

        const caption = `${headerText}\n\n${greeting}${personalGreeting}`.slice(0, 1020);

        await sendToChatIds(chatIds, async (chatId) => {
          if (coffeeUrl) {
            await bot.api.sendPhoto(chatId, coffeeUrl, { caption, parse_mode: 'HTML' });
          } else {
            await bot.api.sendMessage(chatId, `☕ ${caption}`, { parse_mode: 'HTML' });
          }
        });
      } catch (err) {
        logger.error('[daily-events] Coffee post failed (8:55)', { err: String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:00 AM — place + weather + facts + births + riddle + dilemma
  cron.schedule(
    '0 9 * * *',
    async () => {
      const chatIds = getCronChatIds('daily-events');
      if (chatIds.length === 0) return;

      try {
        const now = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }),
        );
        const text = await fetchDailyFactsForDate(now);
        await sendToChatIds(chatIds, (chatId) =>
          bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' }),
        );
      } catch (err) {
        logger.error('[daily-events] Facts digest failed (9:00)', { err: String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:05 AM — currency + investments + fear&greed
  cron.schedule(
    '5 9 * * *',
    async () => {
      const chatIds = getCronChatIds('daily-events');
      if (chatIds.length === 0) return;

      try {
        const text = await fetchFinancePost();
        await sendToChatIds(chatIds, (chatId) =>
          bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' }),
        );
      } catch (err) {
        logger.error('[daily-events] Finance post failed (9:05)', { err: String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:10 AM — track of the day + movie of the day (one post)
  cron.schedule(
    '10 9 * * *',
    async () => {
      const chatIds = getCronChatIds('daily-events');
      if (chatIds.length === 0) return;

      try {
        const [trackResult, movieResult] = await Promise.allSettled([
          fetchTrackOfDay().then(buildTrackMessage),
          fetchMovieOfDay(),
        ]);

        const trackText = trackResult.status === 'fulfilled' ? trackResult.value : null;
        const movieText = movieResult.status === 'fulfilled' ? movieResult.value : null;

        const parts = [trackText, movieText].filter(Boolean);
        if (parts.length === 0) return;

        const message = parts.join('\n\n<b>──────────────</b>\n\n');
        await sendToChatIds(chatIds, (chatId) =>
          bot.api.sendMessage(chatId, message, { parse_mode: 'HTML' }),
        );
      } catch (err) {
        logger.error('[daily-events] Track/movie post failed (9:10)', { err: String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  // 10:00 AM — случайные обращения к пользователям в течение рабочего дня (2–4 раза)
  cron.schedule(
    '0 10 * * *',
    () => {
      // Read chatIds at schedule time — re-read inside each timeout for live config
      const count = Math.floor(Math.random() * 3) + 2; // 2, 3 или 4
      const delays = generateSpreadDelays(count, 8 * 60, 45);

      delays.forEach((delayMs) => {
        setTimeout(async () => {
          // Live-read chatIds so late-toggled chats are respected
          const chatIds = getCronChatIds('daily-events');
          if (chatIds.length === 0) return;

          try {
            const user = getRandomUser();
            if (!user) return;

            const memories = await loadUserMemory(user.id);
            const facts = await fetchDigestFacts();

            const useFact = facts.length > 0 && Math.random() < 0.6;
            const prompt = useFact
              ? buildDailyDialogueWithFactPrompt(user, memories, facts[Math.floor(Math.random() * facts.length)])
              : buildDailyDialoguePrompt(user, memories);

            const msg = await gptunnelChat([{ role: 'user', content: prompt }]);
            const mention = user.username ? `@${user.username}` : user.firstName;

            await sendToChatIds(chatIds, (chatId) => {
              if (!isEnabled(chatId, 'ai-chat')) return Promise.resolve();
              return bot.api.sendMessage(chatId, `${mention} ${msg.trim()}`);
            });
          } catch (err) {
            logger.error('[daily-events] Random dialogue failed', { err: String(err) });
          }
        }, delayMs);
      });
    },
    { timezone: TIMEZONE },
  );

  logger.info(
    '⏰ Cron scheduled: 8:55 coffee+date | 9:00 facts | 9:05 finance | 9:10 track+movie | 10:00 dialogues (Chelyabinsk)',
  );
}

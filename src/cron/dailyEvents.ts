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
import { polzaChat } from '@/ai/polza.js';
import { getEnabledChatsForModule } from '@/modules/moduleConfig.js';
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

async function sendToChats(chatIds: string[], text: string, photoUrl?: string | null) {
  for (const chatId of chatIds) {
    try {
      if (photoUrl) {
        await bot.api.sendPhoto(chatId, photoUrl, { caption: text, parse_mode: 'HTML' });
      } else {
        await bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
      }
    } catch (err) {
      logger.error('Daily events send failed', {
        chatId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export function setupDailyEventsCron() {
  // 8:55 AM — coffee photo + date + holidays + personal greeting
  cron.schedule(
    '55 8 * * *',
    async () => {
      const enabledChats = getEnabledChatsForModule('daily-events');
      if (enabledChats.length === 0) return;

      try {
        const now = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }),
        );

        const [coffeeUrl, headerText] = await Promise.all([
          fetchCoffeePhotoUrl(),
          fetchMorningHeaderForDate(now),
        ]);

        const greeting = getRandomMorningGreeting();

        // Персональное обращение к случайному пользователю
        let personalGreeting = '';
        const targetUser = getRandomUser();
        if (targetUser) {
          try {
            const memories = await loadUserMemory(targetUser.id);
            const prompt = buildCoffeeGreetingPrompt(targetUser, memories);
            const personal = await polzaChat([{ role: 'user', content: prompt }]);
            if (personal.trim()) {
              const mention = targetUser.username
                ? `@${targetUser.username}`
                : targetUser.firstName;
              personalGreeting = `\n\n${mention}, ${personal.trim()}`;
            }
          } catch (err) {
            console.error('Personal greeting error:', err);
          }
        }

        const caption = `${headerText}\n\n${greeting}${personalGreeting}`.slice(0, 1020);

        await sendToChats(enabledChats, caption, coffeeUrl);
      } catch (err) {
        logger.error('Кофе-пост (8:55) ошибся', { err: err instanceof Error ? err.message : String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:00 AM — place + weather + facts + births + riddle + dilemma
  cron.schedule(
    '0 9 * * *',
    async () => {
      const enabledChats = getEnabledChatsForModule('daily-events');
      if (enabledChats.length === 0) return;

      try {
        const now = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }),
        );
        const text = await fetchDailyFactsForDate(now);
        await sendToChats(enabledChats, text);
      } catch (err) {
        logger.error('Дайджест (9:00) ошибся', { err: err instanceof Error ? err.message : String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:05 AM — currency + investments + fear&greed
  cron.schedule(
    '5 9 * * *',
    async () => {
      const enabledChats = getEnabledChatsForModule('daily-events');
      if (enabledChats.length === 0) return;

      try {
        const text = await fetchFinancePost();
        await sendToChats(enabledChats, text);
      } catch (err) {
        logger.error('Финансовый пост (9:05) ошибся', { err: err instanceof Error ? err.message : String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:10 AM — track of the day + movie of the day (one post)
  cron.schedule(
    '10 9 * * *',
    async () => {
      const enabledChats = getEnabledChatsForModule('daily-events');
      if (enabledChats.length === 0) return;

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
        await sendToChats(enabledChats, message);
      } catch (err) {
        logger.error('Трек/фильм (9:10) ошибся', { err: err instanceof Error ? err.message : String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  // 10:00 AM — случайные обращения к пользователям в течение рабочего дня (2–4 раза)
  cron.schedule(
    '0 10 * * *',
    () => {
      const enabledChats = getEnabledChatsForModule('daily-events');
      if (enabledChats.length === 0) return;

      const count = Math.floor(Math.random() * 3) + 2; // 2, 3 или 4
      const maxMinutes = 8 * 60; // окно до 18:00
      const minGapMinutes = 45;

      const delays = generateSpreadDelays(count, maxMinutes, minGapMinutes);

      delays.forEach((delayMs) => {
        setTimeout(async () => {
          const currentEnabledChats = getEnabledChatsForModule('daily-events');
          if (currentEnabledChats.length === 0) return;

          // Также проверяем ai-chat для этих чатов
          const { isEnabled } = await import('@/modules/moduleConfig.js');
          const chatsWithAi = currentEnabledChats.filter((c) => isEnabled(c, 'ai-chat'));
          if (chatsWithAi.length === 0) return;

          try {
            const user = getRandomUser();
            if (!user) return;

            const memories = await loadUserMemory(user.id);
            const facts = await fetchDigestFacts();

            const useFact = facts.length > 0 && Math.random() < 0.6;
            const prompt = useFact
              ? buildDailyDialogueWithFactPrompt(user, memories, facts[Math.floor(Math.random() * facts.length)])
              : buildDailyDialoguePrompt(user, memories);

            const msg = await polzaChat([{ role: 'user', content: prompt }]);
            const mention = user.username ? `@${user.username}` : user.firstName;

            // Отправляем в все чаты с daily-events + ai-chat
            for (const chatId of chatsWithAi) {
              try {
                await bot.api.sendMessage(chatId, `${mention} ${msg.trim()}`);
              } catch (err) {
                logger.error('Случайный диалог send failed', {
                  chatId,
                  err: err instanceof Error ? err.message : String(err),
                });
              }
            }
          } catch (err) {
            logger.error('Случайный диалог (10:00) ошибся', { err: err instanceof Error ? err.message : String(err) });
          }
        }, delayMs);
      });
    },
    { timezone: TIMEZONE },
  );

  console.log(
    '⏰ Cron scheduled: 8:55 coffee+date | 9:00 facts | 9:05 finance | 9:10 track+movie | 10:00 dialogues (Chelyabinsk) — dynamic chats via module config'
  );
}
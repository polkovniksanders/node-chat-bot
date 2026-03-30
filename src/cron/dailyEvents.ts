import cron from 'node-cron';
import {
  fetchCoffeePhotoUrl,
  getRandomMorningGreeting,
  fetchMorningHeaderForDate,
  fetchDailyFactsForDate,
  fetchFinancePost,
} from '@/events/fetchRealEvents.js';
import { fetchTrackOfDay, buildTrackMessage } from '@/events/fetchers/trackOfDay.js';
import { fetchMovieOfDay } from '@/events/fetchers/movieOfDay.js';
import { bot } from '@/botInstance.js';
import { TIMEZONE, TEST_CHANNEL } from '@/config/constants.js';
import { getRandomUser } from '@/config/users.js';
import { loadUserMemory } from '@/context/userMemory.js';
import { buildCoffeeGreetingPrompt, buildDailyDialoguePrompt } from '@/config/prompts.js';
import { gptunnelChat } from '@/ai/gptunnel.js';

export function setupDailyEventsCron() {
  const channelId = process.env.EVENTS_CHANNEL_ID!;

  // 8:55 AM — coffee photo + date + holidays + personal greeting
  cron.schedule(
    '55 8 * * *',
    async () => {
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
            const personal = await gptunnelChat([{ role: 'user', content: prompt }]);
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

        if (coffeeUrl) {
          await bot.api.sendPhoto(channelId, coffeeUrl, { caption, parse_mode: 'HTML' });
        } else {
          await bot.api.sendMessage(channelId, `☕ ${caption}`, { parse_mode: 'HTML' });
        }
      } catch (err) {
        const msg = `❌ Ошибка кофе-поста (8:55).\n\n${err instanceof Error ? err.message : err}`;
        await bot.api.sendMessage(TEST_CHANNEL, msg).catch(() => {});
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:00 AM — place + weather + facts + births + riddle + dilemma
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        const now = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }),
        );
        const text = await fetchDailyFactsForDate(now);
        await bot.api.sendMessage(channelId, text, { parse_mode: 'HTML' });
      } catch (err) {
        const msg = `❌ Ошибка дайджеста (9:00).\n\n${err instanceof Error ? err.message : err}`;
        await bot.api.sendMessage(TEST_CHANNEL, msg).catch(() => {});
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:05 AM — currency + investments + fear&greed
  cron.schedule(
    '5 9 * * *',
    async () => {
      try {
        const text = await fetchFinancePost();
        await bot.api.sendMessage(channelId, text, { parse_mode: 'HTML' });
      } catch (err) {
        const msg = `❌ Ошибка финансового поста (9:05).\n\n${err instanceof Error ? err.message : err}`;
        await bot.api.sendMessage(TEST_CHANNEL, msg).catch(() => {});
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:10 AM — track of the day + movie of the day (one post)
  cron.schedule(
    '10 9 * * *',
    async () => {
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
        await bot.api.sendMessage(channelId, message, { parse_mode: 'HTML' });
      } catch (err) {
        const msg = `❌ Ошибка трека/фильма (9:10).\n\n${err instanceof Error ? err.message : err}`;
        await bot.api.sendMessage(TEST_CHANNEL, msg).catch(() => {});
      }
    },
    { timezone: TIMEZONE },
  );

  // 10:00 AM — случайные обращения к пользователям в течение рабочего дня (1–2 раза)
  cron.schedule(
    '0 10 * * *',
    () => {
      const count = Math.random() < 0.5 ? 1 : 2;
      const maxMinutes = 8 * 60; // окно до 18:00

      for (let i = 0; i < count; i++) {
        const delayMs = Math.floor(Math.random() * maxMinutes) * 60_000;

        setTimeout(async () => {
          try {
            const user = getRandomUser();
            if (!user) return;

            const memories = await loadUserMemory(user.id);
            const prompt = buildDailyDialoguePrompt(user, memories);
            const msg = await gptunnelChat([{ role: 'user', content: prompt }]);

            const mention = user.username ? `@${user.username}` : user.firstName;
            await bot.api.sendMessage(channelId, `${mention} ${msg.trim()}`);
          } catch (err) {
            await bot.api
              .sendMessage(
                TEST_CHANNEL,
                `❌ Ошибка случайного диалога.\n\n${err instanceof Error ? err.message : err}`,
              )
              .catch(() => {});
          }
        }, delayMs);
      }
    },
    { timezone: TIMEZONE },
  );

  console.log(
    '⏰ Cron scheduled: 8:55 coffee+date | 9:00 facts | 9:05 finance | 9:10 track+movie | 10:00 dialogues (Chelyabinsk)',
  );
}
import cron from 'node-cron';
import { getDailyEvents } from '@/events/events.js';
import { fetchCoffeePhotoUrl, getRandomMorningGreeting } from '@/events/fetchRealEvents.js';
import { bot } from '@/botInstance.js';
import { TIMEZONE, TEST_CHANNEL } from '@/config/constants.js';
import { getRandomUser } from '@/config/users.js';
import { loadUserMemory } from '@/context/userMemory.js';
import { buildCoffeeGreetingPrompt, buildDailyDialoguePrompt } from '@/config/prompts.js';
import { gptunnelChat } from '@/ai/gptunnel.js';

export function setupDailyEventsCron() {
  const channelId = process.env.EVENTS_CHANNEL_ID!;

  // 8:55 AM — coffee photo with morning greeting (5 min before the digest)
  cron.schedule(
    '55 8 * * *',
    async () => {
      try {
        const coffeeUrl = await fetchCoffeePhotoUrl();
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
            // Тихо пропускаем — базовое приветствие отправится без личного блока
          }
        }

        const caption = (greeting + personalGreeting).slice(0, 1020);

        if (coffeeUrl) {
          await bot.api.sendPhoto(channelId, coffeeUrl, { caption });
        } else {
          // No photo available — send greeting as text only
          await bot.api.sendMessage(channelId, `☕ ${caption}`, { parse_mode: 'HTML' });
        }
      } catch (err) {
        const msg = `❌ Ошибка кофе-поста (8:55).\n\n${err instanceof Error ? err.message : err}`;
        await bot.api.sendMessage(TEST_CHANNEL, msg).catch(() => {});
      }
    },
    { timezone: TIMEZONE },
  );

  // 9:00 AM — main daily digest
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        const events = await getDailyEvents();
        await bot.api.sendMessage(channelId, events.text, { parse_mode: 'HTML' });
      } catch (err) {
        const msg = `❌ Ошибка дайджеста событий (9:00).\n\n${err instanceof Error ? err.message : err}`;
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
    '⏰ Cron for daily events scheduled (8:55 coffee + 9:00 digest + 10:00 dialogues, Chelyabinsk time)',
  );
}

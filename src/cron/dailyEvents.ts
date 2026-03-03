import cron from 'node-cron';
import { getDailyEvents } from '@/events/events.js';
import { fetchCoffeePhotoUrl, getRandomMorningGreeting } from '@/events/fetchRealEvents.js';
import { bot } from '@/botInstance.js';

export function setupDailyEventsCron() {
  const channelId = process.env.EVENTS_CHANNEL_ID!;

  // 8:55 AM — coffee photo with morning greeting (5 min before the digest)
  cron.schedule(
    '55 8 * * *',
    async () => {
      try {
        const coffeeUrl = await fetchCoffeePhotoUrl();
        const greeting = getRandomMorningGreeting();

        if (coffeeUrl) {
          await bot.api.sendPhoto(channelId, coffeeUrl, { caption: greeting });
        } else {
          // No photo available — send greeting as text only
          await bot.api.sendMessage(channelId, `☕ ${greeting}`, { parse_mode: 'HTML' });
        }
      } catch (err) {
        console.error('❌ Failed to send morning coffee post:', err);
      }
    },
    { timezone: 'Asia/Yekaterinburg' },
  );

  // 9:00 AM — main daily digest
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        const events = await getDailyEvents();
        await bot.api.sendMessage(channelId, events.text, { parse_mode: 'HTML' });
      } catch (err) {
        console.error('❌ Failed to send daily events digest:', err);
      }
    },
    { timezone: 'Asia/Yekaterinburg' },
  );

  console.log('⏰ Cron for daily events scheduled (8:55 coffee + 9:00 digest, Chelyabinsk time)');
}

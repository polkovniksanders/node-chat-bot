import cron from 'node-cron';
import { getDailyEvents } from '@/events/events.js';
import { bot } from '@/botInstance.js';

export function setupDailyEventsCron() {
  // 9:00 AM по Челябинскому времени (Asia/Yekaterinburg, UTC+5)
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        const events = await getDailyEvents();
        const channelId = process.env.EVENTS_CHANNEL_ID!;

        await bot.api.sendMessage(channelId, events.text, {
          parse_mode: 'HTML',
        });
      } catch (err) {
        console.error('❌ Failed to send daily events:', err);
      }
    },
    { timezone: 'Asia/Yekaterinburg' },
  );

  console.log('⏰ Cron for daily events scheduled (9:00 AM Chelyabinsk time)');
}

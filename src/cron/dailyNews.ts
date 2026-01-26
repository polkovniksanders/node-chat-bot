import cron from 'node-cron';
import { getNewsDigestEmoji } from '@/news/news.js';
import { bot } from '@/botInstance.js';

export function setupDailyNewsCron() {
  cron.schedule('15 14,17,22,2 * * *', async () => {
    try {
      const digest = await getNewsDigestEmoji();

      await bot.api.sendMessage(process.env.CHANNEL_ID!, digest.text, {
        parse_mode: 'HTML',
      });
    } catch (err) {
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for daily news scheduled for 09:15, 12:15, 17:15, 21:15 (UTC-5)');
}

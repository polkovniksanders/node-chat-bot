import cron from 'node-cron';
import { bot } from '../botInstance.js';
import { getNewsDigestEmoji } from '../news/news.js';

export function setupDailyNewsCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      const digest = await getNewsDigestEmoji();
      await bot.api.sendMessage(process.env.CHANNEL_ID!, digest, {
        parse_mode: 'HTML',
      });

      console.log('digest', digest);

      console.log('📰 News digest sent');
    } catch (err) {
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for hourly news started');
}

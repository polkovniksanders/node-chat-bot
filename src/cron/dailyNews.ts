import cron from 'node-cron';
import { getNewsDigestEmoji } from '../news/news.js';
import { bot } from '../botInstance.js';

export function setupDailyNewsCron() {
  cron.schedule('40 9,15,17,21 * * *', async () => {
    console.log('CRON TICK', new Date().toISOString());

    try {
      const digest = await getNewsDigestEmoji();

      await bot.api.sendMessage(process.env.CHANNEL_ID!, digest.text, {
        parse_mode: 'HTML',
      });
    } catch (err) {
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for daily news started at ...');
}

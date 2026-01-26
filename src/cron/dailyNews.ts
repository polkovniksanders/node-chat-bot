import cron from 'node-cron';
import { getNewsDigestEmoji } from '@/news/news.js';
import { bot } from '@/botInstance.js';

export function setupDailyNewsCron() {
  cron.schedule('00 14,17,18,22,2 * * *', async () => {
    try {
      const digest = await getNewsDigestEmoji();
      console.log('digest', digest);

      await bot.api.sendMessage(process.env.CHANNEL_ID!, digest.text, {
        parse_mode: 'HTML',
      });
      await bot.api.sendMessage('@node_js_test', digest.text, {
        parse_mode: 'HTML',
      });
    } catch (err) {
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for daily news scheduled (UTC-5)');
}

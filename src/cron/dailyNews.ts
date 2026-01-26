import cron from 'node-cron';
import { getNewsDigestEmoji } from '@/news/news.js';
import { bot } from '@/botInstance.js';

export function setupDailyNewsCron() {
  cron.schedule('07 4,14,17,18,22 * * *', async () => {
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
      await bot.api.sendMessage('@node_js_test', `Ошибка крона ${err}`);
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for daily news scheduled (UTC-5)');
}

import cron from 'node-cron';
import { getNewsDigestEmoji } from '@/news/news.js';
import { bot } from '@/botInstance.js';

export function setupDailyNewsCron() {
  cron.schedule('15 4,7,12,16 * * *', async () => {
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
      await bot.api.sendMessage('@node_js_test', `Ошибка ${err}`);
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for daily news scheduled (UTC, local UTC+5: 9:15, 12:15, 17:15, 21:15)');
}

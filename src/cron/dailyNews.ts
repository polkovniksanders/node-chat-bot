import cron from 'node-cron';
import { getNewsDigestEmoji } from '@/news/news.js';
import { bot } from '@/botInstance.js';

export function setupDailyNewsCron() {
  cron.schedule('30 5, 11, 18 * * *', async () => {
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
      const errorMsg = `❌ Не удалось сгенерировать новости.\n\nОшибка: ${err instanceof Error ? err.message : err}`;
      await bot.api.sendMessage('@node_js_test', errorMsg).catch(() => {});
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for daily news scheduled');
}

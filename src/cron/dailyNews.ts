import cron from 'node-cron';
import { getNewsDigestEmoji } from '@/news/news';
import { bot } from '@/botInstance';

export function setupDailyNewsCron() {
  //timezone -5

  cron.schedule('52 4,7,10,16 * * *', async () => {
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

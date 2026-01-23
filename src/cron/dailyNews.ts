import cron from 'node-cron';
import { getNewsDigestEmoji } from '../news/news.js';
import { bot } from '../botInstance.js';
import { generateDigestImage } from '../news/imageGemerator.js';

export function setupDailyNewsCron() {
  cron.schedule('20 9,15,17,21 * * *', async () => {
    console.log('CRON TICK', new Date().toISOString());

    try {
      const digest = await getNewsDigestEmoji();
      const imageUrl = await generateDigestImage(digest.text);

      console.log('digest', digest);
      console.log('imageUrl');

      await bot.api.sendPhoto(process.env.CHANNEL_ID!, imageUrl, {
        caption: digest.text,
        parse_mode: 'HTML',
      });
    } catch (err) {
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for daily news started at ...');
}

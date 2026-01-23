import cron from 'node-cron';
import { getNewsDigestEmoji } from '../news/news.js';
import { bot } from '../botInstance.js';
import { generateDigestImage } from '../news/imageGemerator.js';

export function setupDailyNewsCron() {
  cron.schedule('0 9,13,16,21 * * *', async () => {
    try {
      const digest = await getNewsDigestEmoji();
      const imageUrl = await generateDigestImage(digest.text);

      await bot.api.sendPhoto(process.env.CHANNEL_ID!, imageUrl, {
        caption: digest.text,
        parse_mode: 'HTML',
        reply_markup: digest.reply_markup,
      });

      console.log('📰 News digest sent');
    } catch (err) {
      console.error('❌ Failed to send news digest:', err);
    }
  });

  console.log('⏰ Cron for daily news started at 9:00, 13:00, 16:00, 21:00');
}

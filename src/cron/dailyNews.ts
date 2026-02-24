import cron from 'node-cron';
import { InputFile } from 'grammy';
import { getNewsDigestEmoji } from '@/news/news.js';
import { bot } from '@/botInstance.js';

async function sendDigest(channelId: string, text: string, image: Buffer | null) {
  if (image) {
    await bot.api.sendPhoto(channelId, new InputFile(image, 'news.jpg'), {
      caption: text,
      parse_mode: 'HTML',
    });
  } else {
    await bot.api.sendMessage(channelId, text, { parse_mode: 'HTML' });
  }
}

export function setupDailyNewsCron() {
  // 11:00 AM по Челябинскому времени (Asia/Yekaterinburg, UTC+5)
  cron.schedule(
    '0 11 * * *',
    async () => {
      try {
        const digest = await getNewsDigestEmoji();

        await sendDigest(process.env.CHANNEL_ID!, digest.text, digest.image);
        await sendDigest('@node_js_test', digest.text, digest.image);
      } catch (err) {
        const errorMsg = `❌ Не удалось сгенерировать новости.\n\nОшибка: ${err instanceof Error ? err.message : err}`;
        await bot.api.sendMessage('@node_js_test', errorMsg).catch(() => {});
        console.error('❌ Failed to send news digest:', err);
      }
    },
    { timezone: 'Asia/Yekaterinburg' },
  );

  console.log('⏰ Cron for daily news scheduled (11:00 AM Chelyabinsk time)');
}

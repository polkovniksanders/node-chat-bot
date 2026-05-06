import cron from 'node-cron';
import { bot } from '@/botInstance.js';
import { getNextFromQueue, markAsPosted } from '@/content/soraQueue.js';
import { generateSoraPostText } from '@/content/soraPost.js';
import { isEnabled } from '@/modules/moduleConfig.js';

const CHANNEL_ID = process.env.CHANNEL_ID!;
const TEST_CHANNEL = '@node_js_test';

async function postNextSoraVideo(): Promise<void> {
  const item = await getNextFromQueue();
  if (!item) {
    console.log('📭 Sora queue is empty, skipping');
    return;
  }

  console.log(`🎬 Posting Sora video: "${item.description}"`);
  const text = await generateSoraPostText(item.description);

  // Telegram caption limit is 1024 chars
  const caption = text.length > 1024 ? text.slice(0, 1021) + '...' : text;
  const opts = { caption, parse_mode: 'HTML' as const };

  await bot.api.sendVideo(CHANNEL_ID, item.fileId, opts);
  await bot.api.sendVideo(TEST_CHANNEL, item.fileId, opts);

  await markAsPosted(item.fileUniqueId);
  console.log(`✅ Sora video posted: "${item.description}"`);
}

export function setupSoraVideoCron(): void {
  // 18:00 по Челябинскому времени (Asia/Yekaterinburg, UTC+5)
  cron.schedule(
    '0 18 * * *',
    async () => {
      if (!isEnabled(CHANNEL_ID, 'sora-videos')) return;
      console.log('⏰ Sora video cron triggered');
      try {
        await postNextSoraVideo();
      } catch (err) {
        console.error('❌ Sora video cron failed:', err);
        await bot.api
          .sendMessage(
            TEST_CHANNEL,
            `❌ Ошибка Sora-видео: ${err instanceof Error ? err.message : err}`,
          )
          .catch(() => {});
      }
    },
    { timezone: 'Asia/Yekaterinburg' },
  );

  console.log('⏰ Sora video cron запущен (18:00 по Челябинску)');
}

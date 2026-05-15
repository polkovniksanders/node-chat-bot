import cron from 'node-cron';
import { bot } from '@/botInstance.js';
import { getNextFromQueue, markAsPosted } from '@/content/soraQueue.js';
import { generateSoraPostText } from '@/content/soraPost.js';
import { getCronChatIds } from '@/modules/moduleConfig.js';
import { logger } from '@/utils/logger.js';

async function postNextSoraVideo(): Promise<void> {
  const chatIds = getCronChatIds('sora-videos');
  if (chatIds.length === 0) {
    logger.info('[sora-videos] No chats configured, skipping');
    return;
  }

  const item = await getNextFromQueue();
  if (!item) {
    logger.info('[sora-videos] Queue is empty, skipping');
    return;
  }

  logger.info(`[sora-videos] Posting: "${item.description}"`);
  const text = await generateSoraPostText(item.description);
  const caption = text.length > 1024 ? text.slice(0, 1021) + '...' : text;
  const opts = { caption, parse_mode: 'HTML' as const };

  const results = await Promise.allSettled(
    chatIds.map((chatId) => bot.api.sendVideo(chatId, item.fileId, opts)),
  );

  const anySuccess = results.some((r) => r.status === 'fulfilled');
  for (const r of results) {
    if (r.status === 'rejected') {
      logger.error('[sora-videos] Send failed', { err: String(r.reason) });
    }
  }

  if (anySuccess) {
    await markAsPosted(item.fileUniqueId);
    logger.info(`[sora-videos] Posted: "${item.description}"`);
  }
}

export function setupSoraVideoCron(): void {
  // 18:00 по Челябинскому времени (Asia/Yekaterinburg, UTC+5)
  cron.schedule(
    '0 18 * * *',
    async () => {
      logger.info('[sora-videos] Cron triggered');
      try {
        await postNextSoraVideo();
      } catch (err) {
        logger.error('[sora-videos] Cron failed', { err: String(err) });
      }
    },
    { timezone: 'Asia/Yekaterinburg' },
  );

  logger.info('⏰ Sora video cron запущен (18:00 по Челябинску)');
}

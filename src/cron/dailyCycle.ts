import cron from 'node-cron';
import { InputFile } from 'grammy';
import { bot } from '@/botInstance.js';
import { getNewsDigestEmoji } from '@/news/news.js';
import { getCronChatIds } from '@/modules/moduleConfig.js';
import { getAnimalMoviePost } from '@/content/animalMovies.js';
import { getYoutubeVideoPost } from '@/content/youtubeVideos.js';
import { generatePetNamesPost } from '@/content/petNames.js';
import { generateAnimalStoryPost } from '@/content/animalStory.js';
import { TIMEZONE } from '@/config/constants.js';
import { readCurrentDay, advanceDay } from '@/content/cycleState.js';
import { logger } from '@/utils/logger.js';

async function sendPost(chatId: string, text: string, image?: Buffer | null) {
  if (image) {
    await bot.api.sendPhoto(chatId, new InputFile(image, 'post.jpg'), {
      caption: text,
      parse_mode: 'HTML',
    });
  } else {
    await bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }
}

async function runDayOne(chatId: string) {
  const digest = await getNewsDigestEmoji();
  await sendPost(chatId, digest.text, digest.image);
}

async function runDayTwo(chatId: string) {
  await sendPost(chatId, await getAnimalMoviePost());
}

async function runDayThree(chatId: string) {
  await sendPost(chatId, await getYoutubeVideoPost());
}

async function runDayFour(chatId: string) {
  await sendPost(chatId, await generatePetNamesPost());
}

async function runDayFive(chatId: string) {
  await sendPost(chatId, await generateAnimalStoryPost());
}

async function runDay(day: number, chatId: string): Promise<void> {
  switch (day) {
    case 1: await runDayOne(chatId); break;
    case 2: await runDayTwo(chatId); break;
    case 3: await runDayThree(chatId); break;
    case 4: await runDayFour(chatId); break;
    case 5: await runDayFive(chatId); break;
  }
}

export function setupDailyCycleCron() {
  // 11:00 по Челябинскому времени (Asia/Yekaterinburg, UTC+5)
  cron.schedule(
    '0 11 * * *',
    async () => {
      const chatIds = getCronChatIds('daily-cycle');
      if (chatIds.length === 0) {
        logger.info('[daily-cycle] No chats configured, skipping');
        return;
      }

      const day = await readCurrentDay();
      logger.info(`[daily-cycle] День ${day}, чатов: ${chatIds.length}`);

      const results = await Promise.allSettled(
        chatIds.map((chatId) => runDay(day, chatId)),
      );

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        for (const r of failed) {
          logger.error('[daily-cycle] Send failed', { err: String((r as PromiseRejectedResult).reason) });
        }
      } else {
        await advanceDay();
        logger.info(`[daily-cycle] День ${day} опубликован, переход к следующему`);
      }

      if (failed.length > 0 && failed.length < results.length) {
        // Partial success: some chats got it, advance anyway to avoid repeating
        await advanceDay();
        logger.warn(`[daily-cycle] Partial success: ${results.length - failed.length}/${results.length} чатов`);
      }
    },
    { timezone: TIMEZONE },
  );

  logger.info('⏰ Cron для 5-дневного цикла запущен (11:00 по Челябинску)');
}

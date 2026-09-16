import cron from 'node-cron';
import { InputFile } from 'grammy';
import { bot } from '@/botInstance.js';
import { getNewsDigestEmoji } from '@/news/news.js';
import { consumeCurrentDay } from '@/content/cycleState.js';
import { getAnimalMoviePost } from '@/content/animalMovies.js';
import { getYoutubeVideoPost } from '@/content/youtubeVideos.js';
import { generatePetNamesPost } from '@/content/petNames.js';
import { generateAnimalStoryPost } from '@/content/animalStory.js';
import { TIMEZONE } from '@/config/constants.js';
import { isEnabled } from '@/modules/moduleConfig.js';
import { logger } from '@/utils/logger.js';

const CHANNEL_ID = process.env.CHANNEL_ID!;

async function sendPost(text: string, image?: Buffer | null) {
  if (image) {
    await bot.api.sendPhoto(CHANNEL_ID, new InputFile(image, 'post.jpg'), {
      caption: text,
      parse_mode: 'HTML',
    });
  } else {
    await bot.api.sendMessage(CHANNEL_ID, text, { parse_mode: 'HTML' });
  }
}

async function runDayOne() {
  const digest = await getNewsDigestEmoji();
  await sendPost(digest.text, digest.image);
}

async function runDayTwo() {
  const text = await getAnimalMoviePost();
  await sendPost(text);
}

async function runDayThree() {
  const text = await getYoutubeVideoPost();
  // URL in text → Telegram auto-shows YouTube preview
  await sendPost(text);
}

async function runDayFour() {
  const text = await generatePetNamesPost();
  await sendPost(text);
}

async function runDayFive() {
  const text = await generateAnimalStoryPost();
  await sendPost(text);
}

export function setupDailyCycleCron() {
  // 11:00 по Челябинскому времени (Asia/Yekaterinburg, UTC+5)
  cron.schedule(
    '0 11 * * *',
    async () => {
      if (!isEnabled(CHANNEL_ID, 'daily-cycle')) return;

      const { day } = await consumeCurrentDay();

      console.log(`📅 Daily cycle — день ${day}`);

      try {
        switch (day) {
          case 1:
            await runDayOne();
            break;
          case 2:
            await runDayTwo();
            break;
          case 3:
            await runDayThree();
            break;
          case 4:
            await runDayFour();
            break;
          case 5:
            await runDayFive();
            break;
        }
        console.log(`✅ День ${day} успешно опубликован`);
      } catch (err) {
        console.error(`❌ Daily cycle day ${day} failed:`, err);
        logger.error('Daily cycle day failed', { day, err: err instanceof Error ? err.message : String(err) });
      }
    },
    { timezone: TIMEZONE },
  );

  console.log('⏰ Cron для 5-дневного цикла запущен (11:00 по Челябинску)');
}

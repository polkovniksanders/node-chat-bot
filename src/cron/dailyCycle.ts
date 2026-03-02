import cron from 'node-cron';
import { InputFile } from 'grammy';
import { bot } from '@/botInstance.js';
import { getNewsDigestEmoji } from '@/news/news.js';
import { consumeCurrentDay } from '@/content/cycleState.js';
import { ANIMAL_MOVIES, formatMoviePost } from '@/content/animalMovies.js';
import { YOUTUBE_VIDEOS, formatVideoPost } from '@/content/youtubeVideos.js';
import { generatePetNamesPost } from '@/content/petNames.js';
import { generateAnimalStoryPost } from '@/content/animalStory.js';

const CHANNEL_ID = process.env.CHANNEL_ID!;
const TEST_CHANNEL = '@node_js_test';

async function sendPost(text: string, image?: Buffer | null) {
  if (image) {
    await bot.api.sendPhoto(CHANNEL_ID, new InputFile(image, 'post.jpg'), {
      caption: text,
      parse_mode: 'HTML',
    });
    await bot.api.sendPhoto(TEST_CHANNEL, new InputFile(image, 'post.jpg'), {
      caption: text,
      parse_mode: 'HTML',
    });
  } else {
    await bot.api.sendMessage(CHANNEL_ID, text, { parse_mode: 'HTML' });
    await bot.api.sendMessage(TEST_CHANNEL, text, { parse_mode: 'HTML' });
  }
}

async function runDayOne() {
  const digest = await getNewsDigestEmoji();
  await sendPost(digest.text, digest.image);
}

async function runDayTwo(movieIndex: number) {
  const movie = ANIMAL_MOVIES[movieIndex % ANIMAL_MOVIES.length];
  const text = formatMoviePost(movie);
  await sendPost(text);
}

async function runDayThree(videoIndex: number) {
  const video = YOUTUBE_VIDEOS[videoIndex % YOUTUBE_VIDEOS.length];
  const text = formatVideoPost(video);
  // Для YouTube-видео отключаем превью ссылки на канал, чтобы показывалось превью видео.
  // parse_mode: HTML + URL в тексте — Telegram сам подтянет превью первого YouTube-линка.
  await bot.api.sendMessage(CHANNEL_ID, text, { parse_mode: 'HTML' });
  await bot.api.sendMessage(TEST_CHANNEL, text, { parse_mode: 'HTML' });
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
      const { day, movieIndex, videoIndex } = await consumeCurrentDay(
        ANIMAL_MOVIES.length,
        YOUTUBE_VIDEOS.length,
      );

      console.log(`📅 Daily cycle — день ${day}`);

      try {
        switch (day) {
          case 1:
            await runDayOne();
            break;
          case 2:
            await runDayTwo(movieIndex);
            break;
          case 3:
            await runDayThree(videoIndex);
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
        const errorMsg = `❌ Ошибка публикации (день ${day}).\n\n${err instanceof Error ? err.message : err}`;
        await bot.api.sendMessage(TEST_CHANNEL, errorMsg).catch(() => {});
        console.error(`❌ Daily cycle day ${day} failed:`, err);
      }
    },
    { timezone: 'Asia/Yekaterinburg' },
  );

  console.log('⏰ Cron для 5-дневного цикла запущен (11:00 по Челябинску)');
}

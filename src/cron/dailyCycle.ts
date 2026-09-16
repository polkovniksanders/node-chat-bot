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
import { type ModuleName } from '@/modules/moduleRegistry.js';
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

async function runNewsDigest() {
  const digest = await getNewsDigestEmoji();
  await sendPost(digest.text, digest.image);
}

async function runAnimalMovie() {
  const text = await getAnimalMoviePost();
  await sendPost(text);
}

async function runYoutubeVideo() {
  const text = await getYoutubeVideoPost();
  // URL in text → Telegram auto-shows YouTube preview
  await sendPost(text);
}

async function runPetNames() {
  const text = await generatePetNamesPost();
  await sendPost(text);
}

async function runAnimalStory() {
  const text = await generateAnimalStoryPost();
  await sendPost(text);
}

/**
 * День цикла → модуль из реестра. Все посты идут в CHANNEL_ID,
 * расписание одно (один cron), а админ может выключить любой день отдельно.
 */
const DAY_POSTS: ReadonlyArray<{ day: number; module: ModuleName; run: () => Promise<void> }> = [
  { day: 1, module: 'daily-news', run: runNewsDigest },
  { day: 2, module: 'daily-animal-movie', run: runAnimalMovie },
  { day: 3, module: 'daily-youtube-video', run: runYoutubeVideo },
  { day: 4, module: 'daily-pet-names', run: runPetNames },
  { day: 5, module: 'daily-animal-story', run: runAnimalStory },
];

export function setupDailyCycleCron() {
  // 11:00 по Челябинскому времени (Asia/Yekaterinburg, UTC+5)
  cron.schedule(
    '0 11 * * *',
    async () => {
      const { day } = await consumeCurrentDay();

      const post = DAY_POSTS.find((p) => p.day === day);
      if (!post) {
        logger.error('Daily cycle: неизвестный день — пропускаем', { day });
        return;
      }

      if (!isEnabled(CHANNEL_ID, post.module)) {
        logger.info(`Daily cycle: день ${day} (${post.module}) выключен админом — пропускаю`);
        return;
      }

      console.log(`📅 Daily cycle — день ${day} (${post.module})`);

      try {
        await post.run();
        console.log(`✅ День ${day} успешно опубликован (${post.module})`);
      } catch (err) {
        console.error(`❌ Daily cycle day ${day} failed:`, err);
        logger.error('Daily cycle day failed', {
          day,
          module: post.module,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: TIMEZONE },
  );

  console.log(`⏰ Cron для 5-дневного цикла запущен (11:00 по Челябинску) — модули: ${DAY_POSTS.map((p) => p.module).join(', ')}`);
}
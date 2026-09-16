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
import { getEnabledChatsForModule } from '@/modules/moduleConfig.js';
import { type ModuleName } from '@/modules/moduleRegistry.js';
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

async function runNewsDigest(chatId: string) {
  const digest = await getNewsDigestEmoji();
  await sendPost(chatId, digest.text, digest.image);
}

async function runAnimalMovie(chatId: string) {
  const text = await getAnimalMoviePost();
  await sendPost(chatId, text);
}

async function runYoutubeVideo(chatId: string) {
  const text = await getYoutubeVideoPost();
  await sendPost(chatId, text);
}

async function runPetNames(chatId: string) {
  const text = await generatePetNamesPost();
  await sendPost(chatId, text);
}

async function runAnimalStory(chatId: string) {
  const text = await generateAnimalStoryPost();
  await sendPost(chatId, text);
}

const DAY_POSTS: ReadonlyArray<{ day: number; module: ModuleName; run: (chatId: string) => Promise<void> }> = [
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

      const enabledChats = getEnabledChatsForModule(post.module);
      if (enabledChats.length === 0) {
        logger.info(`Daily cycle: день ${day} (${post.module}) — нет чатов с включённым модулем, пропускаю`);
        return;
      }

      console.log(`📅 Daily cycle — день ${day} (${post.module}) → ${enabledChats.length} чат(ов)`);

      for (const chatId of enabledChats) {
        try {
          await post.run(chatId);
          console.log(`✅ День ${day} опубликован в ${chatId} (${post.module})`);
        } catch (err) {
          console.error(`❌ Daily cycle day ${day} failed for ${chatId}:`, err);
          logger.error('Daily cycle day failed', {
            day,
            module: post.module,
            chatId,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
    },
    { timezone: TIMEZONE },
  );

  console.log(`⏰ Cron для 5-дневного цикла запущен (11:00 по Челябинску) — модули: ${DAY_POSTS.map((p) => p.module).join(', ')}`);
}
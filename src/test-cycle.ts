/**
 * Быстрый тест 5-дневного цикла.
 * Запуск: npm run test-cycle
 */

import 'dotenv/config';
import { InputFile } from 'grammy';
import { bot } from '@/botInstance.js';
import { getNewsDigestEmoji } from '@/news/news.js';
import { ANIMAL_MOVIES, formatMoviePost } from '@/content/animalMovies.js';
import { YOUTUBE_VIDEOS, formatVideoPost } from '@/content/youtubeVideos.js';
import { generatePetNamesPost } from '@/content/petNames.js';
import { generateAnimalStoryPost } from '@/content/animalStory.js';

const TEST_CHANNEL = '@node_js_test';

async function send(text: string, image?: Buffer | null) {
  if (image) {
    await bot.api.sendPhoto(TEST_CHANNEL, new InputFile(image, 'post.jpg'), {
      caption: text,
      parse_mode: 'HTML',
    });
  } else {
    await bot.api.sendMessage(TEST_CHANNEL, text, { parse_mode: 'HTML' });
  }
}

async function runTest(label: string, fn: () => Promise<void>) {
  console.log(`\n🧪 ${label}...`);
  try {
    await fn();
    console.log(`✅ ${label} — OK`);
  } catch (err) {
    console.error(`❌ ${label} — ОШИБКА:`, err instanceof Error ? err.message : err);
    await bot.api
      .sendMessage(TEST_CHANNEL, `❌ <b>${label}</b> — ошибка:\n${err instanceof Error ? err.message : err}`, {
        parse_mode: 'HTML',
      })
      .catch(() => {});
  }
}

async function main() {
  await bot.api.sendMessage(
    TEST_CHANNEL,
    '🚀 <b>Тест 5-дневного цикла</b>\n\nЗапускаю все 5 дней...',
    { parse_mode: 'HTML' },
  );

  await runTest('День 1 — Котовости', async () => {
    const digest = await getNewsDigestEmoji();
    await send(digest.text, digest.image);
  });

  await runTest('День 2 — Фильм про животных', async () => {
    const movie = ANIMAL_MOVIES[0];
    await send(formatMoviePost(movie));
  });

  await runTest('День 3 — YouTube видео', async () => {
    const video = YOUTUBE_VIDEOS[0];
    await bot.api.sendMessage(TEST_CHANNEL, formatVideoPost(video), { parse_mode: 'HTML' });
  });

  await runTest('День 4 — AI: Клички', async () => {
    const text = await generatePetNamesPost();
    await send(text);
  });

  await runTest('День 5 — AI: Рассказ', async () => {
    const text = await generateAnimalStoryPost();
    await send(text);
  });

  await bot.api.sendMessage(TEST_CHANNEL, '✅ <b>Тест завершён!</b> Проверь все посты выше.', {
    parse_mode: 'HTML',
  });

  console.log('\n✅ Тест завершён!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

/**
 * Быстрый тест 5-дневного цикла.
 * Запуск: npm run test-cycle
 */

import 'dotenv/config';
import { InputFile } from 'grammy';
import { bot } from '../src/botInstance.js';
import { getNewsDigestEmoji } from '../src/news/news.js';
import { getAnimalMoviePost } from '../src/content/animalMovies.js';
import { getYoutubeVideoPost } from '../src/content/youtubeVideos.js';
import { generatePetNamesPost } from '../src/content/petNames.js';
import { generateAnimalStoryPost } from '../src/content/animalStory.js';
import { TEST_CHANNEL } from '../src/config/constants.js';

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
    const text = await getAnimalMoviePost();
    await send(text);
  });

  await runTest('День 3 — YouTube видео', async () => {
    const text = await getYoutubeVideoPost();
    await bot.api.sendMessage(TEST_CHANNEL, text, { parse_mode: 'HTML' });
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
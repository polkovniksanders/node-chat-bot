/**
 * Быстрый тест дайджеста событий дня.
 * Запуск: npm run test-events
 */

import 'dotenv/config';
import { bot } from '../src/botInstance.js';
import { getDailyEvents } from '../src/events/events.js';
import { TEST_CHANNEL } from '../src/config/constants.js';

async function main() {
  console.log('🧪 Генерирую дайджест событий...');
  const events = await getDailyEvents();
  console.log('\n--- ТЕКСТ ПОСТА ---\n');
  console.log(events.text);
  console.log('\n-------------------\n');

  await bot.api.sendMessage(TEST_CHANNEL, events.text, { parse_mode: 'HTML' });
  console.log('✅ Отправлено в', TEST_CHANNEL);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
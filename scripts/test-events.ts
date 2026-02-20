import 'dotenv/config';
import { bot } from '../src/botInstance.js';
import { getDailyEvents } from '../src/events/events.js';

const channelId = process.env.EVENTS_CHANNEL_ID;
if (!channelId) {
  console.error('❌ EVENTS_CHANNEL_ID не задан в .env');
  process.exit(1);
}

console.log('📡 Генерирую дайджест событий...');

const events = await getDailyEvents();

console.log('\n--- Готовый текст ---\n');
console.log(events.text);
console.log('\n--- Отправляю в канал ---');

await bot.api.sendMessage(channelId, events.text, { parse_mode: 'HTML' });

console.log(`✅ Отправлено в ${channelId}`);
process.exit(0);

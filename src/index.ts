import 'dotenv/config';
import { bot } from '@/botInstance.js';
import { setupHandlers } from '@/bot/handlers.js';
import { setupDailyCycleCron } from '@/cron/dailyCycle.js';
import { setupDailyEventsCron } from '@/cron/dailyEvents.js';

if (!process.env.TELEGRAM_TOKEN) {
  console.error('❌ TELEGRAM_TOKEN не задан в .env');
  process.exit(1);
}

if (!process.env.EVENTS_CHANNEL_ID) {
  console.warn('⚠️ EVENTS_CHANNEL_ID не задан — дайджест событий дня отключён');
}

setupHandlers(bot);
setupDailyCycleCron();

if (process.env.EVENTS_CHANNEL_ID) {
  setupDailyEventsCron();
}

bot.catch((err) => console.error('❌ Bot error:', err));

bot.start().then(() => {
  console.log('🤖 Bot started in LONG POLLING mode');
});

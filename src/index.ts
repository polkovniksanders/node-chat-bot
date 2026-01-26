import 'dotenv/config';
import { bot } from '@/botInstance.js';
import { setupHandlers } from '@/bot/handlers.js';
import { setupDailyNewsCron } from '@/cron/dailyNews.js';

if (!process.env.TELEGRAM_TOKEN) {
  console.error('❌ TELEGRAM_TOKEN не задан в .env');
  process.exit(1);
}

setupHandlers(bot);
setupDailyNewsCron();

bot.catch((err) => console.error('❌ Bot error:', err));

bot.start().then(() => {
  console.log('🤖 Bot started in LONG POLLING mode');
});

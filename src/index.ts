import 'dotenv/config';
import { bot, initBotInfo } from '@/botInstance.js';
import { setupHandlers } from '@/bot/handlers.js';
import { setupDailyCycleCron } from '@/cron/dailyCycle.js';
import { setupDailyEventsCron } from '@/cron/dailyEvents.js';
import { setupSoraVideoCron } from '@/cron/soraVideoCron.js';
import { logger } from '@/utils/logger.js';

if (!process.env.TELEGRAM_TOKEN) {
  logger.error('TELEGRAM_TOKEN не задан в .env');
  process.exit(1);
}

if (!process.env.EVENTS_CHANNEL_ID) {
  logger.warn('EVENTS_CHANNEL_ID не задан — дайджест событий дня отключён');
}

setupHandlers(bot);
setupDailyCycleCron();
setupSoraVideoCron();

if (process.env.EVENTS_CHANNEL_ID) {
  setupDailyEventsCron();
}

bot.catch((err) => logger.error('Unhandled bot error', { err: String(err) }));

initBotInfo()
  .then(() => bot.start())
  .then(() => {
    logger.info('Bot started', { mode: 'long-polling' });
  });

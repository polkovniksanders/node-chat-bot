import 'dotenv/config';
import { createServer } from 'node:http';
import { webhookCallback } from 'grammy';
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

const WEBHOOK_PORT = Number(process.env.WEBHOOK_PORT ?? 3001);
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'https://berghub.ru/bot';
const SECRET_TOKEN = process.env.WEBHOOK_SECRET ?? '';

const handleUpdate = webhookCallback(bot, 'http');

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/bot') {
    if (SECRET_TOKEN && req.headers['x-telegram-bot-api-secret-token'] !== SECRET_TOKEN) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    await handleUpdate(req, res);
    return;
  }
  res.writeHead(200);
  res.end('OK');
});

initBotInfo().then(async () => {
  await bot.api.setWebhook(WEBHOOK_URL, {
    secret_token: SECRET_TOKEN || undefined,
  });
  logger.info('Webhook set', { url: WEBHOOK_URL });

  server.listen(WEBHOOK_PORT, () => {
    logger.info('Bot started', { mode: 'webhook', port: WEBHOOK_PORT, url: WEBHOOK_URL });
  });
});
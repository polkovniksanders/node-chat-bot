import 'dotenv/config';
import express from 'express';
import { webhookCallback } from 'grammy';

import { bot } from './botInstance.js';
import { setupHandlers } from './bot/handlers.js';
import { setupDailyNewsCron } from './cron/dailyNews.js';

const isLocal = process.env.NODE_ENV !== 'production';

setupHandlers(bot);
setupDailyNewsCron();

if (isLocal) {
  // 🔥 Локальный режим — polling
  bot.start().then(() => console.log('🤖 Bot started in POLLING mode (local)'));
} else {
  // 🔥 Продакшен — webhook
  const app = express();
  app.use(express.json());

  app.post('/webhook', webhookCallback(bot, 'express'));

  app.get('/health', (_, res) => res.send('OK'));

  const PORT = Number(process.env.PORT) || 80;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Webhook server running on port ${PORT}`);
  });
}

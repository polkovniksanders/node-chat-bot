import express from 'express';
import { bot } from './botInstance';
import { webhookCallback } from 'grammy';
import { setupHandlers } from './bot/handlers';

const app = express();

// Telegram шлёт JSON → Express должен уметь его читать
app.use(express.json());

// Настраиваем обработчики бота
setupHandlers(bot);

// Путь webhook — можешь изменить, если хочешь
const WEBHOOK_PATH = '/webhook';

// Обработчик Telegram‑обновлений
app.post(WEBHOOK_PATH, webhookCallback(bot, 'express'));

// Health‑endpoint для Timeweb
app.get('/health', (_, res) => {
  res.status(200).send('OK');
});

// Корневой endpoint
app.get('/', (_, res) => {
  res.send('Telegram AI Bot is running via webhook');
});

// Порт и адрес для Timeweb Cloud

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`📨 Webhook endpoint: https://<your-domain>${WEBHOOK_PATH}`);
});

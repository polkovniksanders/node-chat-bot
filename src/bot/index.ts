import { Bot } from 'grammy';
import { setupHandlers } from './handlers';

export function createBot() {
  const bot = new Bot(process.env.TELEGRAM_TOKEN!);
  setupHandlers(bot);
  return bot;
}

import 'dotenv/config';
import { Bot } from 'grammy';

export const bot = new Bot(process.env.TELEGRAM_TOKEN!);

export let BOT_USERNAME = '';
export let BOT_ID = 0;

export async function initBotInfo(): Promise<void> {
  const me = await bot.api.getMe();
  BOT_USERNAME = me.username!;
  BOT_ID = me.id;
}

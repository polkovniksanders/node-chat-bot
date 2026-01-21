import { Context, Bot } from 'grammy';
import { generateReply } from '../ai/client';

export function setupHandlers(bot: Bot) {
  bot.on('message:text', async (ctx: Context) => {
    const userId = ctx.from!.id;
    const userMessage = ctx.message?.text ?? '';

    const reply = await generateReply(userId, userMessage);
    await ctx.reply(reply);
  });
}

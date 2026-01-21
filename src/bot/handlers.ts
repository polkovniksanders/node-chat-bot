import { Context, Bot } from 'grammy';
import { generateReply } from '../ai/client';

export function setupHandlers(bot: Bot) {
  bot.on('message:text', async (ctx: Context) => {
    const userId = ctx.from!.id;
    const userMessage = ctx.message?.text ?? '';
    const reply = await generateReply(userId, userMessage);
    console.log('userMessage', userMessage);
    console.log('reply', reply);
    await ctx.reply(reply);
  });
}

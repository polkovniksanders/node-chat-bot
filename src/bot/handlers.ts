import { bot } from '@/botInstance.js';
import { generateReply } from '@/ai/client.js';

export function setupHandlers(botInstance: typeof bot) {
  botInstance.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    console.log('text', text);

    const reply = await generateReply(userId, text);

    await ctx.reply(reply);
  });
}

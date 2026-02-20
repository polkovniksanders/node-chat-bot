import { bot } from '@/botInstance.js';
import { generateReply } from '@/ai/generateReply.js';
import { getDailyEvents } from '@/events/events.js';

export function setupHandlers(botInstance: typeof bot) {
  botInstance.command('events', async (ctx) => {
    const channelId = process.env.EVENTS_CHANNEL_ID;
    if (!channelId) {
      await ctx.reply('❌ EVENTS_CHANNEL_ID не задан в .env');
      return;
    }

    await ctx.reply('⏳ Генерирую дайджест событий...');

    try {
      const events = await getDailyEvents();
      await bot.api.sendMessage(channelId, events.text, { parse_mode: 'HTML' });
      await ctx.reply(`✅ Дайджест отправлен в ${channelId}`);
    } catch (err) {
      await ctx.reply(`❌ Ошибка: ${err instanceof Error ? err.message : err}`);
    }
  });

  botInstance.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    const reply = await generateReply(userId, text);

    await ctx.reply(reply);
  });
}

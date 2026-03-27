import { bot } from '@/botInstance.js';
import { getRandomUser } from '@/config/users.js';
import { loadUserMemory } from '@/context/userMemory.js';
import { buildDailyDialoguePrompt } from '@/config/prompts.js';
import { gptunnelChat } from '@/ai/gptunnel.js';

const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID ?? '0', 10);

function isAdmin(userId: number): boolean {
  return ADMIN_USER_ID > 0 && userId === ADMIN_USER_ID;
}

export function setupSayHandler(): void {
  bot.command('say', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) return;

    const channelId = process.env.EVENTS_CHANNEL_ID;
    if (!channelId) {
      await ctx.reply('❌ EVENTS_CHANNEL_ID не задан в .env');
      return;
    }

    const user = getRandomUser();
    if (!user) {
      await ctx.reply('❌ Нет зарегистрированных пользователей.');
      return;
    }

    try {
      const memories = await loadUserMemory(user.id);
      const prompt = buildDailyDialoguePrompt(user, memories);
      const msg = await gptunnelChat([{ role: 'user', content: prompt }]);

      const mention = user.username ? `@${user.username}` : user.firstName;
      await bot.api.sendMessage(channelId, `${mention} ${msg.trim()}`);

      await ctx.reply(`✅ Отправлено для ${user.firstName}`);
    } catch (err) {
      await ctx.reply(`❌ Ошибка: ${err instanceof Error ? err.message : err}`);
    }
  });
}

import { bot } from '@/botInstance.js';
import { getRandomUser, findUserById, REGISTERED_USERS } from '@/config/users.js';
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

    // Парсим аргумент: /say @username или /say 123456789
    const arg = ctx.match.trim();
    let user;
    if (arg) {
      const usernameMatch = arg.match(/^@?(\w+)$/);
      const numericId = parseInt(arg, 10);
      if (!isNaN(numericId)) {
        user = findUserById(numericId);
      } else if (usernameMatch) {
        const uname = usernameMatch[1].toLowerCase();
        user = REGISTERED_USERS.find((u) => u.username?.toLowerCase() === uname);
      }
      if (!user) {
        await ctx.reply(`❌ Пользователь «${arg}» не найден.\n\nЗарегистрированные пользователи:\n` +
          REGISTERED_USERS.map((u) => `• ${u.firstName} — @${u.username ?? '—'} (${u.id})`).join('\n'));
        return;
      }
    } else {
      user = getRandomUser();
    }

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

import { CommandContext, Context } from 'grammy';
import { bot } from '@/botInstance.js';
import { isEnabled, setEnabled, getStatus, type ModuleName } from '@/modules/moduleConfig.js';
import { MODULES, findModule, getDefaultChatId } from '@/modules/moduleRegistry.js';
import { logger } from '@/utils/logger.js';

// Support both ADMIN_USER_IDS (plural, comma-separated) and legacy ADMIN_USER_ID (singular)
function buildAdminSet(): Set<number> {
  const ids = new Set<number>();
  const plural = process.env.ADMIN_USER_IDS ?? '';
  const singular = process.env.ADMIN_USER_ID ?? '';
  const raw = [plural, singular].join(',');
  for (const part of raw.split(',')) {
    const n = parseInt(part.trim(), 10);
    if (!isNaN(n) && n > 0) ids.add(n);
  }
  return ids;
}

const ADMIN_IDS = buildAdminSet();

if (ADMIN_IDS.size === 0) {
  logger.warn('ADMIN_USER_IDS не задан — управление модулями недоступно');
}

function isAdmin(userId: number): boolean {
  return ADMIN_IDS.has(userId);
}

/** Resolve a chatId argument: numeric string or @username → numeric string */
async function resolveChatId(arg: string): Promise<string | null> {
  if (/^-?\d+$/.test(arg)) return arg;
  if (arg.startsWith('@')) {
    try {
      const chat = await bot.api.getChat(arg);
      return String(chat.id);
    } catch {
      return null;
    }
  }
  return null;
}

function formatStatus(chatId: string): string {
  const status = getStatus(chatId);
  const lines = MODULES.map((def) => {
    const s = status[def.name];
    const icon = s.enabled ? '✅' : '❌';
    const suffix = s.isDefault ? ' <i>(дефолт)</i>' : '';
    return `${icon} <code>${def.name}</code>${suffix}`;
  });
  return `📋 <b>Статус модулей для чата</b> <code>${chatId}</code>:\n\n${lines.join('\n')}`;
}

async function handleToggle(
  ctx: CommandContext<Context>,
  targetEnabled: boolean,
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) return; // silent ignore for non-admins

  const parts = ctx.match.trim().split(/\s+/);
  const moduleName = parts[0];
  const chatIdArg = parts[1];

  if (!moduleName) {
    await ctx.reply('❌ Укажи имя модуля.\nПример: /module_disable emoji-reactions\nСписок: /module_list');
    return;
  }

  const def = findModule(moduleName);
  if (!def) {
    await ctx.reply(
      `❌ Модуль <code>${moduleName}</code> не найден.\nПосмотри список: /module_list`,
      { parse_mode: 'HTML' },
    );
    return;
  }

  let resolvedChatId: string;

  if (def.class === 'cron') {
    const defaultId = getDefaultChatId(def);
    if (!defaultId) {
      await ctx.reply(`❌ Для модуля <code>${def.name}</code> не задан выходной канал в .env`, {
        parse_mode: 'HTML',
      });
      return;
    }
    if (chatIdArg) {
      const resolved = await resolveChatId(chatIdArg);
      if (!resolved || resolved !== defaultId) {
        await ctx.reply(
          `❌ Модуль <code>${def.name}</code> работает только с каналом <code>${defaultId}</code>.\n` +
            `Используй команду без аргумента chatId.`,
          { parse_mode: 'HTML' },
        );
        return;
      }
    }
    resolvedChatId = defaultId;
  } else {
    if (chatIdArg) {
      const resolved = await resolveChatId(chatIdArg);
      if (!resolved) {
        await ctx.reply(`❌ Не удалось определить chatId из аргумента: <code>${chatIdArg}</code>`, {
          parse_mode: 'HTML',
        });
        return;
      }
      resolvedChatId = resolved;
    } else {
      resolvedChatId = String(ctx.chat.id);
    }
  }

  await setEnabled(resolvedChatId, def.name as ModuleName, targetEnabled);

  const action = targetEnabled ? 'включён' : 'выключен';
  const icon = targetEnabled ? '✅' : '🔴';
  await ctx.reply(
    `${icon} Модуль <code>${def.name}</code> ${action} для чата <code>${resolvedChatId}</code>`,
    { parse_mode: 'HTML' },
  );

  logger.info('module toggled', {
    module: def.name,
    chatId: resolvedChatId,
    enabled: targetEnabled,
    by: userId,
  });
}

export function setupModuleAdminHandler(): void {
  // /module_enable <module> [chatId]
  bot.command('module_enable', async (ctx) => {
    await handleToggle(ctx, true);
  });

  // /module_disable <module> [chatId]
  bot.command('module_disable', async (ctx) => {
    await handleToggle(ctx, false);
  });

  // /module_status [chatId]
  bot.command('module_status', async (ctx) => {
    const userId = ctx.from?.id;
    logger.info('module_status called', { userId, isAdmin: userId ? isAdmin(userId) : false, adminIds: [...ADMIN_IDS] });
    if (!userId || !isAdmin(userId)) return;

    const arg = ctx.match.trim();
    let targetChatId: string;

    if (arg) {
      const resolved = await resolveChatId(arg);
      if (!resolved) {
        await ctx.reply(`❌ Не удалось определить chatId из аргумента: <code>${arg}</code>`, {
          parse_mode: 'HTML',
        });
        return;
      }
      targetChatId = resolved;
    } else {
      targetChatId = String(ctx.chat.id);
    }

    await ctx.reply(formatStatus(targetChatId), { parse_mode: 'HTML' });
  });

  // /module_list
  bot.command('module_list', async (ctx) => {
    const userId = ctx.from?.id;
    logger.info('module_list called', { userId, isAdmin: userId ? isAdmin(userId) : false, adminIds: [...ADMIN_IDS] });
    if (!userId || !isAdmin(userId)) return;

    const lines = MODULES.map((def) => {
      const classLabel = def.class === 'cron' ? '[cron]' : def.class === 'admin' ? '[admin]' : '[input]';
      return `• <code>${def.name}</code> ${classLabel}\n  ${def.description}`;
    });

    await ctx.reply(`📦 <b>Доступные модули:</b>\n\n${lines.join('\n\n')}`, {
      parse_mode: 'HTML',
    });
  });
}

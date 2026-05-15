import { CommandContext, Context } from 'grammy';
import { bot } from '@/botInstance.js';
import {
  getStatus,
  getCronChatIds,
  enableCronModule,
  disableCronModule,
  setInputModule,
  normalizeChatId,
  type ModuleName,
} from '@/modules/moduleConfig.js';
import { MODULES, findModule } from '@/modules/moduleRegistry.js';
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
  logger.warn(
    '[admin] No admin IDs configured — module management unavailable. Set ADMIN_USER_IDS in .env',
  );
}

function isAdmin(userId: number): boolean {
  return ADMIN_IDS.has(userId);
}

function formatStatus(chatId: string): string {
  const status = getStatus(chatId);
  const cronLines: string[] = [];
  const inputLines: string[] = [];

  for (const def of MODULES) {
    const s = status[def.name];
    if (s.isCronModule) {
      const count = getCronChatIds(def.name).length;
      const isHere = s.enabled;
      const icon = isHere ? '🟢' : '⚪';
      cronLines.push(
        `${icon} <code>${def.name}</code> (${count} чатов${isHere ? ', включая этот' : ''})`,
      );
    } else {
      const icon = s.enabled ? '✅' : '❌';
      const suffix = s.isDefault ? ' <i>(дефолт)</i>' : '';
      inputLines.push(`${icon} <code>${def.name}</code>${suffix}`);
    }
  }

  return (
    `📋 <b>Статус модулей для чата</b> <code>${chatId}</code>:\n\n` +
    `<b>🕒 Cron-модули:</b>\n${cronLines.join('\n')}\n\n` +
    `<b>⚡ Input/Admin модули:</b>\n${inputLines.join('\n')}`
  );
}

function formatListAll(): string {
  const lines: string[] = [];
  for (const def of MODULES) {
    if (def.class === 'cron') {
      const chats = getCronChatIds(def.name);
      const chatList = chats.length > 0 ? chats.join(', ') : '—';
      lines.push(`🟢 <code>${def.name}</code> [cron]\n  Чаты: ${chatList}\n  ${def.description}`);
    } else {
      const classLabel = def.class === 'admin' ? '[admin]' : '[input]';
      lines.push(`• <code>${def.name}</code> ${classLabel}\n  ${def.description}`);
    }
  }
  return `📦 <b>Все модули (глобальный вид):</b>\n\n${lines.join('\n\n')}`;
}

async function handleToggle(ctx: CommandContext<Context>, targetEnabled: boolean): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) return; // silent ignore for non-admins

  const parts = ctx.match.trim().split(/\s+/);
  const moduleName = parts[0];

  if (!moduleName) {
    await ctx.reply(
      '❌ Укажи имя модуля.\nПример: /module_enable daily-cycle\nСписок: /module_list',
    );
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

  const rawChatId = String(ctx.chat!.id);

  if (def.class === 'cron') {
    // Normalize chatId to numeric before storing
    const normalizedId = await normalizeChatId(rawChatId);
    if (targetEnabled) {
      await enableCronModule(normalizedId, def.name);
      await ctx.reply(
        `✅ Модуль <code>${def.name}</code> включён для этого чата (<code>${normalizedId}</code>)`,
        { parse_mode: 'HTML' },
      );
    } else {
      await disableCronModule(normalizedId, def.name);
      await ctx.reply(`🔴 Модуль <code>${def.name}</code> выключен для этого чата`, {
        parse_mode: 'HTML',
      });
    }
  } else {
    await setInputModule(rawChatId, def.name, targetEnabled);
    const action = targetEnabled ? 'включён ✅' : 'выключен 🔴';
    await ctx.reply(`Модуль <code>${def.name}</code> ${action} для этого чата`, {
      parse_mode: 'HTML',
    });
  }

  logger.info('module toggled', {
    module: def.name,
    chatId: rawChatId,
    enabled: targetEnabled,
    by: userId,
  });
}

export function setupModuleAdminHandler(): void {
  // /module_enable <module>
  bot.command('module_enable', async (ctx) => {
    await handleToggle(ctx, true);
  });

  // /module_disable <module>
  bot.command('module_disable', async (ctx) => {
    await handleToggle(ctx, false);
  });

  // /module_status — статус для текущего чата
  bot.command('module_status', async (ctx) => {
    const userId = ctx.from?.id;
    logger.info('module_status called', { userId, isAdmin: userId ? isAdmin(userId) : false });
    if (!userId || !isAdmin(userId)) return;

    const targetChatId = String(ctx.chat.id);
    await ctx.reply(formatStatus(targetChatId), { parse_mode: 'HTML' });
  });

  // /module_list [all]
  bot.command('module_list', async (ctx) => {
    const userId = ctx.from?.id;
    logger.info('module_list called', { userId, isAdmin: userId ? isAdmin(userId) : false });
    if (!userId || !isAdmin(userId)) return;

    const arg = ctx.match.trim().toLowerCase();
    if (arg === 'all') {
      await ctx.reply(formatListAll(), { parse_mode: 'HTML' });
      return;
    }

    // Default: show status for current chat
    const chatId = String(ctx.chat.id);
    const status = getStatus(chatId);
    const lines = MODULES.map((def) => {
      if (def.class === 'cron') {
        const isHere = status[def.name].enabled;
        return `${isHere ? '🟢' : '⚪'} <code>${def.name}</code> [cron] — ${isHere ? 'активен здесь' : 'не активен'}`;
      }
      const classLabel = def.class === 'admin' ? '[admin]' : '[input]';
      const enabled = status[def.name].enabled;
      return `${enabled ? '✅' : '❌'} <code>${def.name}</code> ${classLabel}`;
    });

    await ctx.reply(
      `📦 <b>Модули для чата <code>${chatId}</code>:</b>\n\n${lines.join('\n')}\n\n` +
        `Используй <code>/module_list all</code> для глобального вида`,
      { parse_mode: 'HTML' },
    );
  });
}

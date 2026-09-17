import { InlineKeyboard } from 'grammy';
import { bot } from '@/botInstance.js';
import {
  disableCronModule,
  enableCronModule,
  getStatus,
  setEnabled,
} from '@/modules/moduleConfig.js';
import { MODULES, findModule, type ModuleName } from '@/modules/moduleRegistry.js';
import { registerChat, getKnownChats, formatChatLabel } from '@/modules/knownChats.js';
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

interface ChannelOption {
  chatId: string;
  label: string;
}

async function botIsChatAdmin(chatId: string): Promise<boolean> {
  try {
    const member = await bot.api.getChatMember(chatId, bot.botInfo.id);
    return member.status === 'administrator' || member.status === 'creator';
  } catch {
    return false;
  }
}

/** Группы и каналы из реестра, в которых бот всё ещё администратор. */
async function buildChannelList(): Promise<ChannelOption[]> {
  const channels: ChannelOption[] = [];
  for (const chat of getKnownChats()) {
    if (chat.type === 'private' || !(await botIsChatAdmin(chat.id))) continue;
    channels.push({ chatId: chat.id, label: formatChatLabel(chat) });
  }
  return channels;
}

function buildChannelKeyboard(channels: ChannelOption[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const ch of channels) {
    kb.row().text(`${ch.label}`, `mod:list:${ch.chatId}`);
  }
  return kb;
}

function buildModuleKeyboard(chatId: string): InlineKeyboard {
  const status = getStatus(chatId);
  const kb = new InlineKeyboard();
  for (const def of MODULES) {
    const s = status[def.name];
    const icon = s.enabled ? '✅' : '⛔';
    kb.row().text(`${icon} ${def.name}`, `mod:toggle:${chatId}:${def.name}`);
  }
  kb.row().text('⬅️ Выбрать другой чат', 'mod:channels');
  return kb;
}

function moduleListMessage(chatId: string): string {
  const chat = getKnownChats().find((c) => c.id === chatId);
  const label = chat ? formatChatLabel(chat) : chatId;
  return `📋 <b>Управление модулями</b>\nЧат: <code>${label}</code>\n\nНажми на модуль, чтобы включить/выключить:`;
}

export function setupModuleAdminHandler(): void {
  // Регистрируем чаты при любых входящих апдейтах
  bot.on('msg', async (ctx, next) => {
    if (ctx.chat) {
      registerChat({
        id: ctx.chat.id,
        type: ctx.chat.type,
        title: ctx.chat.title,
        username: ctx.chat.username,
      });
    }
    await next();
  });

  // /modules — показать выбор чата
  bot.command('modules', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) return; // silent ignore for non-admins

    // Регистрируем текущий чат
    if (ctx.chat) {
      registerChat({
        id: ctx.chat.id,
        type: ctx.chat.type,
        title: ctx.chat.title,
        username: ctx.chat.username,
      });
    }

    const channels = await buildChannelList();
    logger.info('modules command', { userId, channels: channels.map((c) => c.chatId) });

    if (channels.length === 0) {
      await ctx.reply('📭 Нет групп или каналов, где бот является администратором.');
      return;
    }

    await ctx.reply('📡 <b>Выбери чат для управления модулями:</b>', {
      parse_mode: 'HTML',
      reply_markup: buildChannelKeyboard(channels),
    });
  });

  // Выбор чата → список модулей с toggle-кнопками
  bot.callbackQuery(/^mod:list:(.+)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.answerCallbackQuery('⛔ Доступ только у администратора');
      return;
    }
    const chatId = ctx.match[1];
    if (!(await botIsChatAdmin(chatId))) {
      await ctx.answerCallbackQuery('⛔ Бот не является администратором этого чата');
      return;
    }
    await ctx.editMessageText(moduleListMessage(chatId), {
      parse_mode: 'HTML',
      reply_markup: buildModuleKeyboard(chatId),
    });
    await ctx.answerCallbackQuery();
  });

  // Переключение модуля
  bot.callbackQuery(/^mod:toggle:(.+):(.+)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.answerCallbackQuery('⛔ Доступ только у администратора');
      return;
    }
    const chatId = ctx.match[1];
    const name = ctx.match[2] as ModuleName;

    if (!(await botIsChatAdmin(chatId))) {
      await ctx.answerCallbackQuery('⛔ Бот не является администратором этого чата');
      return;
    }

    const def = findModule(name);
    if (!def) {
      await ctx.answerCallbackQuery('❌ Модуль не найден');
      return;
    }

    const wasEnabled = getStatus(chatId)[name].enabled;
    if (def.class === 'cron') {
      await (wasEnabled ? disableCronModule : enableCronModule)(chatId, name);
    } else {
      await setEnabled(chatId, name, !wasEnabled);
    }

    logger.info('module toggled via button', { module: name, chatId, enabled: !wasEnabled, by: userId });
    await ctx.answerCallbackQuery(wasEnabled ? '⛔ Выключен' : '✅ Включён');

    await ctx.editMessageText(moduleListMessage(chatId), {
      parse_mode: 'HTML',
      reply_markup: buildModuleKeyboard(chatId),
    });
  });

  // Назад к выбору чата
  bot.callbackQuery('mod:channels', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.answerCallbackQuery('⛔ Доступ только у администратора');
      return;
    }
    const channels = await buildChannelList();
    await ctx.editMessageText('📡 <b>Выбери чат для управления модулями:</b>', {
      parse_mode: 'HTML',
      reply_markup: buildChannelKeyboard(channels),
    });
    await ctx.answerCallbackQuery();
  });
}

import { InlineKeyboard } from 'grammy';
import { bot } from '@/botInstance.js';
import { isEnabled, setEnabled, getStatus } from '@/modules/moduleConfig.js';
import { MODULES, findModule, type ModuleName } from '@/modules/moduleRegistry.js';
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

/** Каналы из .env (в которых бот администратор) + текущий чат, без дублей */
function buildChannelList(currentChatId: number): ChannelOption[] {
  const seen = new Set<string>();
  const channels: ChannelOption[] = [];
  const add = (chatId: string | undefined, label: string) => {
    if (!chatId || seen.has(chatId)) return;
    seen.add(chatId);
    channels.push({ chatId, label });
  };
  add(String(currentChatId), 'Текущий чат');
  add(process.env.CHANNEL_ID, 'Основной канал');
  add(process.env.EVENTS_CHANNEL_ID, 'Канал событий');
  add(process.env.CHANNEL_CHAT_ID, 'Привязанный чат');
  return channels;
}

function buildChannelKeyboard(channels: ChannelOption[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const ch of channels) {
    kb.row().text(`${ch.label} · ${ch.chatId}`, `mod:list:${ch.chatId}`);
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
  kb.row().text('⬅️ Выбрать другой канал', 'mod:channels');
  return kb;
}

function moduleListMessage(chatId: string): string {
  return `📋 <b>Управление модулями</b>\nКанал: <code>${chatId}</code>\n\nНажми на модуль, чтобы включить/выключить:`;
}

export function setupModuleAdminHandler(): void {
  // /modules — показать выбор канала
  bot.command('modules', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) return; // silent ignore for non-admins

    const channels = buildChannelList(ctx.chat.id);
    logger.info('modules command', { userId, channels: channels.map((c) => c.chatId) });

    await ctx.reply('📡 <b>Выбери канал для управления модулями:</b>', {
      parse_mode: 'HTML',
      reply_markup: buildChannelKeyboard(channels),
    });
  });

  // Выбор канала → список модулей с toggle-кнопками
  bot.callbackQuery(/^mod:list:(.+)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.answerCallbackQuery('⛔ Доступ только у администратора');
      return;
    }
    const chatId = ctx.match[1];
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

    const def = findModule(name);
    if (!def) {
      await ctx.answerCallbackQuery('❌ Модуль не найден');
      return;
    }

    const wasEnabled = isEnabled(chatId, name);
    await setEnabled(chatId, name, !wasEnabled);

    logger.info('module toggled via button', { module: name, chatId, enabled: !wasEnabled, by: userId });
    await ctx.answerCallbackQuery(wasEnabled ? '⛔ Выключен' : '✅ Включён');

    await ctx.editMessageText(moduleListMessage(chatId), {
      parse_mode: 'HTML',
      reply_markup: buildModuleKeyboard(chatId),
    });
  });

  // Назад к выбору канала
  bot.callbackQuery('mod:channels', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.answerCallbackQuery('⛔ Доступ только у администратора');
      return;
    }
    const currentChatId = ctx.callbackQuery.message?.chat.id ?? 0;
    const channels = buildChannelList(currentChatId);
    await ctx.editMessageText('📡 <b>Выбери канал для управления модулями:</b>', {
      parse_mode: 'HTML',
      reply_markup: buildChannelKeyboard(channels),
    });
    await ctx.answerCallbackQuery();
  });
}
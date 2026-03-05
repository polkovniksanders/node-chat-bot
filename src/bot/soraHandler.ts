import { InlineKeyboard } from 'grammy';
import { bot } from '@/botInstance.js';
import {
  addToQueue,
  isAlreadyPosted,
  isAlreadyInQueue,
  getQueueLength,
} from '@/content/soraQueue.js';

const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID ?? '0', 10);

interface PendingItem {
  fileId: string;
  fileUniqueId: string;
  description: string;
}

// Temp in-memory storage for pending confirmations (cleared after 5 min)
const pending = new Map<string, PendingItem>();

function isAdmin(userId: number): boolean {
  return ADMIN_USER_ID > 0 && userId === ADMIN_USER_ID;
}

export function setupSoraHandler(): void {
  // Secret command: send video with caption "/addsora описание"
  bot.on('message:video', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) return;

    const caption = ctx.message.caption?.trim() ?? '';
    if (!caption.toLowerCase().startsWith('/addsora')) return;

    const description = caption.replace(/^\/addsora\s*/i, '').trim();
    if (!description) {
      await ctx.reply(
        '❌ Укажи описание после /addsora\nПример: /addsora степка дерётся с твитти за тунец',
      );
      return;
    }

    const { file_id: fileId, file_unique_id: fileUniqueId } = ctx.message.video;

    if (await isAlreadyPosted(fileUniqueId)) {
      await ctx.reply('⚠️ Это видео уже было опубликовано ранее.');
      return;
    }

    if (await isAlreadyInQueue(fileUniqueId)) {
      await ctx.reply('⚠️ Это видео уже есть в очереди.');
      return;
    }

    const tempId = `${Date.now()}_${userId}`;
    pending.set(tempId, { fileId, fileUniqueId, description });
    setTimeout(() => pending.delete(tempId), 5 * 60 * 1000);

    const queueLen = await getQueueLength();
    const keyboard = new InlineKeyboard()
      .text('✅ Добавить в очередь', `sora:confirm:${tempId}`)
      .text('❌ Отмена', `sora:cancel:${tempId}`);

    await ctx.reply(
      `📹 <b>Видео получено!</b>\n\n` +
        `📝 Описание: <i>${description}</i>\n` +
        `📋 Видео в очереди сейчас: ${queueLen}\n\n` +
        `Добавить в очередь?`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  });

  bot.callbackQuery(/^sora:confirm:(.+)$/, async (ctx) => {
    const tempId = ctx.match[1];
    const item = pending.get(tempId);

    if (!item) {
      await ctx.answerCallbackQuery('⏰ Сессия истекла, отправь видео снова');
      await ctx.editMessageText('❌ Сессия истекла.');
      return;
    }

    pending.delete(tempId);
    const position = await addToQueue({
      id: tempId,
      fileId: item.fileId,
      fileUniqueId: item.fileUniqueId,
      description: item.description,
    });

    await ctx.answerCallbackQuery('✅ Добавлено!');
    await ctx.editMessageText(
      `✅ <b>Добавлено в очередь!</b>\n\n` +
        `📝 <i>${item.description}</i>\n` +
        `📋 Позиция: ${position} из ${position}`,
      { parse_mode: 'HTML' },
    );
  });

  bot.callbackQuery(/^sora:cancel:(.+)$/, async (ctx) => {
    const tempId = ctx.match[1];
    pending.delete(tempId);
    await ctx.answerCallbackQuery('Отменено');
    await ctx.editMessageText('❌ Отменено.');
  });
}

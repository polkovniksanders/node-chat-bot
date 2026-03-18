import { Bot, Context } from 'grammy';
import { transcribeAudio } from '@/ai/transcribe.js';

async function downloadVoice(ctx: Context, fileId: string): Promise<Buffer> {
  const file = await ctx.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download voice: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function handleTranscription(ctx: Context, fileId: string) {
  const status = await ctx.reply('🎙 Расшифровываю...', {
    reply_parameters: { message_id: ctx.message!.message_id },
  });

  try {
    const buffer = await downloadVoice(ctx, fileId);
    const text = await transcribeAudio(buffer);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      status.message_id,
      text ? `🗣 <b>Расшифровка:</b>\n${text}` : '🤷 Не удалось распознать речь',
      { parse_mode: 'HTML' },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      status.message_id,
      `❌ Ошибка расшифровки: ${msg.slice(0, 200)}`,
    );
  }
}

export function setupVoiceHandler(botInstance: Bot) {
  // Личка: войс расшифровывается сразу (пользователь сам отправил боту)
  botInstance.on('message:voice', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    await handleTranscription(ctx, ctx.message.voice.file_id);
  });

  // Группа: ответить на войс с упоминанием @бота → расшифровать
  botInstance.on('message:text', async (ctx) => {
    if (ctx.chat.type === 'private') return;

    const voice = ctx.message.reply_to_message?.voice;
    if (!voice) return;

    const botUsername = ctx.me.username;
    const isMentioned = ctx.message.entities?.some(
      (e) =>
        e.type === 'mention' &&
        ctx.message.text.substring(e.offset, e.offset + e.length) === `@${botUsername}`,
    );
    if (!isMentioned) return;

    await handleTranscription(ctx, voice.file_id);
  });
}

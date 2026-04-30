import { Context, InputFile } from 'grammy';
import { bot, BOT_USERNAME, BOT_ID } from '@/botInstance.js';
import { generateReply, maybeRememberFact, extractAndSaveFact } from '@/ai/generateReply.js';
import { getDailyEvents } from '@/events/events.js';
import { fetchWeather } from '@/weather/fetch-weather.js';
import { formatWeather } from '@/weather/formatter.js';
import { generateImage } from '@/generate/generate-image.js';
import { checkRateLimit, recordGeneration, formatRemaining } from '@/generate/rate-limiter.js';
import { setupSoraHandler } from '@/bot/soraHandler.js';
import { setupVoiceHandler } from '@/bot/voiceHandler.js';
import { setupSayHandler } from '@/bot/sayHandler.js';
import { setupWhisperHandler } from '@/bot/whisperHandler.js';
import { findUserById, RegisteredUser } from '@/config/users.js';
import { loadUserMemory } from '@/context/userMemory.js';
import { buildUserContextBlock, buildReplyContextBlock } from '@/config/prompts.js';
import { upsertUserProfile } from '@/context/userProfiles.js';
import { downloadVoice } from '@/bot/voiceUtils.js';
import { transcribeAudio } from '@/ai/transcribe.js';
import { logger } from '@/utils/logger.js';

import { DEFAULT_CITY } from '@/config/constants.js';
import { tryReact, shouldReactRandomly } from '@/bot/reactions.js';

async function sendWeather(ctx: Context, city: string) {
  await ctx.reply(`⏳ Получаю погоду для ${city}...`);
  try {
    const data = await fetchWeather(city);
    const message = formatWeather(data);
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(`❌ Не удалось получить погоду: ${err instanceof Error ? err.message : err}`);
  }
}

export function setupHandlers(botInstance: typeof bot) {
  setupSoraHandler();
  setupSayHandler();
  setupWhisperHandler(botInstance);
  setupVoiceHandler(botInstance);

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

  // /weather [город] — работает в личке и в группах
  botInstance.command('weather', async (ctx) => {
    const city = ctx.match.trim() || DEFAULT_CITY;
    await sendWeather(ctx, city);
  });

  // /generate <промпт> — генерация изображения, 1 раз в час на пользователя
  botInstance.command('generate', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const prompt = ctx.match.trim();
    if (!prompt) {
      await ctx.reply('📝 Укажи промпт после команды.\nПример: /generate sunset over mountains, digital art');
      return;
    }

    const { allowed, remainingMs } = checkRateLimit(userId);
    if (!allowed) {
      await ctx.reply(`⏳ Ты уже генерировал картинку. Следующая будет доступна через ${formatRemaining(remainingMs)}.`);
      return;
    }

    const statusMsg = await ctx.reply('🎨 Генерирую изображение...');
    try {
      const imageBuffer = await generateImage(prompt);
      recordGeneration(userId);
      await ctx.replyWithPhoto(new InputFile(imageBuffer, 'image.png'), {
        caption: `🖼 <b>${prompt}</b>`,
        parse_mode: 'HTML',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`❌ Не удалось сгенерировать изображение: ${msg.slice(0, 200)}`);
    } finally {
      await bot.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
    }
  });

  // Реакции на нетекстовые сообщения в группах и каналах (фото, видео, стикеры и т.д.)
  botInstance.on('msg', async (ctx) => {
    if (ctx.chat.type === 'private') return;
    if (ctx.msg.text) return; // текстовые обрабатывает msg:text

    if (shouldReactRandomly()) {
      tryReact(ctx, ctx.msg.message_id).catch(() => {});
    }
  });

  // Текстовые сообщения — личка, группы и каналы
  botInstance.on('msg:text', async (ctx) => {
    const messageText = ctx.msg.text.trim();

    // Игнорируем команды
    if (messageText.startsWith('/')) return;

    if (ctx.chat.type === 'private') {
      // "погода [город]" — альтернатива /weather для личных сообщений
      const weatherMatch = messageText.match(/^погода\s*(.*)/i);
      if (weatherMatch) {
        await sendWeather(ctx, weatherMatch[1].trim() || DEFAULT_CITY);
        return;
      }

      // Обычный чат с ИИ (private chat всегда имеет from)
      const fromId = ctx.from!.id;
      const reply = await generateReply(ctx.chat.id, fromId, messageText);
      try {
        await ctx.reply(reply, { parse_mode: 'HTML' });
      } catch {
        await ctx.reply(reply.replace(/<[^>]*>/g, ''));
      }
      const remembered = await maybeRememberFact(fromId, messageText);
      if (remembered) await ctx.reply('🐾 Запомнил!');
      extractAndSaveFact(fromId, messageText).catch(() => {});
      return;
    }

    // Группы и каналы: reply на бота, reply на пост канала, или @упоминание
    const isChannelPost = ctx.channelPost !== undefined;
    const userId = ctx.from?.id;

    if (!isChannelPost && !userId) return;

    const replyFrom = ctx.msg.reply_to_message?.from;
    const replySenderChat = (ctx.msg.reply_to_message as any)?.sender_chat;
    const channelUsername = process.env.CHANNEL_ID?.replace('@', '');

    // Триггер 1: reply на сообщение бота
    const isReplyToBot =
      replyFrom?.id === BOT_ID ||
      (BOT_USERNAME && replyFrom?.username === BOT_USERNAME);

    // Триггер 2: reply на пост из связанного канала
    const channelNumericId = process.env.CHANNEL_CHAT_ID ? Number(process.env.CHANNEL_CHAT_ID) : null;
    const isReplyToChannel =
      (channelUsername && replySenderChat?.username === channelUsername) ||
      (BOT_USERNAME && replySenderChat?.username === BOT_USERNAME) ||
      (channelNumericId && replySenderChat?.id === channelNumericId);

    // Триггер 3: @упоминание бота через entities (точный метод)
    const isMentioned =
      BOT_USERNAME &&
      (ctx.msg.entities?.some(
        (e) =>
          e.type === 'mention' &&
          messageText.slice(e.offset, e.offset + e.length) === `@${BOT_USERNAME}`,
      ) ?? false);

    logger.debug('msg received', {
      from: ctx.from?.username,
      chat: ctx.chat.id,
      isChannelPost,
      isReplyToBot,
      isReplyToChannel,
      isMentioned,
    });

    // Случайная реакция на любое сообщение в группе (15%)
    if (!isChannelPost && shouldReactRandomly()) {
      tryReact(ctx, ctx.msg.message_id, messageText).catch(() => {});
    }

    // Посты канала — отвечаем только на @упоминание
    if (isChannelPost && !isMentioned) return;
    // Группы — один из трёх триггеров
    if (!isChannelPost && !isReplyToBot && !isReplyToChannel && !isMentioned) return;

    const chatId = ctx.chat.id;

    logger.info('responding to trigger', {
      trigger: isReplyToBot ? 'reply-to-bot' : isReplyToChannel ? 'reply-to-channel' : 'mention',
      chatId,
      from: ctx.from?.username,
      isChannelPost,
    });

    // Убираем @упоминание бота из текста перед отправкой в AI
    let userText = BOT_USERNAME
      ? messageText.replace(new RegExp(`@${BOT_USERNAME}`, 'gi'), '').trim()
      : messageText;

    // Если после очистки текст пустой — пропускаем
    if (!userText) return;

    // Если ответ на голосовое → расшифровать + ответить
    const repliedVoice = ctx.msg.reply_to_message?.voice;
    if (repliedVoice) {
      try {
        const buffer = await downloadVoice(ctx, repliedVoice.file_id);
        const transcription = await transcribeAudio(buffer);
        if (transcription) {
          userText = transcription;
          await ctx.reply(`🗣 <b>Расшифровка:</b>\n${transcription}`, {
            parse_mode: 'HTML',
            reply_parameters: { message_id: ctx.msg.reply_to_message!.message_id },
          });
        }
      } catch (err) {
        logger.error('Voice transcription error', { err: String(err) });
      }
    }

    let extraSystemContext = '';

    // Для группы — добавляем контекст пользователя и replied-текст
    if (!isChannelPost && userId) {
      const repliedText = ctx.msg.reply_to_message?.text ?? ctx.msg.reply_to_message?.caption;
      if (repliedText) {
        extraSystemContext += buildReplyContextBlock(repliedText);
      }

      const user = findUserById(userId);
      const memories = await loadUserMemory(userId);

      if (user) {
        extraSystemContext += buildUserContextBlock(user, memories);
      } else {
        const profile = await upsertUserProfile(userId, ctx.from!.first_name, ctx.from!.username);
        const dynamicUser: RegisteredUser = {
          id: profile.userId,
          firstName: profile.firstName,
          username: profile.username,
          description: `Незнакомый пользователь, общается в группе.`,
        };
        extraSystemContext += buildUserContextBlock(dynamicUser, memories);
      }
    }

    const effectiveUserId = userId ?? 0;
    const reply = await generateReply(chatId, effectiveUserId, userText, { extraSystemContext, isGroupReply: true });

    // Реакция на сообщение, которому отвечаем (всегда при ответе в группе)
    if (!isChannelPost) {
      tryReact(ctx, ctx.msg.message_id, userText).catch(() => {});
    }

    try {
      await ctx.reply(reply, {
        parse_mode: 'HTML',
        reply_parameters: { message_id: ctx.msg.message_id },
      });
    } catch {
      await ctx.reply(reply.replace(/<[^>]*>/g, ''), {
        reply_parameters: { message_id: ctx.msg.message_id },
      });
    }

    if (!isChannelPost && userId) {
      const remembered = await maybeRememberFact(userId, userText);
      if (remembered) {
        await ctx.reply('🐾 Запомнил!', {
          reply_parameters: { message_id: ctx.msg.message_id },
        });
      }
      extractAndSaveFact(userId, userText).catch(() => {});
    }
  });
}

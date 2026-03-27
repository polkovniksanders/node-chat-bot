import { Context, InputFile } from 'grammy';
import { bot } from '@/botInstance.js';
import { generateReply, maybeRememberFact } from '@/ai/generateReply.js';
import { getDailyEvents } from '@/events/events.js';
import { fetchWeather } from '@/weather/fetch-weather.js';
import { formatWeather } from '@/weather/formatter.js';
import { generateImage } from '@/generate/generate-image.js';
import { checkRateLimit, recordGeneration, formatRemaining } from '@/generate/rate-limiter.js';
import { setupSoraHandler } from '@/bot/soraHandler.js';
import { setupVoiceHandler } from '@/bot/voiceHandler.js';
import { findUserById } from '@/config/users.js';
import { loadUserMemory } from '@/context/userMemory.js';
import { buildUserContextBlock } from '@/config/prompts.js';
import { downloadVoice } from '@/bot/voiceUtils.js';
import { transcribeAudio } from '@/ai/transcribe.js';

import { DEFAULT_CITY } from '@/config/constants.js';

async function sendWeather(ctx: Context, city: string) {
  await ctx.reply(`⏳ Получаю погоду для ${city}...`);
  try {
    const data = await fetchWeather(city);
    const message = formatWeather(data);
    // Отвечаем в тот же чат откуда пришёл запрос
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(`❌ Не удалось получить погоду: ${err instanceof Error ? err.message : err}`);
  }
}

export function setupHandlers(botInstance: typeof bot) {
  setupSoraHandler();
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

  // Текстовые сообщения — только в личке
  botInstance.on('message:text', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const text = ctx.message.text.trim();

    // Игнорируем команды (начинаются с /) — их обрабатывают отдельные хэндлеры
    if (text.startsWith('/')) return;

    // "погода [город]" — альтернатива /weather для личных сообщений
    const weatherMatch = text.match(/^погода\s*(.*)/i);
    if (weatherMatch) {
      await sendWeather(ctx, weatherMatch[1].trim() || DEFAULT_CITY);
      return;
    }

    // Обычный чат с ИИ
    const reply = await generateReply(ctx.from.id, text);
    await ctx.reply(reply);
    await maybeRememberFact(ctx.from.id, text);
  });

  // Текстовые сообщения в группе — только если бот @упомянут
  botInstance.on('message:text', async (ctx) => {
    if (ctx.chat.type === 'private') return;

    const botUsername = ctx.me.username;
    const mentioned = ctx.message.entities?.some(
      (e) =>
        e.type === 'mention' &&
        ctx.message.text.slice(e.offset + 1, e.offset + e.length) === botUsername,
    );
    if (!mentioned) return;

    const userId = ctx.from?.id;
    if (!userId) return;

    let userText = ctx.message.text;

    // Если ответ на голосовое с @упоминанием → расшифровать + ответить
    const repliedVoice = ctx.message.reply_to_message?.voice;
    if (repliedVoice) {
      try {
        const buffer = await downloadVoice(ctx, repliedVoice.file_id);
        const transcription = await transcribeAudio(buffer);
        if (transcription) {
          userText = transcription;
          await ctx.reply(`🗣 <b>Расшифровка:</b>\n${transcription}`, {
            parse_mode: 'HTML',
            reply_parameters: { message_id: ctx.message.reply_to_message!.message_id },
          });
        }
      } catch (err) {
        console.error('Voice transcription error in group:', err);
      }
    }

    const user = findUserById(userId);
    const memories = user ? await loadUserMemory(userId) : [];
    const extraSystemContext = user ? buildUserContextBlock(user, memories) : undefined;

    const reply = await generateReply(userId, userText, { extraSystemContext });
    await ctx.reply(reply, {
      reply_parameters: { message_id: ctx.message.message_id },
    });

    await maybeRememberFact(userId, userText);
  });
}

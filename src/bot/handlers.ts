import { Context, InputFile } from 'grammy';
import { bot } from '@/botInstance.js';
import { generateReply } from '@/ai/generateReply.js';
import { getDailyEvents } from '@/events/events.js';
import { fetchWeather } from '@/weather/fetch-weather.js';
import { formatWeather } from '@/weather/formatter.js';
import { generateImage } from '@/generate/generate-image.js';
import { checkRateLimit, recordGeneration, formatRemaining } from '@/generate/rate-limiter.js';

const DEFAULT_CITY = 'Челябинск';

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
      await ctx.reply(`❌ Не удалось сгенерировать изображение: ${err instanceof Error ? err.message : err}`);
    } finally {
      await bot.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
    }
  });

  // Текстовые сообщения — только в личке
  botInstance.on('message:text', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const text = ctx.message.text.trim();

    // "погода [город]" — альтернатива /weather для личных сообщений
    const weatherMatch = text.match(/^погода\s*(.*)/i);
    if (weatherMatch) {
      await sendWeather(ctx, weatherMatch[1].trim() || DEFAULT_CITY);
      return;
    }

    // Обычный чат с ИИ
    const reply = await generateReply(ctx.from.id, text);
    await ctx.reply(reply);
  });
}

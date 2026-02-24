import { bot } from '@/botInstance.js';
import { generateReply } from '@/ai/generateReply.js';
import { getDailyEvents } from '@/events/events.js';
import { fetchWeather } from '@/weather/fetch-weather.js';
import { formatWeather } from '@/weather/formatter.js';

const DEFAULT_WEATHER_CITY = 'Челябинск';

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

  // /погода [город] — работает в личке, группах и каналах
  botInstance.command('погода', async (ctx) => {
    const city = ctx.match.trim() || DEFAULT_WEATHER_CITY;

    await ctx.reply(`⏳ Получаю погоду для ${city}...`);

    try {
      const data = await fetchWeather(city);
      const message = formatWeather(data, city);
      await ctx.api.sendMessage(ctx.chat.id, message, { parse_mode: 'HTML' });
    } catch (err) {
      await ctx.reply(`❌ Не удалось получить погоду: ${err instanceof Error ? err.message : err}`);
    }
  });

  botInstance.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    const reply = await generateReply(userId, text);
    await ctx.reply(reply);
  });
}

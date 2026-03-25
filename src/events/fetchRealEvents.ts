import { API_URLS, TIMEOUT_MEDIUM } from '@/config/api.js';
import { TIMEZONE, CHELYABINSK, MORNING_GREETINGS, FEAR_GREED_LABELS } from '@/config/constants.js';
import { fetchOpenHolidays, checkIsDayOff, fetchCalendRuHolidays, fetchKakoyPrazdnik } from '@/events/fetchers/holidays.js';
import { fetchRandomPlace, fetchCompactWeather } from '@/events/fetchers/weather.js';
import { fetchCatFact, fetchDogFact, fetchWordMeaning, fetchUselessFact } from '@/events/fetchers/facts.js';
import { fetchInvestmentReturns, fetchFearGreedIndex } from '@/events/fetchers/investments.js';
import { fetchBirths, fetchCbrRates, fetchCdfRate, fetchSunTimes, fetchDilemma, fetchRiddle } from '@/events/fetchers/misc.js';

function formatTemp(temp: number): string {
  return temp > 0 ? `+${temp}°C` : `${temp}°C`;
}

export async function fetchCoffeePhotoUrl(): Promise<string | null> {
  try {
    const res = await fetch(API_URLS.COFFEE, {
      signal: AbortSignal.timeout(TIMEOUT_MEDIUM),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { file: string };
    return data.file ?? null;
  } catch {
    return null;
  }
}

export function getRandomMorningGreeting(): string {
  return MORNING_GREETINGS[Math.floor(Math.random() * MORNING_GREETINGS.length)];
}

export async function fetchRealEventsForDate(date: Date): Promise<string> {
  // Phase 1: fetch everything in parallel (except weather which needs place coords)
  const [
    holidaysResult,
    isDayOffResult,
    calendResult,
    kakoyPrazdnikResult,
    birthsResult,
    placeResult,
    catFactResult,
    dogFactResult,
    wordResult,
    uselessFactResult,
    cbrRatesResult,
    cdfRateResult,
    sunTimesResult,
    dilemmaResult,
    riddleResult,
  ] = await Promise.allSettled([
    fetchOpenHolidays(date),
    checkIsDayOff(date),
    fetchCalendRuHolidays(date),
    fetchKakoyPrazdnik(date),
    fetchBirths(date),
    fetchRandomPlace(),
    fetchCatFact(),
    fetchDogFact(),
    fetchWordMeaning(),
    fetchUselessFact(),
    fetchCbrRates(),
    fetchCdfRate(),
    fetchSunTimes(),
    fetchDilemma(),
    fetchRiddle(),
  ]);

  const cbrRatesEarly = cbrRatesResult.status === 'fulfilled' ? cbrRatesResult.value : [];
  const usdRubNow = cbrRatesEarly.find((r) => r.code === 'USD')?.valueRub ?? null;
  const [investmentResult, fearGreed] = await Promise.all([
    fetchInvestmentReturns(usdRubNow),
    fetchFearGreedIndex(),
  ]);

  const isDayOff = isDayOffResult.status === 'fulfilled' ? isDayOffResult.value : null;
  const officialHolidays = holidaysResult.status === 'fulfilled' ? holidaysResult.value : [];
  const calendHolidays = calendResult.status === 'fulfilled' ? calendResult.value : [];
  const kakoyPrazdnik = kakoyPrazdnikResult.status === 'fulfilled' ? kakoyPrazdnikResult.value : [];
  const births = birthsResult.status === 'fulfilled' ? birthsResult.value : [];
  const place = placeResult.status === 'fulfilled' ? placeResult.value : null;
  const catFact = catFactResult.status === 'fulfilled' ? catFactResult.value : null;
  const dogFact = dogFactResult.status === 'fulfilled' ? dogFactResult.value : null;
  const wordMeaning = wordResult.status === 'fulfilled' ? wordResult.value : null;
  const uselessFact = uselessFactResult.status === 'fulfilled' ? uselessFactResult.value : null;
  const cbrRates = cbrRatesResult.status === 'fulfilled' ? cbrRatesResult.value : [];
  const cdfRate = cdfRateResult.status === 'fulfilled' ? cdfRateResult.value : null;
  const sunTimes = sunTimesResult.status === 'fulfilled' ? sunTimesResult.value : null;
  const dilemma = dilemmaResult.status === 'fulfilled' ? dilemmaResult.value : null;
  const riddle = riddleResult.status === 'fulfilled' ? riddleResult.value : null;

  // Phase 2: fetch weather for both cities in parallel (Chelyabinsk + random place)
  const [chelWeatherResult, placeWeatherResult] = await Promise.allSettled([
    fetchCompactWeather(CHELYABINSK.name, CHELYABINSK.lat, CHELYABINSK.lon),
    place ? fetchCompactWeather(place.name, place.lat, place.lon) : Promise.resolve(null),
  ]);

  const chelWeather = chelWeatherResult.status === 'fulfilled' ? chelWeatherResult.value : null;
  const placeWeather = placeWeatherResult.status === 'fulfilled' ? placeWeatherResult.value : null;

  // ─── Build the post ───────────────────────────────────────────────────────

  const dayOffEmoji = isDayOff === true ? ' 🏖' : isDayOff === false ? ' 💼' : '';
  const dateStr = date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  let text = `📅 <b>${capitalizedDate}</b>${dayOffEmoji}\n`;

  // ── Памятные даты ──────────────────────────────────────────────────────────
  const allHolidays = [...officialHolidays, ...calendHolidays];
  if (allHolidays.length > 0) {
    text += `\n🌟 <b>Памятные даты:</b>\n`;
    allHolidays.forEach((h) => (text += `• ${h}\n`));
  }

  // ── Праздники дня (необычные) ──────────────────────────────────────────────
  if (kakoyPrazdnik.length > 0) {
    text += `\n🎉 <b>Праздники дня:</b>\n`;
    kakoyPrazdnik.forEach((h) => (text += `• ${h}\n`));
  }

  text += `\n<b>──────────────</b>\n`;

  // ── Место дня ──────────────────────────────────────────────────────────────
  if (place) {
    const pop = place.population ? ` · население ${place.population.toLocaleString('ru-RU')}` : '';
    text += `\n🌍 <b>Место дня — ${place.name}</b>\n`;
    text += `🗺 ${place.country}${pop}\n`;
  }

  // ── Погода ─────────────────────────────────────────────────────────────────
  if (chelWeather || placeWeather) {
    text += `\n🌡 <b>Погода:</b>\n`;
    if (chelWeather) {
      text += `📍 <b>Челябинск:</b> ${formatTemp(chelWeather.temp)}, ${chelWeather.description}, влажность ${chelWeather.humidity}%\n`;
    }
    if (placeWeather) {
      text += `📍 <b>${placeWeather.city}:</b> ${formatTemp(placeWeather.temp)}, ${placeWeather.description}, влажность ${placeWeather.humidity}%\n`;
    }
  }

  // ── Восход / Закат ─────────────────────────────────────────────────────────
  if (sunTimes) {
    text += `\n🌅 <b>Челябинск:</b> рассвет ${sunTimes.sunrise} · закат ${sunTimes.sunset} · день ${sunTimes.dayLength}\n`;
  }

  // ── Курс валют ─────────────────────────────────────────────────────────────
  if (cbrRates.length > 0 || cdfRate) {
    text += `\n💱 <b>Курс валют (ЦБ РФ):</b>\n`;
    for (const r of cbrRates) {
      const value = r.valueRub.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const diff = r.valueRub - r.previousRub;
      const arrow = diff > 0 ? '↗' : diff < 0 ? '↘' : '→';
      const sign = diff > 0 ? '+' : '';
      const diffStr = diff.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      text += `${r.flag} 1 ${r.code} = ${value} ₽  ${arrow} ${sign}${diffStr}\n`;
    }
    if (cdfRate) {
      const cdfStr = cdfRate.cdfPerRub.toLocaleString('ru-RU', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      text += `🇨🇩 1 ₽ = ${cdfStr} CDF (Конголезский франк)\n`;
    }
  }

  text += `\n<b>──────────────</b>\n`;

  // ── Факт о кошках ──────────────────────────────────────────────────────────
  if (catFact) {
    text += `\n🐱 <b>Факт о кошках:</b>\n${catFact}\n`;
  }

  // ── Факт о собаках ────────────────────────────────────────────────────────
  if (dogFact) {
    text += `\n🐶 <b>Факт о собаках:</b>\n${dogFact}\n`;
  }

  // ── Слово дня ─────────────────────────────────────────────────────────────
  if (wordMeaning) {
    text += `\n📖 <b>Слово дня</b> — <i>${wordMeaning.word}</i> (${wordMeaning.wordRu}):\n${wordMeaning.meaning}\n`;
  }

  // ── Родились в этот день ──────────────────────────────────────────────────
  if (births.length > 0) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n✨ <b>Родились в этот день:</b>\n`;
    births.forEach((b) => (text += `• ${b.year} — ${b.description}\n`));
  }

  // ── Факт дня ──────────────────────────────────────────────────────────────
  if (uselessFact) {
    text += `\n🌀 <b>Факт дня:</b>\n${uselessFact}\n`;
  }

  // ── Дилемма дня ───────────────────────────────────────────────────────────
  if (dilemma) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n🤔 <b>Вопрос дня:</b>\n${dilemma}\n`;
  }

  // ── Загадка дня ───────────────────────────────────────────────────────────
  if (riddle) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n🧩 <b>Загадка дня:</b>\n${riddle.question}\n\n`;
    text += `<tg-spoiler>💡 Ответ: ${riddle.answer}</tg-spoiler>\n`;
  }

  // ── Инвест-машина времени ─────────────────────────────────────────────────
  {
    text += `\n<b>──────────────</b>\n`;
    text += `\n📈 <b>Машина времени инвестора</b> 😜 <b>Упущенная выгода</b>\n`;
    text += `<i>Что было бы, если 1 января 2015 года вложить по 1000 ₽ в каждый актив?</i>\n\n`;

    if (investmentResult.assets.every((a) => a.error)) {
      text += `😅 Извините, все бесплатные API сегодня бастуют — владелец бота не олигарх, платные подключить не может. Попробуем завтра!\n`;
    } else {
      for (const asset of investmentResult.assets) {
        if (asset.error) {
          text += `${asset.emoji} <b>${asset.name}:</b> 🤷 API не ответил — видимо, биржа тоже не работает бесплатно\n`;
        } else {
          const current = asset.currentValueRub!;
          const profit = current - asset.invested;
          const pct = ((profit / asset.invested) * 100).toFixed(1);
          const sign = profit >= 0 ? '+' : '';
          const arrow = profit >= 0 ? '📈' : '📉';
          const currentStr = current.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
          const profitStr = Math.abs(profit).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
          const profitWord = profit >= 0 ? 'прибыль' : 'убыток';
          text += `${asset.emoji} <b>${asset.name}:</b> ${currentStr} ₽ ${arrow}\n`;
          text += `   ${sign}${profitStr} ₽ (${sign}${pct}%) — ${profitWord} за ~10 лет\n`;
        }
      }

      if (investmentResult.hasErrors) {
        text += `\n<i>* Часть данных недоступна — бесплатные API иногда капризничают, как кот Степка в понедельник 🐱</i>\n`;
      }
    }

    if (fearGreed) {
      const label = FEAR_GREED_LABELS[fearGreed.classification] ?? fearGreed.classification;
      text += `\n😱🤑 <b>Индекс страха и жадности крипторынка:</b> ${fearGreed.value}/100 — ${label}\n`;
      text += `<i>0 = все в панике и продают, 100 = все в эйфории и покупают. Помогает понять настроение рынка.</i>\n`;
    }
  }

  text = text.trimEnd();

  return text;
}
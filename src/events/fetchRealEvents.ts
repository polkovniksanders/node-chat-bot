import { API_URLS, TIMEOUT_MEDIUM } from '@/config/api.js';
import type { DigestFact } from '@/config/prompts.js';
import type { Riddle } from '@/types/index.js';
import { TIMEZONE, CHELYABINSK, MORNING_GREETINGS, FEAR_GREED_LABELS } from '@/config/constants.js';
import { fetchOpenHolidays, checkIsDayOff, fetchCalendRuHolidays, fetchKakoyPrazdnik } from '@/events/fetchers/holidays.js';
import { fetchRandomPlace, fetchCompactWeather } from '@/events/fetchers/weather.js';
import { fetchCatFact, fetchDogFact, fetchWordMeaning, fetchUselessFact } from '@/events/fetchers/facts.js';
import { fetchInvestmentReturns, fetchFearGreedIndex, fetchBigMacIndex, CURRENCY_SYMBOLS } from '@/events/fetchers/investments.js';
import { fetchBirths, fetchCbrRates, fetchCdfRate, fetchSunTimes, fetchDilemma, fetchRiddle } from '@/events/fetchers/misc.js';
import { fetchDoomsdayClock } from '@/events/fetchers/doomsdayClock.js';
import { fetchNostalgia } from '@/events/fetchers/nostalgia.js';

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

// ─── POST 1 (8:55): date + holidays + place + weather + sun (caption on coffee photo) ───

export async function fetchMorningHeaderForDate(date: Date): Promise<string> {
  const [
    holidaysResult,
    isDayOffResult,
    calendResult,
    kakoyPrazdnikResult,
    placeResult,
    sunTimesResult,
  ] = await Promise.allSettled([
    fetchOpenHolidays(date),
    checkIsDayOff(date),
    fetchCalendRuHolidays(date),
    fetchKakoyPrazdnik(date),
    fetchRandomPlace(),
    fetchSunTimes(),
  ]);

  const isDayOff = isDayOffResult.status === 'fulfilled' ? isDayOffResult.value : null;
  const officialHolidays = holidaysResult.status === 'fulfilled' ? holidaysResult.value : [];
  const calendHolidays = calendResult.status === 'fulfilled' ? calendResult.value : [];
  const kakoyPrazdnik = kakoyPrazdnikResult.status === 'fulfilled' ? kakoyPrazdnikResult.value : [];
  const place = placeResult.status === 'fulfilled' ? placeResult.value : null;
  const sunTimes = sunTimesResult.status === 'fulfilled' ? sunTimesResult.value : null;

  // Fetch weather after we have the place
  const [chelWeatherResult, placeWeatherResult] = await Promise.allSettled([
    fetchCompactWeather(CHELYABINSK.name, CHELYABINSK.lat, CHELYABINSK.lon),
    place ? fetchCompactWeather(place.name, place.lat, place.lon) : Promise.resolve(null),
  ]);
  const chelWeather = chelWeatherResult.status === 'fulfilled' ? chelWeatherResult.value : null;
  const placeWeather = placeWeatherResult.status === 'fulfilled' ? placeWeatherResult.value : null;

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

  const allHolidays = [...officialHolidays, ...calendHolidays];
  if (allHolidays.length > 0) {
    text += `\n🌟 <b>Памятные даты:</b>\n`;
    allHolidays.forEach((h) => (text += `• ${h}\n`));
  }

  if (kakoyPrazdnik.length > 0) {
    text += `\n🎉 <b>Праздники дня:</b>\n`;
    kakoyPrazdnik.forEach((h) => (text += `• ${h}\n`));
  }

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

  return text.trimEnd();
}

// ─── POST 2 (9:00): facts + births + riddle + dilemma ────────────────────────

export async function fetchDailyFactsForDate(date: Date): Promise<string> {
  const [
    birthsResult,
    catFactResult,
    dogFactResult,
    wordResult,
    uselessFactResult,
    dilemmaResult,
    riddleResult,
    doomsdayResult,
    nostalgiaResult,   // [8] — always last
  ] = await Promise.allSettled([
    fetchBirths(date),       // [0]
    fetchCatFact(),          // [1]
    fetchDogFact(),          // [2]
    fetchWordMeaning(),      // [3]
    fetchUselessFact(),      // [4]
    fetchDilemma(),          // [5]
    fetchRiddle(),           // [6]
    fetchDoomsdayClock(),    // [7]
    fetchNostalgia(date),    // [8]
  ]);

  const births = birthsResult.status === 'fulfilled' ? birthsResult.value : [];
  const catFact = catFactResult.status === 'fulfilled' ? catFactResult.value : null;
  const dogFact = dogFactResult.status === 'fulfilled' ? dogFactResult.value : null;
  const wordMeaning = wordResult.status === 'fulfilled' ? wordResult.value : null;
  const uselessFact = uselessFactResult.status === 'fulfilled' ? uselessFactResult.value : null;
  const dilemma = dilemmaResult.status === 'fulfilled' ? dilemmaResult.value : null;
  const riddle = riddleResult.status === 'fulfilled' ? riddleResult.value : null;
  const doomsdayClock = doomsdayResult.status === 'fulfilled' ? doomsdayResult.value : null;
  const nostalgia = nostalgiaResult.status === 'fulfilled' ? nostalgiaResult.value : null;

  let text = '';

  text += `\n<b>──────────────</b>\n`;

  // ── Факт о кошках ──────────────────────────────────────────────────────────
  if (catFact) {
    text += `\n🐱 <b>Факт о кошках:</b>\n${catFact}\n`;
  }

  // ── Факт о собаках ─────────────────────────────────────────────────────────
  if (dogFact) {
    text += `\n🐶 <b>Факт о собаках:</b>\n${dogFact}\n`;
  }

  // ── Слово дня ──────────────────────────────────────────────────────────────
  if (wordMeaning) {
    text += `\n📖 <b>Слово дня</b> — <i>${wordMeaning.word}</i> (${wordMeaning.wordRu}):\n${wordMeaning.meaning}\n`;
  }

  // ── Родились в этот день ───────────────────────────────────────────────────
  if (births.length > 0) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n✨ <b>Родились в этот день:</b>\n`;
    births.forEach((b) => (text += `• ${b.year} — ${b.description}\n`));
  }

  // ── Факт дня ───────────────────────────────────────────────────────────────
  if (uselessFact) {
    text += `\n🌀 <b>Факт дня:</b>\n${uselessFact}\n`;
  }

  // ── Дилемма дня ────────────────────────────────────────────────────────────
  if (dilemma) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n🤔 <b>Вопрос дня:</b>\n${dilemma}\n`;
  }

  // ── Загадка дня ────────────────────────────────────────────────────────────
  if (riddle) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n🧩 <b>Загадка дня:</b>\n${riddle.question}\n\n`;
    text += `<tg-spoiler>💡 Ответ: ${riddle.answer}</tg-spoiler>\n`;
  }

  // ── Часы Судного дня ──────────────────────────────────────────────────────
  if (doomsdayClock) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n${doomsdayClock}\n`;
  }

  // ── Ностальгия (1989–2004) ─────────────────────────────────────────────────
  if (nostalgia) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n📼 <b>Ностальгия (1989–2004):</b>\n${nostalgia}\n`;
  }

  return text.trimEnd();
}

// ─── POST 3 (9:05): currency + investments + fear&greed ──────────────────────

export async function fetchFinancePost(): Promise<string> {
  const [cbrRatesResult, cdfRateResult, bigMacResult] = await Promise.allSettled([
    fetchCbrRates(),
    fetchCdfRate(),
    fetchBigMacIndex(),
  ]);

  const cbrRates = cbrRatesResult.status === 'fulfilled' ? cbrRatesResult.value : [];
  const cdfRate = cdfRateResult.status === 'fulfilled' ? cdfRateResult.value : null;
  const bigMac = bigMacResult.status === 'fulfilled' ? bigMacResult.value : null;
  const usdRubNow = cbrRates.find((r) => r.code === 'USD')?.valueRub ?? null;

  const [investmentResult, fearGreed] = await Promise.all([
    fetchInvestmentReturns(usdRubNow),
    fetchFearGreedIndex(),
  ]);

  let text = '';

  // ── Курс валют ─────────────────────────────────────────────────────────────
  if (cbrRates.length > 0 || cdfRate) {
    text += `💱 <b>Курс валют (ЦБ РФ):</b>\n`;
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

  // ── Индекс Биг Мака ───────────────────────────────────────────────────────
  if (bigMac && bigMac.length > 0) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n🍔 <b>Индекс Биг Мака:</b>\n`;
    text += `<i>Сколько стоит Биг Мак в разных странах (данные The Economist)</i>\n\n`;
    for (const entry of bigMac) {
      const sym = CURRENCY_SYMBOLS[entry.currency_code] ?? entry.currency_code + ' ';
      const localStr = entry.local_price % 1 === 0
        ? entry.local_price.toFixed(0)
        : entry.local_price.toFixed(2);
      const usdStr = entry.dollar_price.toFixed(2);
      if (entry.currency_code === 'USD') {
        text += `${entry.emoji} ${entry.name}: $${usdStr} (базовая цена)\n`;
      } else {
        const raw = entry.usd_raw;
        let valuation: string;
        if (Math.abs(raw) < 5) {
          valuation = '≈ паритет';
        } else if (raw < 0) {
          valuation = `📉 ${raw.toFixed(0)}% (валюта недооценена)`;
        } else {
          valuation = `📈 +${raw.toFixed(0)}% (валюта переоценена)`;
        }
        text += `${entry.emoji} ${entry.name}: ${sym}${localStr} → $${usdStr}  ${valuation}\n`;
      }
    }
    text += `\n<i>Отклонение показывает, насколько валюта недо- или переоценена относительно доллара</i>\n`;
  }

  // ── Инвест-машина времени ──────────────────────────────────────────────────
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

  // ── Индекс страха и жадности ───────────────────────────────────────────────
  if (fearGreed) {
    const label = FEAR_GREED_LABELS[fearGreed.classification] ?? fearGreed.classification;
    text += `\n😱🤑 <b>Индекс страха и жадности крипторынка:</b> ${fearGreed.value}/100 — ${label}\n`;
    text += `<i>0 = все в панике и продают, 100 = все в эйфории и покупают. Помогает понять настроение рынка.</i>\n`;
  }

  return text.trimEnd();
}

// ─── Digest facts cache (для случайных обращений к пользователям) ────────────

let digestFactsCache: { date: string; facts: DigestFact[] } | null = null;

export async function fetchDigestFacts(): Promise<DigestFact[]> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  if (digestFactsCache && digestFactsCache.date === today) {
    return digestFactsCache.facts;
  }

  const [catFactResult, dogFactResult, uselessFactResult, dilemmaResult, riddleResult, nostalgiaResult] =
    await Promise.allSettled([
      fetchCatFact(),
      fetchDogFact(),
      fetchUselessFact(),
      fetchDilemma(),
      fetchRiddle(),
      fetchNostalgia(new Date()),
    ]);

  const facts: DigestFact[] = [];

  if (catFactResult.status === 'fulfilled' && catFactResult.value) {
    facts.push({ type: 'cat', label: 'Факт о кошках', content: catFactResult.value });
  }
  if (dogFactResult.status === 'fulfilled' && dogFactResult.value) {
    facts.push({ type: 'dog', label: 'Факт о собаках', content: dogFactResult.value });
  }
  if (uselessFactResult.status === 'fulfilled' && uselessFactResult.value) {
    facts.push({ type: 'useless', label: 'Бесполезный факт дня', content: uselessFactResult.value });
  }
  if (dilemmaResult.status === 'fulfilled' && dilemmaResult.value) {
    facts.push({ type: 'dilemma', label: 'Дилемма дня', content: dilemmaResult.value });
  }
  if (riddleResult.status === 'fulfilled' && riddleResult.value) {
    const r = riddleResult.value as Riddle;
    facts.push({ type: 'riddle', label: 'Загадка дня', content: r.question });
  }
  if (nostalgiaResult.status === 'fulfilled' && nostalgiaResult.value) {
    facts.push({ type: 'nostalgia', label: 'Ностальгия', content: nostalgiaResult.value });
  }

  digestFactsCache = { date: today, facts };
  return facts;
}

// ─── Legacy export (used by events.ts) ───────────────────────────────────────

export async function fetchRealEventsForDate(date: Date): Promise<string> {
  const [header, facts, finance] = await Promise.all([
    fetchMorningHeaderForDate(date),
    fetchDailyFactsForDate(date),
    fetchFinancePost(),
  ]);
  return [header, facts, finance].filter(Boolean).join('\n\n');
}
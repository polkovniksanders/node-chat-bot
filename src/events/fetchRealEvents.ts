// Sources:
// 1.  openholidaysapi.org        — official public holidays by country (free, no auth)
// 2.  isdayoff.ru                — check if today is a day off in Russia (free, no auth)
// 3.  calend.ru                  — Russian memorable dates (scraping)
// 4.  api.geonames.org           — random world city info (free, needs GEONAMES_USERNAME)
//     ↳ fallback: curated list of interesting cities
// 5.  openweathermap.org         — weather for 2 cities (needs OPENWEATHERMAP_API_KEY)
//     ↳ fallback: open-meteo.com (free, no auth)
// 6.  catfact.ninja              — random cat fact (free, no auth)
// 7.  dogapi.dog                 — random dog fact (free, no auth)
// 8.  api.dictionaryapi.dev      — word of the day definition (free, no auth)
// 9.  uselessfacts.jsph.pl       — interesting fact (free, no auth)
// 10. coffee.alexflipnote.dev    — random coffee photo (free, no auth)
// 11. byabbe.se                  — notable births on this day (free, no auth)
// 12. cbr-xml-daily.ru           — ЦБ РФ exchange rates USD/EUR/CNY (free, no auth)
// 13. open.er-api.com            — CDF (Congolese Franc) rate via USD pivot (free, no auth)
// 14. api.sunrise-sunset.org     — sunrise & sunset times for Chelyabinsk (free, no auth)
// 15. riddles-api.vercel.app     — random English riddle translated to Russian (free, no auth)
//     ↳ fallback: AI generates a Russian riddle directly
// 16. kakoysegodnyaprazdnik.ru   — fun/quirky holidays sorted by popularity (scraping)

import { generateContent } from '@/ai/generateContent.js';
import { API_URLS, TIMEOUT_SHORT, TIMEOUT_MEDIUM, TIMEOUT_LONG } from '@/config/api.js';
import {
  TIMEZONE,
  CHELYABINSK,
  FALLBACK_PLACES,
  INTERESTING_WORDS,
  WMO_SHORT,
  MORNING_GREETINGS,
  MONTH_TRANSLITS,
} from '@/config/constants.js';
import {
  TRANSLATE_SYSTEM_PROMPT,
  CAT_FACT_TRANSLATE_HINT,
  DOG_FACT_TRANSLATE_HINT,
  USELESS_FACT_TRANSLATE_HINT,
  WORD_TRANSLATE_HINT,
  RIDDLE_TRANSLATE_SYSTEM_PROMPT,
  RIDDLE_GENERATE_SYSTEM_PROMPT,
  DILEMMA_SYSTEM_PROMPT,
} from '@/config/prompts.js';
import type {
  OpenHoliday,
  PlaceInfo,
  CompactWeather,
  WordMeaning,
  CurrencyRate,
  CdfRate,
  SunTimes,
  Riddle,
} from '@/types/index.js';

// ─── Translation helper ──────────────────────────────────────────────────────

async function translateText(text: string, hint = ''): Promise<string> {
  try {
    const systemPrompt = hint ? `${TRANSLATE_SYSTEM_PROMPT} ${hint}` : TRANSLATE_SYSTEM_PROMPT;
    const result = await generateContent(systemPrompt, text);
    return result.trim() || text;
  } catch {
    return text;
  }
}

// ─── Data fetchers ───────────────────────────────────────────────────────────

async function fetchOpenHolidays(date: Date): Promise<string[]> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const url = `${API_URLS.OPEN_HOLIDAYS}?countryIsoCode=RU&languageIsoCode=RU&validFrom=${dateStr}&validTo=${dateStr}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MEDIUM) });
    if (!res.ok) return [];
    const data = (await res.json()) as OpenHoliday[];
    return data
      .map((h) => h.name.find((n) => n.language === 'RU')?.text ?? h.name[0]?.text ?? '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function checkIsDayOff(date: Date): Promise<boolean | null> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const url = `${API_URLS.IS_DAY_OFF}?year=${year}&month=${month}&day=${day}&cc=ru`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_SHORT) });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim() === '1';
  } catch {
    return null;
  }
}

async function fetchKakoyPrazdnik(date: Date): Promise<string[]> {
  try {
    const month = MONTH_TRANSLITS[date.getMonth() + 1];
    const day = date.getDate();
    const url = `${API_URLS.KAKOY_PRAZDNIK}/${month}/${day}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Each holiday block: <meta itemprop="upvoteCount" content="N"> followed by <span itemprop="text">NAME</span>
    const blockPattern = /<meta\s+itemprop="upvoteCount"\s+content="(\d+)"[\s\S]*?<span[^>]*itemprop="text"[^>]*>([\s\S]*?)<\/span>/g;
    const items: Array<{ votes: number; name: string }> = [];
    let m;
    while ((m = blockPattern.exec(html)) !== null) {
      const votes = parseInt(m[1], 10);
      const name = m[2].replace(/<[^>]+>/g, '').trim();
      if (name.length > 3) items.push({ votes, name });
    }

    return items
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 5)
      .map((i) => i.name);
  } catch {
    return [];
  }
}

async function fetchCalendRuHolidays(date: Date): Promise<string[]> {
  try {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const url = `${API_URLS.CALEND_RU}/${month}-${day}/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Actual holiday links use pattern /holidays/0/0/NNNN/ (numeric ID)
    const seen = new Set<string>();
    const results: string[] = [];
    const pattern = /<a\s+href="\/holidays\/0\/0\/\d+\/"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = pattern.exec(html)) !== null) {
      const name = m[1].replace(/<[^>]+>/g, '').trim();
      if (name.length > 3 && !seen.has(name)) {
        seen.add(name);
        results.push(name);
      }
    }
    return results.slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchBirths(date: Date): Promise<Array<{ year: string; description: string }>> {
  try {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const url = `${API_URLS.BYABBE}/${month}/${day}.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_LONG) });
    if (!res.ok) return [];
    const data = (await res.json()) as { births: Array<{ year: string; description: string }> };
    return data.births?.slice(0, 3) ?? [];
  } catch {
    return [];
  }
}

async function fetchRandomPlace(): Promise<PlaceInfo> {
  const username = process.env.GEONAMES_USERNAME;
  if (username) {
    try {
      const url = `${API_URLS.GEONAMES_CITIES}?north=90&south=-90&east=180&west=-180&lang=ru&maxRows=500&username=${username}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_LONG) });
      if (res.ok) {
        const data = (await res.json()) as { geonames: any[] };
        const cities = data.geonames;
        if (cities?.length) {
          const city = cities[Math.floor(Math.random() * cities.length)];
          return {
            name: city.name,
            country: city.countryName,
            lat: parseFloat(city.lat),
            lon: parseFloat(city.lng),
            population: city.population,
          };
        }
      }
    } catch {
      // fall through to curated list
    }
  }
  return FALLBACK_PLACES[Math.floor(Math.random() * FALLBACK_PLACES.length)];
}

async function fetchCompactWeather(
  cityName: string,
  lat: number,
  lon: number,
): Promise<CompactWeather | null> {
  // Try OpenWeatherMap if API key is configured
  const owmKey = process.env.OPENWEATHERMAP_API_KEY;
  if (owmKey) {
    try {
      const url = `${API_URLS.OPENWEATHERMAP}?lat=${lat}&lon=${lon}&appid=${owmKey}&lang=ru&units=metric`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_LONG) });
      if (res.ok) {
        const data = (await res.json()) as any;
        return {
          city: cityName,
          temp: Math.round(data.main.temp),
          description: data.weather?.[0]?.description ?? '',
          humidity: data.main.humidity,
        };
      }
    } catch {
      // fall through to Open-Meteo
    }
  }

  // Fallback: Open-Meteo (free, no auth needed)
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,weather_code,relative_humidity_2m',
      timezone: 'auto',
      forecast_days: '1',
    });
    const res = await fetch(`${API_URLS.OPEN_METEO}?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const code: number = data.current.weather_code;
    return {
      city: cityName,
      temp: Math.round(data.current.temperature_2m),
      description: WMO_SHORT[code] ?? 'переменно',
      humidity: data.current.relative_humidity_2m,
    };
  } catch {
    return null;
  }
}

async function fetchCatFact(): Promise<string | null> {
  try {
    const res = await fetch(API_URLS.CAT_FACT, { signal: AbortSignal.timeout(TIMEOUT_MEDIUM) });
    if (!res.ok) return null;
    const data = (await res.json()) as { fact: string };
    if (!data.fact) return null;
    return await translateText(data.fact, CAT_FACT_TRANSLATE_HINT);
  } catch {
    return null;
  }
}

async function fetchDogFact(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URLS.DOG_FACT}?limit=1`, {
      signal: AbortSignal.timeout(TIMEOUT_MEDIUM),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: Array<{ attributes: { body: string } }> };
    const fact = data.data?.[0]?.attributes?.body;
    if (!fact) return null;
    return await translateText(fact, DOG_FACT_TRANSLATE_HINT);
  } catch {
    return null;
  }
}

async function fetchWordMeaning(): Promise<WordMeaning | null> {
  const word = INTERESTING_WORDS[Math.floor(Math.random() * INTERESTING_WORDS.length)];
  try {
    const res = await fetch(`${API_URLS.DICTIONARY}/${word}`, {
      signal: AbortSignal.timeout(TIMEOUT_MEDIUM),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any[];
    const definition = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    if (!definition) return null;
    const [wordRu, meaning] = await Promise.all([
      translateText(word, WORD_TRANSLATE_HINT),
      translateText(definition),
    ]);
    return { word, wordRu, meaning };
  } catch {
    return null;
  }
}

async function fetchUselessFact(): Promise<string | null> {
  try {
    const res = await fetch(API_URLS.USELESS_FACTS, {
      signal: AbortSignal.timeout(TIMEOUT_SHORT),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text: string };
    if (!data.text) return null;
    return await translateText(data.text, USELESS_FACT_TRANSLATE_HINT);
  } catch {
    return null;
  }
}

async function fetchCbrRates(): Promise<CurrencyRate[]> {
  try {
    const res = await fetch(API_URLS.CBR_RATES, {
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      Valute: Record<string, { Nominal: number; Value: number; Previous: number }>;
    };

    const pairs: Array<{ code: string; flag: string }> = [
      { code: 'USD', flag: '🇺🇸' },
      { code: 'EUR', flag: '🇪🇺' },
      { code: 'CNY', flag: '🇨🇳' },
    ];

    return pairs
      .map(({ code, flag }) => {
        const v = data.Valute[code];
        if (!v) return null;
        return {
          flag,
          code,
          valueRub: v.Value / v.Nominal,
          previousRub: v.Previous / v.Nominal,
        };
      })
      .filter((r): r is CurrencyRate => r !== null);
  } catch {
    return [];
  }
}

// CDF is not listed by CBR — fetch via USD pivot from open.er-api.com
async function fetchCdfRate(): Promise<CdfRate | null> {
  try {
    const res = await fetch(API_URLS.EXCHANGE_RATES, {
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates: Record<string, number> };
    const usdToRub = data.rates['RUB'];
    const usdToCdf = data.rates['CDF'];
    if (!usdToRub || !usdToCdf) return null;
    // 1 RUB = (usdToCdf / usdToRub) CDF
    return { cdfPerRub: usdToCdf / usdToRub };
  } catch {
    return null;
  }
}

async function fetchSunTimes(): Promise<SunTimes | null> {
  try {
    const url = `${API_URLS.SUNRISE_SUNSET}?lat=${CHELYABINSK.lat}&lng=${CHELYABINSK.lon}&formatted=0`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MEDIUM) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results: { sunrise: string; sunset: string; day_length: number };
    };
    if (data.status !== 'OK') return null;

    const toLocal = (iso: string) =>
      new Date(iso).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TIMEZONE,
      });

    const totalSec = data.results.day_length;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const dayLength = `${h} ч ${m} мин`;

    return {
      sunrise: toLocal(data.results.sunrise),
      sunset: toLocal(data.results.sunset),
      dayLength,
    };
  } catch {
    return null;
  }
}

async function fetchDilemma(): Promise<string | null> {
  try {
    const result = await generateContent(DILEMMA_SYSTEM_PROMPT, 'Сгенерируй вопрос-дилемму!');
    const question = result.trim();
    return question.length > 10 ? question : null;
  } catch {
    return null;
  }
}

async function fetchRiddle(): Promise<Riddle | null> {
  // Try English riddles API → translate
  try {
    const res = await fetch(API_URLS.RIDDLES, {
      signal: AbortSignal.timeout(TIMEOUT_MEDIUM),
    });
    if (res.ok) {
      const data = (await res.json()) as { riddle: string; answer: string };
      if (data.riddle && data.answer) {
        const raw = await generateContent(
          RIDDLE_TRANSLATE_SYSTEM_PROMPT,
          JSON.stringify({ riddle: data.riddle, answer: data.answer }),
        );
        const parsed = JSON.parse(raw.trim()) as { riddle: string; answer: string };
        if (parsed.riddle && parsed.answer) {
          return { question: parsed.riddle, answer: parsed.answer };
        }
      }
    }
  } catch {
    // fall through to AI generation
  }

  // Fallback: AI generates a riddle in Russian directly
  try {
    const raw = await generateContent(RIDDLE_GENERATE_SYSTEM_PROMPT, 'Загадку!');
    const parsed = JSON.parse(raw.trim()) as { riddle: string; answer: string };
    if (parsed.riddle && parsed.answer) {
      return { question: parsed.riddle, answer: parsed.answer };
    }
  } catch {
    return null;
  }

  return null;
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

// ─── Main export ─────────────────────────────────────────────────────────────

function formatTemp(temp: number): string {
  return temp > 0 ? `+${temp}°C` : `${temp}°C`;
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
      // 1 CDF is worth a fraction of a ruble — show reversed: how much CDF per 1 ruble
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

  text = text.trimEnd();

  return text;
}
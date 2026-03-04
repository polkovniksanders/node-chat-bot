// Sources:
// 1.  openholidaysapi.org   — official public holidays by country (free, no auth)
// 2.  isdayoff.ru           — check if today is a day off in Russia (free, no auth)
// 3.  calend.ru             — Russian memorable dates (scraping)
// 4.  api.geonames.org      — random world city info (free, needs GEONAMES_USERNAME)
//     ↳ fallback: curated list of interesting cities
// 5.  openweathermap.org    — weather for 2 cities (needs OPENWEATHERMAP_API_KEY)
//     ↳ fallback: open-meteo.com (free, no auth)
// 6.  catfact.ninja         — random cat fact (free, no auth)
// 7.  dogapi.dog            — random dog fact (free, no auth)
// 8.  api.dictionaryapi.dev — word of the day definition (free, no auth)
// 9.  uselessfacts.jsph.pl  — interesting fact (free, no auth)
// 10. coffee.alexflipnote.dev — random coffee photo (free, no auth)
// 11. byabbe.se             — notable births on this day (free, no auth)
// 12. cbr-xml-daily.ru      — ЦБ РФ exchange rates USD/EUR/CNY (free, no auth)
// 13. open.er-api.com       — CDF (Congolese Franc) rate via USD pivot (free, no auth)
// 14. api.sunrise-sunset.org— sunrise & sunset times for Chelyabinsk (free, no auth)
// 15. riddles-api.vercel.app— random English riddle translated to Russian (free, no auth)
//     ↳ fallback: AI generates a Russian riddle directly

interface OpenHoliday {
  id: string;
  startDate: string;
  endDate: string;
  name: Array<{ language: string; text: string }>;
}

interface PlaceInfo {
  name: string;
  country: string;
  lat: number;
  lon: number;
  population?: number;
}

interface CompactWeather {
  city: string;
  temp: number;
  description: string;
  humidity: number;
}

interface WordMeaning {
  word: string;
  wordRu: string;
  meaning: string;
}

interface CurrencyRate {
  flag: string;
  code: string;
  valueRub: number;
  previousRub: number;
}

interface CdfRate {
  cdfPerRub: number;
}

interface SunTimes {
  sunrise: string;
  sunset: string;
  dayLength: string;
}

interface Riddle {
  question: string;
  answer: string;
}

// Curated fallback cities for when GeoNames is unavailable
const FALLBACK_PLACES: PlaceInfo[] = [
  { name: 'Токио', country: 'Япония', lat: 35.6762, lon: 139.6503, population: 13960000 },
  { name: 'Рим', country: 'Италия', lat: 41.9028, lon: 12.4964, population: 2873000 },
  { name: 'Рейкьявик', country: 'Исландия', lat: 64.1355, lon: -21.8954, population: 130000 },
  { name: 'Маракеш', country: 'Марокко', lat: 31.6295, lon: -7.9811, population: 1070838 },
  { name: 'Прага', country: 'Чехия', lat: 50.0755, lon: 14.4378, population: 1309000 },
  { name: 'Дублин', country: 'Ирландия', lat: 53.3498, lon: -6.2603, population: 1388000 },
  { name: 'Буэнос-Айрес', country: 'Аргентина', lat: -34.6037, lon: -58.3816, population: 2890151 },
  { name: 'Кейптаун', country: 'ЮАР', lat: -33.9249, lon: 18.4241, population: 4618000 },
  { name: 'Осло', country: 'Норвегия', lat: 59.9139, lon: 10.7522, population: 1023100 },
  { name: 'Амстердам', country: 'Нидерланды', lat: 52.3676, lon: 4.9041, population: 921000 },
  { name: 'Бангкок', country: 'Таиланд', lat: 13.7563, lon: 100.5018, population: 10539000 },
  { name: 'Лиссабон', country: 'Португалия', lat: 38.7223, lon: -9.1393, population: 545245 },
  { name: 'Дубай', country: 'ОАЭ', lat: 25.2048, lon: 55.2708, population: 3478000 },
  {
    name: 'Уэллингтон',
    country: 'Новая Зеландия',
    lat: -41.2866,
    lon: 174.7756,
    population: 418500,
  },
  { name: 'Хельсинки', country: 'Финляндия', lat: 60.1699, lon: 24.9384, population: 658864 },
  { name: 'Краков', country: 'Польша', lat: 50.0647, lon: 19.945, population: 779115 },
  { name: 'Сантьяго', country: 'Чили', lat: -33.4489, lon: -70.6693, population: 7039000 },
  { name: 'Аккра', country: 'Гана', lat: 5.6037, lon: -0.187, population: 2513000 },
  { name: 'Монтевидео', country: 'Уругвай', lat: -34.9011, lon: -56.1645, population: 1381000 },
  { name: 'Бали', country: 'Индонезия', lat: -8.3405, lon: 115.092, population: 4225000 },
  { name: 'Барселона', country: 'Испания', lat: 41.3851, lon: 2.1734, population: 1636762 },
  { name: 'Вена', country: 'Австрия', lat: 48.2082, lon: 16.3738, population: 1897491 },
  { name: 'Стамбул', country: 'Турция', lat: 41.0082, lon: 28.9784, population: 15462452 },
  { name: 'Найроби', country: 'Кения', lat: -1.2921, lon: 36.8219, population: 4397073 },
  { name: 'Сингапур', country: 'Сингапур', lat: 1.3521, lon: 103.8198, population: 5686000 },
];

// Beautiful English words for "Word of the Day"
const INTERESTING_WORDS = [
  'serendipity',
  'ephemeral',
  'mellifluous',
  'petrichor',
  'solitude',
  'wanderlust',
  'luminous',
  'ethereal',
  'cascade',
  'aurora',
  'zenith',
  'tranquil',
  'resilience',
  'serenade',
  'bliss',
  'harmony',
  'euphoria',
  'compassion',
  'gratitude',
  'halcyon',
  'lullaby',
  'renaissance',
  'serenity',
  'radiance',
  'whimsical',
];

// WMO weather codes → compact Russian descriptions
const WMO_SHORT: Record<number, string> = {
  0: 'ясно ☀️',
  1: 'преимущественно ясно 🌤',
  2: 'переменная облачность ⛅',
  3: 'пасмурно ☁️',
  45: 'туман 🌫',
  48: 'ледяной туман 🌫',
  51: 'слабая морось 🌦',
  53: 'морось 🌦',
  55: 'сильная морось 🌧',
  61: 'небольшой дождь 🌧',
  63: 'дождь 🌧',
  65: 'сильный дождь 🌧',
  71: 'небольшой снег ❄️',
  73: 'снег ❄️',
  75: 'сильный снег ❄️',
  77: 'снежная крупа 🌨',
  80: 'ливень 🌦',
  81: 'сильный ливень 🌧',
  82: 'проливной дождь ⛈',
  85: 'снежный ливень ❄️',
  86: 'сильный снежный ливень ❄️',
  95: 'гроза ⛈',
  96: 'гроза с градом ⛈',
  99: 'гроза с крупным градом ⛈',
};

// Morning greetings for coffee photo post (8:55)
const MORNING_GREETINGS = [
  '☕ Доброе утро! Твой утренний кофе уже готов\nЧерез 5 минут выйдет дайджест дня — оставайся с нами 📰',
  '🌅 Новый день начинается!\nВот твой кофе — через 5 минут свежий дайджест ☕',
  '☀️ Доброе утро!\nПока заваривается дайджест — держи кофе ☕ Скоро всё самое интересное 📋',
  '🌸 Пусть этот день будет тёплым!\nКофе уже здесь, дайджест — через 5 минут ☕',
  '🍀 Доброе утро! Начни день с маленькой радости ☕\nЧерез несколько минут — всё самое интересное 📰',
  '✨ Утро началось!\nТвоя чашка кофе уже ждёт тебя ☕ А мы уже готовим дайджест дня 📋',
  '🌿 Хорошего утра!\nКофе — это лучшее начало дня ☕ Дайджест совсем скоро 📰',
];

export function getRandomMorningGreeting(): string {
  return MORNING_GREETINGS[Math.floor(Math.random() * MORNING_GREETINGS.length)];
}

// ─── Translation helper ──────────────────────────────────────────────────────

async function translateText(text: string, hint = ''): Promise<string> {
  try {
    const { generateContent } = await import('@/ai/generateContent.js');
    const systemPrompt = hint
      ? `Переведи текст на русский язык. ${hint} Верни только перевод, без пояснений.`
      : 'Переведи текст на русский язык. Верни только перевод, без пояснений.';
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
    const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=RU&languageIsoCode=RU&validFrom=${dateStr}&validTo=${dateStr}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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
    const url = `https://isdayoff.ru/api/getdata?year=${year}&month=${month}&day=${day}&cc=ru`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim() === '1';
  } catch {
    return null;
  }
}

const RUSSIAN_CATEGORIES = ['России', 'Православн', 'воинской', 'Народн', 'Патриот'];

async function fetchCalendRuHolidays(date: Date): Promise<string[]> {
  try {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const url = `https://www.calend.ru/day/${month}-${day}/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const results: string[] = [];
    const liPattern = /<li>([\s\S]*?)<\/li>/g;
    let liMatch;
    while ((liMatch = liPattern.exec(html)) !== null) {
      const liContent = liMatch[1];
      const linkMatch = /<a\s+href="[^"]*\/holidays\/[^"]*">\s*([\s\S]*?)\s*<\/a>/.exec(liContent);
      const imgMatch = /<img[^>]+alt="([^"]+)"/.exec(liContent);
      if (linkMatch && imgMatch) {
        const name = linkMatch[1].trim();
        const category = imgMatch[1].trim();
        if (RUSSIAN_CATEGORIES.some((kw) => category.includes(kw)) && name.length > 3) {
          results.push(name);
        }
      }
    }
    return results.slice(0, 4);
  } catch {
    return [];
  }
}

async function fetchBirths(date: Date): Promise<Array<{ year: string; description: string }>> {
  try {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const url = `https://byabbe.se/on-this-day/${month}/${day}.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
      const url = `http://api.geonames.org/citiesJSON?north=90&south=-90&east=180&west=-180&lang=ru&maxRows=500&username=${username}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${owmKey}&lang=ru&units=metric`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(8000),
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
    const res = await fetch('https://catfact.ninja/fact', { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { fact: string };
    if (!data.fact) return null;
    return await translateText(
      data.fact,
      'Сохрани позитивный и тёплый тон. Если факт грустный или жестокий — перефразируй в нейтральный.',
    );
  } catch {
    return null;
  }
}

async function fetchDogFact(): Promise<string | null> {
  try {
    const res = await fetch('https://dogapi.dog/api/v2/facts?limit=1', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: Array<{ attributes: { body: string } }> };
    const fact = data.data?.[0]?.attributes?.body;
    if (!fact) return null;
    return await translateText(fact, 'Сохрани позитивный и тёплый тон.');
  } catch {
    return null;
  }
}

async function fetchWordMeaning(): Promise<WordMeaning | null> {
  const word = INTERESTING_WORDS[Math.floor(Math.random() * INTERESTING_WORDS.length)];
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any[];
    const definition = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    if (!definition) return null;
    const [wordRu, meaning] = await Promise.all([
      translateText(word, 'Переведи одно английское слово на русский. Верни только одно слово или короткое словосочетание.'),
      translateText(definition),
    ]);
    return { word, wordRu, meaning };
  } catch {
    return null;
  }
}

async function fetchUselessFact(): Promise<string | null> {
  try {
    const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text: string };
    if (!data.text) return null;
    return await translateText(
      data.text,
      'Сохрани позитивный и увлекательный тон. ' +
        'Если факт содержит пошлость, насилие или неуместный контент — замени его на похожий интересный факт о природе, науке или истории.',
    );
  } catch {
    return null;
  }
}

async function fetchCbrRates(): Promise<CurrencyRate[]> {
  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', {
      signal: AbortSignal.timeout(8000),
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
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(8000),
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
    // Chelyabinsk: lat=55.1644, lng=61.4368
    const url = 'https://api.sunrise-sunset.org/json?lat=55.1644&lng=61.4368&formatted=0';
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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
        timeZone: 'Asia/Yekaterinburg',
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

async function fetchRiddle(): Promise<Riddle | null> {
  const { generateContent } = await import('@/ai/generateContent.js');

  // Try English riddles API → translate
  try {
    const res = await fetch('https://riddles-api.vercel.app/random', {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = (await res.json()) as { riddle: string; answer: string };
      if (data.riddle && data.answer) {
        const raw = await generateContent(
          'Переведи загадку и ответ на русский язык. Сохрани игровой смысл и логику загадки. ' +
            'Верни строго JSON без markdown-блоков: {"riddle":"...","answer":"..."}',
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
    const raw = await generateContent(
      'Придумай оригинальную, короткую загадку на русском языке. ' +
        'Верни строго JSON без markdown-блоков: {"riddle":"текст загадки","answer":"ответ"}',
      'Загадку!',
    );
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
    const res = await fetch('https://coffee.alexflipnote.dev/random.json', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { file: string };
    return data.file ?? null;
  } catch {
    return null;
  }
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
    birthsResult,
    placeResult,
    catFactResult,
    dogFactResult,
    wordResult,
    uselessFactResult,
    cbrRatesResult,
    cdfRateResult,
    sunTimesResult,
    riddleResult,
  ] = await Promise.allSettled([
    fetchOpenHolidays(date),
    checkIsDayOff(date),
    fetchCalendRuHolidays(date),
    fetchBirths(date),
    fetchRandomPlace(),
    fetchCatFact(),
    fetchDogFact(),
    fetchWordMeaning(),
    fetchUselessFact(),
    fetchCbrRates(),
    fetchCdfRate(),
    fetchSunTimes(),
    fetchRiddle(),
  ]);

  const isDayOff = isDayOffResult.status === 'fulfilled' ? isDayOffResult.value : null;
  const officialHolidays = holidaysResult.status === 'fulfilled' ? holidaysResult.value : [];
  const calendHolidays = calendResult.status === 'fulfilled' ? calendResult.value : [];
  const births = birthsResult.status === 'fulfilled' ? birthsResult.value : [];
  const place = placeResult.status === 'fulfilled' ? placeResult.value : null;
  const catFact = catFactResult.status === 'fulfilled' ? catFactResult.value : null;
  const dogFact = dogFactResult.status === 'fulfilled' ? dogFactResult.value : null;
  const wordMeaning = wordResult.status === 'fulfilled' ? wordResult.value : null;
  const uselessFact = uselessFactResult.status === 'fulfilled' ? uselessFactResult.value : null;
  const cbrRates = cbrRatesResult.status === 'fulfilled' ? cbrRatesResult.value : [];
  const cdfRate = cdfRateResult.status === 'fulfilled' ? cdfRateResult.value : null;
  const sunTimes = sunTimesResult.status === 'fulfilled' ? sunTimesResult.value : null;
  const riddle = riddleResult.status === 'fulfilled' ? riddleResult.value : null;

  // Phase 2: fetch weather for both cities in parallel (Chelyabinsk + random place)
  const CHELYABINSK = { name: 'Челябинск', lat: 55.1644, lon: 61.4368 };
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
    timeZone: 'Asia/Yekaterinburg',
  });
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  let text = `📅 <b>${capitalizedDate}</b>${dayOffEmoji}\n`;

  // ── Памятные даты ──────────────────────────────────────────────────────────
  const allHolidays = [...officialHolidays, ...calendHolidays];
  if (allHolidays.length > 0) {
    text += `\n🌟 <b>Памятные даты:</b>\n`;
    allHolidays.forEach((h) => (text += `• ${h}\n`));
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

  // ── Загадка дня ───────────────────────────────────────────────────────────
  if (riddle) {
    text += `\n<b>──────────────</b>\n`;
    text += `\n🧩 <b>Загадка дня:</b>\n${riddle.question}\n\n`;
    text += `<tg-spoiler>💡 Ответ: ${riddle.answer}</tg-spoiler>\n`;
  }

  text = text.trimEnd();

  return text;
}

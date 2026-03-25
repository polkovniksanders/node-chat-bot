import { generateContent } from '@/ai/generateContent.js';
import { API_URLS, TIMEOUT_MEDIUM, TIMEOUT_LONG } from '@/config/api.js';
import { CHELYABINSK, TIMEZONE } from '@/config/constants.js';
import {
  RIDDLE_TRANSLATE_SYSTEM_PROMPT,
  RIDDLE_GENERATE_SYSTEM_PROMPT,
  DILEMMA_SYSTEM_PROMPT,
} from '@/config/prompts.js';
import type { CurrencyRate, CdfRate, SunTimes, Riddle } from '@/types/index.js';

export async function fetchBirths(date: Date): Promise<Array<{ year: string; description: string }>> {
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

export async function fetchCbrRates(): Promise<CurrencyRate[]> {
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

export async function fetchCdfRate(): Promise<CdfRate | null> {
  try {
    const res = await fetch(API_URLS.EXCHANGE_RATES, {
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates: Record<string, number> };
    const usdToRub = data.rates['RUB'];
    const usdToCdf = data.rates['CDF'];
    if (!usdToRub || !usdToCdf) return null;
    return { cdfPerRub: usdToCdf / usdToRub };
  } catch {
    return null;
  }
}

export async function fetchSunTimes(): Promise<SunTimes | null> {
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

export async function fetchDilemma(): Promise<string | null> {
  try {
    const result = await generateContent(DILEMMA_SYSTEM_PROMPT, 'Сгенерируй вопрос-дилемму!');
    const question = result.trim();
    return question.length > 10 ? question : null;
  } catch {
    return null;
  }
}

export async function fetchRiddle(): Promise<Riddle | null> {
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
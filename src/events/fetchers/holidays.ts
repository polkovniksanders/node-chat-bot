import { API_URLS, TIMEOUT_SHORT, TIMEOUT_MEDIUM, TIMEOUT_LONG } from '@/config/api.js';
import { MONTH_TRANSLITS } from '@/config/constants.js';
import type { OpenHoliday } from '@/types/index.js';

export async function fetchOpenHolidays(date: Date): Promise<string[]> {
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

export async function checkIsDayOff(date: Date): Promise<boolean | null> {
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

export async function fetchKakoyPrazdnik(date: Date): Promise<string[]> {
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

export async function fetchCalendRuHolidays(date: Date): Promise<string[]> {
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
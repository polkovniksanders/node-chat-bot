// Movie of the day for the daily digest.
// Uses TMDB API (TMDB_API_KEY) — any popular movie, not just animals.
// Falls back to AI if TMDB is unavailable.
// History is tracked separately from the 5-day cycle (data/digest-movie-history.json).

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { gptunnelChat } from '@/ai/gptunnel.js';

interface DigestMovie {
  title: string;
  year: number;
  country: string;
  description: string;
  stepkaComment: string;
}

const MAX_PAGES = 20;
const MAX_HISTORY = 350;
const HISTORY_FILE = path.join(process.cwd(), 'data', 'digest-movie-history.json');

const COUNTRY_RU: Record<string, string> = {
  'United States of America': 'США',
  'United Kingdom': 'Великобритания',
  'France': 'Франция',
  'Germany': 'Германия',
  'Australia': 'Австралия',
  'Japan': 'Япония',
  'Italy': 'Италия',
  'Canada': 'Канада',
  'Spain': 'Испания',
  'Russia': 'Россия',
  'Soviet Union': 'СССР',
  'China': 'Китай',
  'India': 'Индия',
  'South Korea': 'Южная Корея',
  'Sweden': 'Швеция',
  'Denmark': 'Дания',
  'Poland': 'Польша',
  'Czech Republic': 'Чехия',
};

async function loadHistory(): Promise<number[]> {
  try {
    return JSON.parse(await readFile(HISTORY_FILE, 'utf-8')) as number[];
  } catch {
    return [];
  }
}

async function saveHistory(ids: number[]): Promise<void> {
  await mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  await writeFile(HISTORY_FILE, JSON.stringify(ids.slice(-MAX_HISTORY)), 'utf-8');
}

async function generateStepkaComment(title: string, description: string): Promise<string> {
  const result = await gptunnelChat([
    {
      role: 'system',
      content:
        'Ты — кот Стёпка: чёрный с белыми лапками, живёшь на 16 этаже в Челябинске. ' +
        'Ленивый, ироничный, любишь тунец и мамулю, не переносишь попугая Твитти. ' +
        'Напиши 1-2 предложения — саркастичный или трогательный комментарий к фильму от кота. ' +
        'Можно упомянуть мамулю, тунец, Твитти или 16 этаж. Только текст, без кавычек и подписи.',
    },
    { role: 'user', content: `Фильм: ${title}\n${description}` },
  ]);
  return result.trim();
}

async function fetchFromTmdb(): Promise<DigestMovie | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const history = await loadHistory();
  const pages = Array.from({ length: MAX_PAGES }, (_, i) => i + 1).sort(() => Math.random() - 0.5);

  for (const page of pages.slice(0, 6)) {
    try {
      const url =
        `https://api.themoviedb.org/3/discover/movie` +
        `?api_key=${apiKey}` +
        `&language=ru-RU` +
        `&sort_by=vote_count.desc` +
        `&vote_count.gte=1000` +
        `&page=${page}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = (await res.json()) as { results: any[] };
      const candidates = data.results.filter(
        (m: any) => !history.includes(m.id) && m.overview?.trim() && m.title,
      );
      if (!candidates.length) continue;

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const year = parseInt(picked.release_date?.split('-')[0] ?? '0');

      const [detailsResult, commentResult] = await Promise.allSettled([
        fetch(
          `https://api.themoviedb.org/3/movie/${picked.id}?api_key=${apiKey}&language=ru-RU`,
          { signal: AbortSignal.timeout(6000) },
        ).then((r) => (r.ok ? (r.json() as Promise<any>) : null)),
        generateStepkaComment(picked.title, picked.overview),
      ]);

      let country = '';
      if (detailsResult.status === 'fulfilled' && detailsResult.value) {
        const countries: string[] = (detailsResult.value.production_countries ?? [])
          .slice(0, 2)
          .map((c: any) => COUNTRY_RU[c.name] ?? c.name);
        if (countries.length) country = countries.join(' / ');
      }

      await saveHistory([...history, picked.id]);

      return {
        title: picked.title,
        year,
        country,
        description: picked.overview,
        stepkaComment: commentResult.status === 'fulfilled' ? commentResult.value : '',
      };
    } catch {
      continue;
    }
  }

  await saveHistory([]);
  return null;
}

async function fetchFromAI(): Promise<DigestMovie | null> {
  try {
    const raw = await gptunnelChat([
      {
        role: 'system',
        content:
          'Ты — кот Стёпка (ироничный, ленивый, живёт в Челябинске на 16 этаже, любит тунец и мамулю). ' +
          'Выбери РЕАЛЬНО СУЩЕСТВУЮЩИЙ известный фильм (любого жанра). ' +
          'Верни строго JSON без markdown-блоков:\n' +
          '{"title":"название","year":2010,"country":"США","description":"2-3 предложения на русском","stepkaComment":"комментарий кота 1-2 предложения"}',
      },
      { role: 'user', content: 'Фильм дня!' },
    ]);
    const cleaned = raw.trim().replace(/^```[a-z]*\n?/m, '').replace(/```$/m, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as DigestMovie;
    if (!parsed.title || !parsed.description) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchMovieOfDay(): Promise<string> {
  const movie = (await fetchFromTmdb()) ?? (await fetchFromAI());

  if (!movie) {
    return '🎬 <b>Фильм дня:</b> не удалось загрузить, попробуем завтра!';
  }

  const meta = [movie.year, movie.country].filter(Boolean).join(', ');
  const comment = movie.stepkaComment ? `\n💬 <i>${movie.stepkaComment}</i>` : '';

  return (
    `🎬 <b>Фильм дня:</b>\n` +
    `<b>${movie.title}</b>${meta ? ` (${meta})` : ''}\n\n` +
    `${movie.description}${comment}`
  );
}
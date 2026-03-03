// Dynamic animal movie source:
// Primary:  TMDB API (themoviedb.org) — needs TMDB_API_KEY in .env
//           History tracked in data/movie-history.json to avoid repeats (~400 movies before cycling)
// Fallback: AI (GPTunnel) generates a post about a real animal movie

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

export interface AnimalMovie {
  title: string;
  year: number;
  country: string;
  description: string;
  stepkaComment?: string;
}

// TMDB animal-related keyword IDs joined with | (OR logic)
// 9799=animals, 1697=dog, 14158=cat, 2641=horse, 4290=bear
const ANIMAL_KEYWORDS = '9799|1697|14158|2641|4290';
const MAX_PAGES = 20;       // pages 1–20, ~20 movies each → ~400 unique movies
const MAX_HISTORY = 350;    // remember last 350 IDs before cycling

const HISTORY_FILE = path.join(process.cwd(), 'data', 'movie-history.json');

// TMDB English country name → Russian
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
  'New Zealand': 'Новая Зеландия',
  'South Africa': 'ЮАР',
  'Brazil': 'Бразилия',
  'Mexico': 'Мексика',
  'Argentina': 'Аргентина',
  'Sweden': 'Швеция',
  'Norway': 'Норвегия',
  'Denmark': 'Дания',
  'Netherlands': 'Нидерланды',
  'Belgium': 'Бельгия',
  'Switzerland': 'Швейцария',
  'Austria': 'Австрия',
  'Poland': 'Польша',
  'Czech Republic': 'Чехия',
  'Ireland': 'Ирландия',
  'South Korea': 'Южная Корея',
  'Hong Kong': 'Гонконг',
  'Taiwan': 'Тайвань',
  'Thailand': 'Таиланд',
  'Indonesia': 'Индонезия',
  'Finland': 'Финляндия',
  'Portugal': 'Португалия',
  'Turkey': 'Турция',
};

// ─── History helpers ──────────────────────────────────────────────────────────

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

// ─── AI helpers ───────────────────────────────────────────────────────────────

async function generateStepkaComment(title: string, description: string): Promise<string> {
  const { gptunnelChat } = await import('@/ai/gptunnel.js');
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

// ─── TMDB source ──────────────────────────────────────────────────────────────

async function fetchFromTmdb(): Promise<AnimalMovie | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const history = await loadHistory();

  // Shuffle pages and try up to 6 of them to find an unseen movie
  const pages = Array.from({ length: MAX_PAGES }, (_, i) => i + 1).sort(() => Math.random() - 0.5);

  for (const page of pages.slice(0, 6)) {
    try {
      const discoverUrl =
        `https://api.themoviedb.org/3/discover/movie` +
        `?api_key=${apiKey}` +
        `&with_keywords=${ANIMAL_KEYWORDS}` +
        `&language=ru-RU` +
        `&sort_by=vote_count.desc` +
        `&vote_count.gte=100` +
        `&page=${page}`;

      const res = await fetch(discoverUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = (await res.json()) as { results: any[] };
      const candidates = data.results.filter(
        (m: any) => !history.includes(m.id) && m.overview?.trim() && m.title,
      );
      if (!candidates.length) continue;

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const year = parseInt(picked.release_date?.split('-')[0] ?? '0');

      // Fetch movie details (for country) + Stepka's comment in parallel
      const [detailsResult, commentResult] = await Promise.allSettled([
        fetch(
          `https://api.themoviedb.org/3/movie/${picked.id}?api_key=${apiKey}&language=ru-RU`,
          { signal: AbortSignal.timeout(6000) },
        ).then((r) => (r.ok ? (r.json() as Promise<any>) : null)),
        generateStepkaComment(picked.title, picked.overview),
      ]);

      let country = 'Неизвестно';
      if (detailsResult.status === 'fulfilled' && detailsResult.value) {
        const countries: string[] = (detailsResult.value.production_countries ?? [])
          .slice(0, 2)
          .map((c: any) => COUNTRY_RU[c.name] ?? c.name);
        if (countries.length) country = countries.join(' / ');
      }

      await saveHistory([...history, picked.id]);
      console.log(`🎬 TMDB movie: "${picked.title}" (${year}) — page ${page}`);

      return {
        title: picked.title,
        year,
        country,
        description: picked.overview,
        stepkaComment: commentResult.status === 'fulfilled' ? commentResult.value : undefined,
      };
    } catch (err) {
      console.warn(`⚠️ TMDB page ${page} failed:`, err);
      continue;
    }
  }

  // All tried pages were exhausted → reset history and signal retry
  console.warn('⚠️ Movie history is full, resetting for next run');
  await saveHistory([]);
  return null;
}

// ─── AI fallback source ───────────────────────────────────────────────────────

async function fetchFromAI(): Promise<AnimalMovie | null> {
  try {
    const { gptunnelChat } = await import('@/ai/gptunnel.js');
    const raw = await gptunnelChat([
      {
        role: 'system',
        content:
          'Ты — кот Стёпка (ироничный, ленивый, живёт в Челябинске на 16 этаже, любит тунец и мамулю). ' +
          'Выбери РЕАЛЬНО СУЩЕСТВУЮЩИЙ известный фильм про животных. ' +
          'Верни строго JSON без markdown-блоков:\n' +
          '{"title":"название фильма","year":2009,"country":"США","description":"2-3 предложения описания на русском","stepkaComment":"ироничный комментарий кота 1-2 предложения"}',
      },
      { role: 'user', content: 'Фильм про животных!' },
    ]);
    const cleaned = raw.trim().replace(/^```[a-z]*\n?/m, '').replace(/```$/m, '').trim();
    const parsed = JSON.parse(cleaned) as AnimalMovie;
    if (!parsed.title || !parsed.description) return null;
    console.log(`🤖 AI movie fallback: "${parsed.title}"`);
    return parsed;
  } catch (err) {
    console.error('❌ AI movie fallback failed:', err);
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getAnimalMoviePost(): Promise<string> {
  const movie = (await fetchFromTmdb()) ?? (await fetchFromAI());

  if (!movie) {
    return (
      '🎬 <b>Кино про животных</b>\n\n' +
      '❌ Не удалось загрузить фильм дня. Попробуем завтра!\n\n' +
      '#кинопрождивотных\n' +
      '<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>'
    );
  }

  return formatMoviePost(movie);
}

export function formatMoviePost(movie: AnimalMovie): string {
  const comment = movie.stepkaComment
    ? `\n\n💬 <i>Стёпка:</i> «${movie.stepkaComment}»`
    : '';

  return (
    `🎬 <b>Кино про животных</b>\n\n` +
    `<b>${movie.title} (${movie.year})</b>\n` +
    `🌍 ${movie.country}\n\n` +
    `${movie.description}${comment}\n\n` +
    `#кинопрождивотных #фильмдня #животные\n` +
    `<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>`
  );
}

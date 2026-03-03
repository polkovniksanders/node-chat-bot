// Dynamic YouTube video source for animal/pet content.
//
// Priority chain:
// 1. YouTube Data API v3 (needs YOUTUBE_API_KEY) — official, reliable
// 2. Invidious public API (no key, multiple instances) — open YouTube frontend
// 3. Static curated list — last resort, never repeats are not guaranteed

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

export interface YoutubeVideo {
  url: string;
  title: string;
  description: string;
}

const VIDEO_HISTORY_FILE = path.join(process.cwd(), 'data', 'video-history.json');
const MAX_HISTORY = 200;

// Search query pool — rotated randomly each day
const SEARCH_QUERIES = [
  'cute baby animals funny',
  'funny cats compilation',
  'amazing dog tricks',
  'wild animals funny moments',
  'cute otters playing',
  'baby animals first steps',
  'funny parrot talking',
  'cute puppies playing',
  'animals helping each other',
  'cat knocking things over funny',
  'dog surprised funny reaction',
  'baby ducks following humans',
  'raccoon washing food funny',
  'animals meeting babies',
  'dogs playing in water',
  'elephant herd reunion',
  'animals in snow funny',
  'goats on everything funny',
  'fox playing in leaves',
  'hedgehog eating funny',
  'cat vs cucumber compilation',
  'corgi running funny',
  'animals befriending humans',
  'seal playing with ball',
  'penguins walking funny',
];

// Public Invidious instances to try in order
const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://invidious.poast.org',
  'https://iv.datura.network',
  'https://invidious.privacyredirect.com',
];

// Static fallback list — used only when all APIs fail
const FALLBACK_VIDEOS: YoutubeVideo[] = [
  {
    url: 'https://www.youtube.com/watch?v=0Bmhjf0rKe8',
    title: 'Удивлённый котёнок',
    description: 'Один из самых известных вирусных роликов: малюсенький котёнок реагирует на щекотку самым милым способом.',
  },
  {
    url: 'https://www.youtube.com/watch?v=a1Y73sPHKxw',
    title: 'Драматический бурундук',
    description: 'Бурундук с самым драматичным взглядом в истории мемов. Классика жанра!',
  },
  {
    url: 'https://www.youtube.com/watch?v=TNHK2BrMH9U',
    title: 'Выдры держатся за лапки',
    description: 'Две выдры держатся за лапки, чтобы не уплыть друг от друга во сне.',
  },
  {
    url: 'https://www.youtube.com/watch?v=mHRUed3R1b4',
    title: 'Инженерное руководство по котам',
    description: 'Инженеры объясняют принципы работы домашних котов с инженерной точки зрения.',
  },
  {
    url: 'https://www.youtube.com/watch?v=tntOCGkgt98',
    title: 'Собаки против роботов-пылесосов',
    description: 'Домашние питомцы встречают роботов-пылесосов впервые. Реакции — от паники до полного дзена.',
  },
];

// ─── History helpers ──────────────────────────────────────────────────────────

async function loadVideoHistory(): Promise<string[]> {
  try {
    return JSON.parse(await readFile(VIDEO_HISTORY_FILE, 'utf-8')) as string[];
  } catch {
    return [];
  }
}

async function saveVideoHistory(ids: string[]): Promise<void> {
  await mkdir(path.dirname(VIDEO_HISTORY_FILE), { recursive: true });
  await writeFile(VIDEO_HISTORY_FILE, JSON.stringify(ids.slice(-MAX_HISTORY)), 'utf-8');
}

// ─── AI description ───────────────────────────────────────────────────────────

function cleanTitle(raw: string): string {
  // Remove hashtags and trim extra whitespace
  return raw.replace(/#\S+/g, '').replace(/\s{2,}/g, ' ').trim();
}

async function processTitle(raw: string): Promise<string> {
  const cleaned = cleanTitle(raw);
  // If looks non-Russian (no Cyrillic) — translate
  if (/[а-яёА-ЯЁ]/.test(cleaned)) return cleaned;
  try {
    const { gptunnelChat } = await import('@/ai/gptunnel.js');
    const result = await gptunnelChat([
      {
        role: 'system',
        content: 'Переведи название видео на русский язык. Верни только перевод, без кавычек и пояснений.',
      },
      { role: 'user', content: cleaned },
    ]);
    return result.trim() || cleaned;
  } catch {
    return cleaned;
  }
}

async function generateDescription(title: string, rawSnippet: string): Promise<string> {
  try {
    const { gptunnelChat } = await import('@/ai/gptunnel.js');
    const result = await gptunnelChat([
      {
        role: 'system',
        content:
          'По названию и краткому описанию YouTube-видео напиши 2 предложения по-русски — ' +
          'живо, тепло, с лёгким юмором. Без спойлеров, без ссылок, только суть и эмоция. ' +
          'Верни только текст описания.',
      },
      {
        role: 'user',
        content: `Название: ${title}\nОписание: ${rawSnippet.slice(0, 300)}`,
      },
    ]);
    return result.trim();
  } catch {
    return rawSnippet.slice(0, 200).trim() || title;
  }
}

// ─── YouTube Data API v3 ──────────────────────────────────────────────────────

async function fetchFromYoutubeAPI(
  query: string,
  history: string[],
): Promise<YoutubeVideo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      videoDuration: 'short',   // under 4 min — better for Telegram previews
      videoEmbeddable: 'true',
      safeSearch: 'strict',
      maxResults: '25',
      key: apiKey,
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`⚠️ YouTube API error: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      items: Array<{
        id: { videoId: string };
        snippet: { title: string; description: string };
      }>;
    };

    const candidates = (data.items ?? []).filter(
      (item) => item.id?.videoId && !history.includes(item.id.videoId),
    );
    if (!candidates.length) return null;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    const videoId = picked.id.videoId;
    const [title, description] = await Promise.all([
      processTitle(picked.snippet.title),
      generateDescription(picked.snippet.title, picked.snippet.description),
    ]);

    await saveVideoHistory([...history, videoId]);
    console.log(`📺 YouTube API: "${title}" (${videoId})`);

    return { url: `https://www.youtube.com/watch?v=${videoId}`, title, description };
  } catch (err) {
    console.warn('⚠️ YouTube API fetch failed:', err);
    return null;
  }
}

// ─── Invidious API (no key required) ─────────────────────────────────────────

async function fetchFromInvidious(
  query: string,
  history: string[],
): Promise<YoutubeVideo | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const params = new URLSearchParams({
        q: query,
        type: 'video',
        duration: 'short',
        sort_by: 'relevance',
      });

      const res = await fetch(`${instance}/api/v1/search?${params}`, {
        signal: AbortSignal.timeout(7000),
        headers: { 'User-Agent': 'TelegramBot/1.0' },
      });
      if (!res.ok) continue;

      const videos = (await res.json()) as Array<any>;
      const candidates = videos.filter(
        (v: any) => v.type === 'video' && v.videoId && !history.includes(v.videoId),
      );
      if (!candidates.length) continue;

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const rawDesc = picked.description ?? picked.descriptionHtml ?? '';
      const [title, description] = await Promise.all([
        processTitle(picked.title),
        generateDescription(picked.title, rawDesc),
      ]);

      await saveVideoHistory([...history, picked.videoId]);
      console.log(`📺 Invidious (${instance}): "${title}" (${picked.videoId})`);

      return { url: `https://www.youtube.com/watch?v=${picked.videoId}`, title, description };
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getYoutubeVideoPost(): Promise<string> {
  const history = await loadVideoHistory();
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  const video =
    (await fetchFromYoutubeAPI(query, history)) ??
    (await fetchFromInvidious(query, history)) ??
    FALLBACK_VIDEOS.find((v) => {
      const id = new URL(v.url).searchParams.get('v') ?? '';
      return !history.includes(id);
    }) ??
    FALLBACK_VIDEOS[Math.floor(Math.random() * FALLBACK_VIDEOS.length)];

  return formatVideoPost(video);
}

export function formatVideoPost(video: YoutubeVideo): string {
  return (
    `🎥 <b>Видео дня</b>\n\n` +
    `<b>${video.title}</b>\n\n` +
    `${video.description}\n\n` +
    `${video.url}\n\n` +
    `#видеодня #животные #смешноевидео\n` +
    `<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>`
  );
}

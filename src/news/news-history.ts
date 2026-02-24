import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'news-history.json');
const MAX_ENTRIES = 14;

export type NewsParams = {
  location: string;
  time: string;
  event: string;
  emotion: string;
};

export type HistoryEntry = {
  date: string;
  news: NewsParams;
};

type HistoryData = {
  entries: HistoryEntry[];
};

const LOCATIONS = [
  'кухня',
  'гостиная',
  'подоконник',
  'коридор',
  'ванная',
  'спальня',
  'балкон',
  'у миски',
  'у когтеточки',
  'прихожая',
];

const TIMES = ['утром', 'днём', 'вечером', 'ночью'];

const EVENTS = [
  'миска с кормом',
  'пылесос',
  'стиралка',
  'чайник',
  'шторы',
  'плед',
  'диван',
  'когтеточка',
  'мячик',
  'Твитти устроил переполох',
  'мамочка болтает по телефону',
  'гости',
  'сквозняк из форточки',
  'зарядное устройство',
  'пакет из магазина',
  'зонтик у двери',
  'запах еды',
  'звонок в дверь',
];

const EMOTIONS = [
  'ирония',
  'ворчание',
  'самодовольство',
  'недовольство',
  'сонливость',
  'испуг',
  'снисхождение',
  'ревность',
  'голод',
];

function pickRandom<T>(arr: T[], exclude: T[] = []): T {
  const filtered = arr.filter((x) => !exclude.includes(x));
  const pool = filtered.length > 0 ? filtered : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateRandomParams(history: HistoryEntry[]): NewsParams {
  // Collect recently used values to de-prioritize them
  const recentLocations = history.slice(-7).map((e) => e.news.location);
  const recentEvents = history.slice(-7).map((e) => e.news.event);

  const freshLocations = LOCATIONS.filter((l) => !recentLocations.includes(l));
  const freshEvents = EVENTS.filter((e) => !recentEvents.includes(e));

  // Prefer fresh values; fall back to full pool if pool is exhausted
  const locPool = freshLocations.length >= 1 ? freshLocations : LOCATIONS;
  const eventPool = freshEvents.length >= 1 ? freshEvents : EVENTS;

  return {
    location: pickRandom(locPool),
    time: pickRandom(TIMES),
    event: pickRandom(eventPool),
    emotion: pickRandom(EMOTIONS),
  };
}

async function readHistory(): Promise<HistoryData> {
  try {
    const content = await readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(content) as HistoryData;
  } catch {
    return { entries: [] };
  }
}

async function writeHistory(data: HistoryData): Promise<void> {
  const dir = path.dirname(HISTORY_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getRecentHistory(): Promise<HistoryEntry[]> {
  const data = await readHistory();
  return data.entries.slice(-MAX_ENTRIES);
}

export async function saveNewsEntry(entry: HistoryEntry): Promise<void> {
  const data = await readHistory();
  data.entries.push(entry);
  data.entries = data.entries.slice(-MAX_ENTRIES);
  await writeHistory(data);
}

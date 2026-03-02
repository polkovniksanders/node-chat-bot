import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'data', 'cycle-state.json');

interface CycleState {
  day: number; // 1–5
  movieIndex: number;
  videoIndex: number;
}

const DEFAULT_STATE: CycleState = { day: 1, movieIndex: 0, videoIndex: 0 };

async function readState(): Promise<CycleState> {
  try {
    const content = await readFile(STATE_FILE, 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(content) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeState(state: CycleState): Promise<void> {
  const dir = path.dirname(STATE_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Возвращает текущий день цикла + индексы, затем сдвигает состояние вперёд.
 */
export async function consumeCurrentDay(
  movieListLength: number,
  videoListLength: number,
): Promise<{ day: number; movieIndex: number; videoIndex: number }> {
  const state = await readState();
  const { day, movieIndex, videoIndex } = state;

  const nextDay = (day % 5) + 1;
  const nextMovieIndex = day === 2 ? (movieIndex + 1) % movieListLength : movieIndex;
  const nextVideoIndex = day === 3 ? (videoIndex + 1) % videoListLength : videoIndex;

  await writeState({ day: nextDay, movieIndex: nextMovieIndex, videoIndex: nextVideoIndex });
  return { day, movieIndex, videoIndex };
}

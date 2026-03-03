import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'data', 'cycle-state.json');

interface CycleState {
  day: number; // 1–5
}

const DEFAULT_STATE: CycleState = { day: 1 };

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
 * Returns the current cycle day, then advances to the next.
 * Movie and video history are tracked separately in data/movie-history.json
 * and data/video-history.json.
 */
export async function consumeCurrentDay(): Promise<{ day: number }> {
  const state = await readState();
  const { day } = state;
  await writeState({ day: (day % 5) + 1 });
  return { day };
}

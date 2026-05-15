import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'data', 'cycle-state.json');
const STATE_TMP = STATE_FILE + '.tmp';

interface CycleState {
  day: number; // 1–5
}

const DEFAULT_STATE: CycleState = { day: 1 };

async function readState(): Promise<CycleState> {
  try {
    const content = await readFile(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(content) as Partial<CycleState>;
    const day = parsed.day;
    if (typeof day !== 'number' || day < 1 || day > 5) return { ...DEFAULT_STATE };
    return { day };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeState(state: CycleState): Promise<void> {
  const dir = path.dirname(STATE_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(STATE_TMP, JSON.stringify(state, null, 2), 'utf-8');
  await rename(STATE_TMP, STATE_FILE);
}

/** Returns the current cycle day (1–5) without advancing it. */
export async function readCurrentDay(): Promise<number> {
  return (await readState()).day;
}

/** Advances the cycle to the next day. Call only after successful post. */
export async function advanceDay(): Promise<void> {
  const state = await readState();
  await writeState({ day: (state.day % 5) + 1 });
}

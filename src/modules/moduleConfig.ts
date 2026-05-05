import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '@/utils/logger.js';

export type ModuleName =
  | 'daily-cycle'
  | 'daily-events'
  | 'sora-videos'
  | 'ai-chat'
  | 'voice-transcription'
  | 'image-generation'
  | 'weather'
  | 'secret-whisper'
  | 'events-manual'
  | 'emoji-reactions'
  | 'user-memory'
  | 'sora-admin'
  | 'say-admin';

type ModuleConfig = Record<string, Partial<Record<ModuleName, boolean>>>;

const CONFIG_FILE = path.join(process.cwd(), 'data', 'module-config.json');
const CONFIG_TMP = CONFIG_FILE + '.tmp';

let config: ModuleConfig = {};
let writeQueue: Promise<void> = Promise.resolve();

async function loadConfig(): Promise<void> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    config = JSON.parse(content);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      logger.warn('module-config.json повреждён или нечитаем, используем пустой конфиг', {
        err: String(err),
      });
    }
    config = {};
  }
}

// Load at module init (top-level await in ESM)
await loadConfig();

async function persistConfig(): Promise<void> {
  const dir = path.dirname(CONFIG_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(CONFIG_TMP, JSON.stringify(config, null, 2), 'utf-8');
  await rename(CONFIG_TMP, CONFIG_FILE);
}

export function isEnabled(chatId: string | number, module: ModuleName): boolean {
  const key = String(chatId);
  const chatConfig = config[key];
  if (!chatConfig) return true;
  const val = chatConfig[module];
  return val === undefined ? true : val;
}

export async function setEnabled(
  chatId: string | number,
  module: ModuleName,
  enabled: boolean,
): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const key = String(chatId);
    if (!config[key]) config[key] = {};
    if (enabled) {
      // Remove override — default is enabled, so removing the key is cleaner
      delete config[key][module];
      if (Object.keys(config[key]).length === 0) delete config[key];
    } else {
      config[key][module] = false;
    }
    await persistConfig();
  });
  await writeQueue;
}

export function getStatus(chatId: string | number): Record<ModuleName, { enabled: boolean; isDefault: boolean }> {
  const key = String(chatId);
  const chatConfig = config[key] ?? {};
  const ALL_MODULES: ModuleName[] = [
    'daily-cycle', 'daily-events', 'sora-videos',
    'ai-chat', 'voice-transcription', 'image-generation', 'weather',
    'secret-whisper', 'events-manual', 'emoji-reactions', 'user-memory',
    'sora-admin', 'say-admin',
  ];
  const result = {} as Record<ModuleName, { enabled: boolean; isDefault: boolean }>;
  for (const m of ALL_MODULES) {
    const override = chatConfig[m];
    result[m] = {
      enabled: override === undefined ? true : override,
      isDefault: override === undefined,
    };
  }
  return result;
}

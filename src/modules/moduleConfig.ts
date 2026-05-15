import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '@/utils/logger.js';
import { MODULES, MODULE_NAMES, type ModuleName } from '@/modules/moduleRegistry.js';

// Re-export for consumers that imported ModuleName from here
export type { ModuleName };

interface ModuleConfigV2 {
  _migrated: 'v2';
  /** Per-chat overrides for input/admin modules. Absence = enabled (default true). */
  chatModules: Record<string, Partial<Record<ModuleName, boolean>>>;
  /** List of chatIds that each cron module posts to. Absence = empty (no posts). */
  cronChats: Partial<Record<string, string[]>>;
}

type RawConfig = Record<string, unknown>;

const CONFIG_FILE = path.join(process.cwd(), 'data', 'module-config.json');
const CONFIG_TMP = CONFIG_FILE + '.tmp';

let config: ModuleConfigV2 = { _migrated: 'v2', chatModules: {}, cronChats: {} };
let writeQueue: Promise<void> = Promise.resolve();

// ─── chatId normalization ───────────────────────────────────────────────────

/** Normalize a chatId to numeric string. Falls back to raw value if API unavailable. */
async function normalizeChatId(id: string): Promise<string> {
  if (/^-?\d+$/.test(id)) return id;
  // Lazy import to avoid circular dep at module load time
  try {
    const { bot } = await import('@/botInstance.js');
    const chat = await bot.api.getChat(id);
    return String(chat.id);
  } catch {
    logger.warn(`[config] Cannot normalize chatId "${id}" via Telegram API, storing as-is`);
    return id;
  }
}

// ─── Migration ──────────────────────────────────────────────────────────────

async function migrateConfig(raw: RawConfig): Promise<ModuleConfigV2> {
  if (raw._migrated === 'v2') return raw as unknown as ModuleConfigV2;

  // Step 1: preserve existing per-chat overrides from old flat format
  // Old format: { "-1001234567890": { "weather": false }, ... }
  const chatModules: Record<string, Partial<Record<ModuleName, boolean>>> = {};
  const knownKeys = new Set(['_migrated', 'chatModules', 'cronChats']);
  const moduleNameSet = new Set<string>(MODULE_NAMES);

  for (const [key, value] of Object.entries(raw)) {
    if (knownKeys.has(key)) continue;
    // Old flat keys are chatId strings (numeric or @username)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Filter to only known module names to avoid polluting new schema
      const filtered: Partial<Record<ModuleName, boolean>> = {};
      for (const [mod, enabled] of Object.entries(value as Record<string, unknown>)) {
        if (moduleNameSet.has(mod) && typeof enabled === 'boolean') {
          filtered[mod as ModuleName] = enabled;
        }
      }
      if (Object.keys(filtered).length > 0) {
        chatModules[key] = filtered;
      }
    }
  }

  // Step 2: populate cronChats from ENV (with normalization)
  const cronChats: Partial<Record<string, string[]>> = {};
  if (process.env.CHANNEL_ID) {
    const id = await normalizeChatId(process.env.CHANNEL_ID);
    cronChats['daily-cycle'] = [id];
    cronChats['sora-videos'] = [id];
  }
  if (process.env.EVENTS_CHANNEL_ID) {
    const id = await normalizeChatId(process.env.EVENTS_CHANNEL_ID);
    cronChats['daily-events'] = [id];
  }

  const migrated: ModuleConfigV2 = {
    _migrated: 'v2',
    chatModules: Object.keys(chatModules).length > 0 ? chatModules : ((raw.chatModules as ModuleConfigV2['chatModules']) ?? {}),
    cronChats: (raw.cronChats as ModuleConfigV2['cronChats']) ?? cronChats,
  };

  if (process.env.CHANNEL_ID || process.env.EVENTS_CHANNEL_ID) {
    logger.warn('[config] Migrated to v2. CHANNEL_ID and EVENTS_CHANNEL_ID are no longer required — consider removing them from .env');
  }

  return migrated;
}

// ─── Schema validation ───────────────────────────────────────────────────────

function isValidCronChats(cronChats: unknown): boolean {
  if (typeof cronChats !== 'object' || cronChats === null) return false;
  for (const [, ids] of Object.entries(cronChats as Record<string, unknown>)) {
    if (!Array.isArray(ids)) return false;
    for (const id of ids) {
      if (typeof id !== 'string') return false;
      // Allow numeric IDs and @usernames (legacy from migration before normalization)
      if (!/^-?\d+$/.test(id) && !id.startsWith('@')) return false;
    }
  }
  return true;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

async function persistConfig(): Promise<void> {
  const dir = path.dirname(CONFIG_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(CONFIG_TMP, JSON.stringify(config, null, 2), 'utf-8');
  await rename(CONFIG_TMP, CONFIG_FILE);
}

async function enqueue(fn: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(fn).catch((err) => {
    logger.error('[config] Write queue error:', err);
  });
  await writeQueue;
}

async function loadConfig(): Promise<void> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    const raw: RawConfig = JSON.parse(content);

    if (!isValidCronChats(raw.cronChats ?? {})) {
      logger.warn('[config] cronChats in module-config.json has invalid format, resetting cronChats');
      raw.cronChats = {};
    }

    config = await migrateConfig(raw);

    // If migration changed anything (new _migrated key or populated cronChats), persist
    if (raw._migrated !== 'v2') {
      await persistConfig();
      logger.info('[config] module-config.json migrated to v2 format');
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      logger.warn('[config] module-config.json corrupted or unreadable, using empty config', {
        err: String(err),
      });
    }
    config = { _migrated: 'v2', chatModules: {}, cronChats: {} };
  }
}

// Load at module init (top-level await in ESM)
await loadConfig();

// ─── Public API ──────────────────────────────────────────────────────────────

/** Check if an input/admin module is enabled for a given chat. Defaults to true. */
export function isEnabled(chatId: string | number, module: ModuleName): boolean {
  const key = String(chatId);
  const chatConfig = config.chatModules[key];
  if (!chatConfig) return true;
  const val = chatConfig[module];
  return val === undefined ? true : val;
}

/** Get list of chatIds that a cron module should post to. */
export function getCronChatIds(module: ModuleName): string[] {
  return config.cronChats[module] ?? [];
}

/** Add a chatId to a cron module's target list. chatId should be numeric string. */
export async function enableCronModule(chatId: string, module: ModuleName): Promise<void> {
  await enqueue(async () => {
    const chatIds = config.cronChats[module] ?? [];
    if (!chatIds.includes(chatId)) {
      config.cronChats[module] = [...chatIds, chatId];
      await persistConfig();
    }
  });
}

/** Remove a chatId from a cron module's target list. */
export async function disableCronModule(chatId: string, module: ModuleName): Promise<void> {
  await enqueue(async () => {
    const chatIds = config.cronChats[module] ?? [];
    const updated = chatIds.filter((id) => id !== chatId);
    if (updated.length !== chatIds.length) {
      config.cronChats[module] = updated;
      await persistConfig();
    }
  });
}

/** Enable or disable an input/admin module for a given chat. */
export async function setInputModule(
  chatId: string,
  module: ModuleName,
  enabled: boolean,
): Promise<void> {
  await enqueue(async () => {
    const key = chatId;
    if (!config.chatModules[key]) config.chatModules[key] = {};
    if (enabled) {
      delete config.chatModules[key][module];
      if (Object.keys(config.chatModules[key]).length === 0) delete config.chatModules[key];
    } else {
      config.chatModules[key][module] = false;
    }
    await persistConfig();
  });
}

/** Legacy alias kept for backwards compatibility with existing callers. */
export async function setEnabled(
  chatId: string | number,
  module: ModuleName,
  enabled: boolean,
): Promise<void> {
  await setInputModule(String(chatId), module, enabled);
}

/** Get status of all modules for a given chat. */
export function getStatus(chatId: string | number): Record<ModuleName, { enabled: boolean; isDefault: boolean; isCronModule: boolean }> {
  const key = String(chatId);
  const chatConfig = config.chatModules[key] ?? {};
  const result = {} as Record<ModuleName, { enabled: boolean; isDefault: boolean; isCronModule: boolean }>;

  for (const def of MODULES) {
    const isCron = def.class === 'cron';
    if (isCron) {
      const inList = (config.cronChats[def.name] ?? []).includes(key);
      result[def.name] = { enabled: inList, isDefault: false, isCronModule: true };
    } else {
      const override = chatConfig[def.name];
      result[def.name] = {
        enabled: override === undefined ? true : override,
        isDefault: override === undefined,
        isCronModule: false,
      };
    }
  }
  return result;
}

/** Normalize a chatId string before storing (exposed for use in command handlers). */
export { normalizeChatId };

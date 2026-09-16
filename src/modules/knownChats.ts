import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '@/utils/logger.js';

const KNOWN_CHATS_FILE = path.join(process.cwd(), 'data', 'known-chats.json');
const KNOWN_CHATS_TMP = KNOWN_CHATS_FILE + '.tmp';

interface KnownChat {
  id: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  firstSeen: number;
  lastSeen: number;
}

let knownChats: Map<string, KnownChat> = new Map();
let writeQueue: Promise<void> = Promise.resolve();

async function loadKnownChats(): Promise<void> {
  try {
    const content = await readFile(KNOWN_CHATS_FILE, 'utf-8');
    const arr: KnownChat[] = JSON.parse(content);
    knownChats = new Map(arr.map((c) => [c.id, c]));
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      logger.warn('known-chats.json повреждён или нечитаем, начинаем с пустого', {
        err: String(err),
      });
    }
    knownChats = new Map();
  }
}

async function persistKnownChats(): Promise<void> {
  const dir = path.dirname(KNOWN_CHATS_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const arr = Array.from(knownChats.values());
  await writeFile(KNOWN_CHATS_TMP, JSON.stringify(arr, null, 2), 'utf-8');
  await rename(KNOWN_CHATS_TMP, KNOWN_CHATS_FILE);
}

await loadKnownChats();

/**
 * Регистрирует чат как известный. Вызывать при получении любого апдейта.
 */
export function registerChat(chat: {
  id: number | string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}): void {
  const id = String(chat.id);
  const now = Date.now();
  const existing = knownChats.get(id);
  if (existing) {
    existing.lastSeen = now;
    if (chat.title) existing.title = chat.title;
    if (chat.username) existing.username = chat.username;
  } else {
    knownChats.set(id, {
      id,
      type: chat.type,
      title: chat.title,
      username: chat.username,
      firstSeen: now,
      lastSeen: now,
    });
  }
  // Debounced write
  writeQueue = writeQueue.then(async () => {
    await persistKnownChats();
  });
}

/**
 * Возвращает список известных чатов, отсортированный по последнему посещению (свежие первыми).
 */
export function getKnownChats(): KnownChat[] {
  return Array.from(knownChats.values()).sort((a, b) => b.lastSeen - a.lastSeen);
}

/**
 * Возвращает красивое имя для отображения в UI.
 */
export function formatChatLabel(chat: KnownChat): string {
  if (chat.title) return `${chat.title} (${chat.id})`;
  if (chat.username) return `@${chat.username} (${chat.id})`;
  return chat.id;
}
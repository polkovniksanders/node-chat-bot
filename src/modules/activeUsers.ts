import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { REGISTERED_USERS, type RegisteredUser } from '@/config/users.js';
import { logger } from '@/utils/logger.js';

const ACTIVE_USERS_FILE = path.join(process.cwd(), 'data', 'active-users.json');
const ACTIVE_USERS_TMP = ACTIVE_USERS_FILE + '.tmp';
const DAY_MS = 24 * 60 * 60 * 1000;

interface ActiveUsersFile {
  [chatId: string]: Record<string, number>;
}

let activeUsers: ActiveUsersFile = {};
let writeQueue: Promise<void> = Promise.resolve();

async function loadActiveUsers(): Promise<void> {
  try {
    const content = await readFile(ACTIVE_USERS_FILE, 'utf-8');
    const data = JSON.parse(content) as ActiveUsersFile;
    activeUsers = typeof data === 'object' && data ? data : {};
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      logger.warn('active-users.json повреждён или нечитаем, начинаем с пустого', {
        err: String(err),
      });
    }
    activeUsers = {};
  }
}

async function persistActiveUsers(): Promise<void> {
  const dir = path.dirname(ACTIVE_USERS_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(ACTIVE_USERS_TMP, JSON.stringify(activeUsers, null, 2), 'utf-8');
  await rename(ACTIVE_USERS_TMP, ACTIVE_USERS_FILE);
}

await loadActiveUsers();

export function registerActiveUser(
  chatId: number | string,
  userId: number,
  lastSeen: number = Date.now(),
): void {
  const chatKey = String(chatId);
  if (!activeUsers[chatKey]) activeUsers[chatKey] = {};
  activeUsers[chatKey][String(userId)] = lastSeen;

  writeQueue = writeQueue.then(async () => {
    await persistActiveUsers();
  });
}

export function getActiveRegisteredUsers(
  chatId: number | string,
  days = 7,
  now: number = Date.now(),
): RegisteredUser[] {
  const chatKey = String(chatId);
  const cutoff = now - days * DAY_MS;
  const chatUsers = activeUsers[chatKey] ?? {};

  return REGISTERED_USERS.filter((user) => {
    const lastSeen = chatUsers[String(user.id)];
    return typeof lastSeen === 'number' && lastSeen >= cutoff;
  });
}

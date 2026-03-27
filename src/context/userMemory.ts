import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface UserMemoryFile {
  userId: number;
  memories: string[];
  lastUpdated: string;
}

const MAX_MEMORIES = 50;

function memoryDir(): string {
  return join(process.cwd(), 'data', 'user-memory');
}

function memoryPath(userId: number): string {
  return join(memoryDir(), `${userId}.json`);
}

export async function loadUserMemory(userId: number): Promise<string[]> {
  try {
    const raw = await readFile(memoryPath(userId), 'utf-8');
    const data = JSON.parse(raw) as UserMemoryFile;
    return Array.isArray(data.memories) ? data.memories : [];
  } catch {
    return [];
  }
}

export async function saveUserMemory(userId: number, fact: string): Promise<void> {
  const existing = await loadUserMemory(userId);
  const memories = [...existing, fact].slice(-MAX_MEMORIES);
  const data: UserMemoryFile = {
    userId,
    memories,
    lastUpdated: new Date().toISOString(),
  };
  await mkdir(memoryDir(), { recursive: true });
  await writeFile(memoryPath(userId), JSON.stringify(data, null, 2), 'utf-8');
}

export function formatMemoriesForPrompt(memories: string[]): string {
  if (memories.length === 0) return '';
  return '## Личная память пользователя\n' + memories.map((m) => `- ${m}`).join('\n');
}

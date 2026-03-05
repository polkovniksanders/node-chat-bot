import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const QUEUE_FILE = path.join(process.cwd(), 'data', 'sora-queue.json');

export interface SoraQueueItem {
  id: string;
  fileId: string;
  fileUniqueId: string;
  description: string;
  addedAt: string;
}

interface SoraQueueData {
  queue: SoraQueueItem[];
  posted: string[]; // file_unique_ids already published
}

const DEFAULT_DATA: SoraQueueData = { queue: [], posted: [] };

async function readData(): Promise<SoraQueueData> {
  try {
    const content = await readFile(QUEUE_FILE, 'utf-8');
    return { ...DEFAULT_DATA, ...JSON.parse(content) };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

async function writeData(data: SoraQueueData): Promise<void> {
  const dir = path.dirname(QUEUE_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(QUEUE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function isAlreadyPosted(fileUniqueId: string): Promise<boolean> {
  const data = await readData();
  return data.posted.includes(fileUniqueId);
}

export async function isAlreadyInQueue(fileUniqueId: string): Promise<boolean> {
  const data = await readData();
  return data.queue.some((q) => q.fileUniqueId === fileUniqueId);
}

export async function addToQueue(item: Omit<SoraQueueItem, 'addedAt'>): Promise<number> {
  const data = await readData();
  data.queue.push({ ...item, addedAt: new Date().toISOString() });
  await writeData(data);
  return data.queue.length;
}

export async function getNextFromQueue(): Promise<SoraQueueItem | null> {
  const data = await readData();
  return data.queue[0] ?? null;
}

export async function markAsPosted(fileUniqueId: string): Promise<void> {
  const data = await readData();
  data.queue = data.queue.filter((item) => item.fileUniqueId !== fileUniqueId);
  if (!data.posted.includes(fileUniqueId)) {
    data.posted.push(fileUniqueId);
  }
  await writeData(data);
}

export async function getQueueLength(): Promise<number> {
  const data = await readData();
  return data.queue.length;
}

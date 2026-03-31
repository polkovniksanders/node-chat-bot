import { ChatMsg } from '@/types';

const contexts = new Map<string, ChatMsg[]>();

function contextKey(chatId: number | string, userId: number): string {
  return `${chatId}:${userId}`;
}

export function pushToContext(
  chatId: number | string,
  userId: number,
  role: ChatMsg['role'],
  content: string,
  reasoning_details?: unknown,
) {
  const key = contextKey(chatId, userId);
  const arr = contexts.get(key) ?? [];
  arr.push({ role, content, reasoning_details });
  contexts.set(key, arr.slice(-12));
}

export function getUserContext(chatId: number | string, userId: number): ChatMsg[] {
  return contexts.get(contextKey(chatId, userId)) ?? [];
}

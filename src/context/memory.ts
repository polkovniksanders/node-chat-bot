import { ChatMsg } from '@/types';

const contexts = new Map<number, ChatMsg[]>();

export function pushToContext(
  userId: number,
  role: ChatMsg['role'],
  content: string,
  reasoning_details?: unknown,
) {
  const arr = contexts.get(userId) ?? [];
  arr.push({ role, content, reasoning_details });
  contexts.set(userId, arr.slice(-12));
}

export function getUserContext(userId: number): ChatMsg[] {
  return contexts.get(userId) ?? [];
}

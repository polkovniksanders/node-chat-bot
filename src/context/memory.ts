import { ChatMsg } from '@/types';

const contexts = new Map<string, ChatMsg[]>();
const groupContexts = new Map<string, { messages: ChatMsg[]; lastActivityAt: number }>();
const GROUP_CONTEXT_LIMIT = 20;
const GROUP_CONTEXT_TTL_MS = 60 * 60 * 1000;

function contextKey(chatId: number | string, userId: number): string {
  return `${chatId}:${userId}`;
}

export function pushToContext(
  chatId: number | string,
  userId: number,
  role: ChatMsg['role'],
  content: string,
) {
  const key = contextKey(chatId, userId);
  const arr = contexts.get(key) ?? [];
  arr.push({ role, content });
  contexts.set(key, arr.slice(-12));
}

export function getUserContext(chatId: number | string, userId: number): ChatMsg[] {
  return contexts.get(contextKey(chatId, userId)) ?? [];
}

export function clearUserContext(chatId: number | string, userId: number): void {
  contexts.delete(contextKey(chatId, userId));
}

export function pushToGroupContext(
  chatId: number | string,
  role: ChatMsg['role'],
  content: string,
  now = Date.now(),
): void {
  const key = String(chatId);
  const messages = groupContexts.get(key)?.messages ?? [];
  messages.push({ role, content });
  groupContexts.set(key, {
    messages: messages.slice(-GROUP_CONTEXT_LIMIT),
    lastActivityAt: now,
  });
}

export function getGroupContext(chatId: number | string, now = Date.now()): ChatMsg[] {
  const key = String(chatId);
  const context = groupContexts.get(key);
  if (!context) return [];
  if (now - context.lastActivityAt > GROUP_CONTEXT_TTL_MS) {
    groupContexts.delete(key);
    return [];
  }
  return context.messages;
}

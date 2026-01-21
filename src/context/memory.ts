import { ChatMessage } from '../types';

const context = new Map<number, ChatMessage[]>();

export function getUserContext(userId: number): ChatMessage[] {
  if (!context.has(userId)) {
    context.set(userId, []);
  }
  return context.get(userId)!;
}

export function pushToContext(userId: number, role: ChatMessage['role'], content: string) {
  const history = getUserContext(userId);
  history.push({ role, content });

  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }
}

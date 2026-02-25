import { gptunnelChat } from '@/ai/gptunnel.js';
import { getUserContext, pushToContext } from '@/context/memory.js';
import { CHAT_BOT_PROMPT } from '@/config/prompts.js';

export async function generateReply(userId: number, userMessage: string): Promise<string> {
  pushToContext(userId, 'user', userMessage);

  const history = getUserContext(userId);

  const messages = [
    { role: 'system', content: CHAT_BOT_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const answer = (await gptunnelChat(messages)).trim() || 'Не понял, повтори.';
    pushToContext(userId, 'assistant', answer);
    return answer;
  } catch (err) {
    console.error('Chat error:', err);
    return 'Ошибка при обращении к модели.';
  }
}

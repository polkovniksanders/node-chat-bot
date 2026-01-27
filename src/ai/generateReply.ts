import { openrouterChat } from '@/news/openrouter-chat.js';
import { getUserContext, pushToContext } from '@/context/memory.js';
import { CHAT_BOT_PROMPT } from '@/config/prompts.js';
import { OpenRouterResponse } from '@/types';

export async function generateReply(userId: number, userMessage: string): Promise<string> {
  pushToContext(userId, 'user', userMessage);

  const history = getUserContext(userId);

  const messages = [
    { role: 'system', content: CHAT_BOT_PROMPT },
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const data = (await openrouterChat({
      model: 'tngtech/deepseek-r1t2-chimera:free',
      messages,
      reasoning: { enabled: true },
    })) as OpenRouterResponse;

    const msg = data.choices?.[0]?.message;

    let answer = '';

    if (typeof msg?.content === 'string') {
      answer = msg.content;
    } else if (Array.isArray(msg?.content)) {
      answer = msg.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }

    if (!answer.trim()) {
      answer = 'Не понял, повтори.';
    }

    pushToContext(userId, 'assistant', answer);

    return answer;
  } catch (err) {
    console.error('Chat error:', err);
    return 'Ошибка при обращении к модели.';
  }
}

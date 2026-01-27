import OpenAI from 'openai';

import { getUserContext, pushToContext } from '@/context/memory.js';
import { CHAT_BOT_PROMPT } from '@/config/prompts.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com',
});

export async function generateReply(userId: number, userMessage: string): Promise<string> {
  pushToContext(userId, 'user', userMessage);

  const history = getUserContext(userId);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: CHAT_BOT_PROMPT },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      tools: [],
    });

    const answer = response.choices[0].message.content ?? 'Не понял, повтори';

    pushToContext(userId, 'assistant', answer);

    return answer;
  } catch (err) {
    console.error('DEEPSEEK CHAT ERROR:', err);
    return 'Ошибка при обращении к модели';
  }
}

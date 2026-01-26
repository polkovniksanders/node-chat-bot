import OpenAI from 'openai';
import { getUserContext, pushToContext } from '@/context/memory.js';
import { CHAT_BOT_PROMPT } from '@/config/prompts.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateReply(userId: number, userMessage: string): Promise<string> {
  pushToContext(userId, 'user', userMessage);

  const userContext = getUserContext(userId);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: CHAT_BOT_PROMPT },
    ...userContext.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
    });

    const answer = response.choices[0]?.message?.content ?? '';

    const finalAnswer =
      answer.trim().length > 0 ? answer : 'Извини, я не понял вопрос. Попробуй переформулировать.';

    pushToContext(userId, 'assistant', finalAnswer);

    return finalAnswer;
  } catch (err) {
    console.error('OPENAI ERROR:', err);
    return 'Ошибка при обращении к модели';
  }
}

import OpenAI from 'openai';
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { getUserContext, pushToContext } from '../context/memory';
import { PROMPT } from './options';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Расширенный тип для OpenRouter-специфичных параметров
interface OpenRouterCompletionParams extends ChatCompletionCreateParamsNonStreaming {
  reasoning?: { enabled: boolean };
}

export async function generateReply(userId: number, userMessage: string): Promise<string> {
  pushToContext(userId, 'user', userMessage);
  const userContext = getUserContext(userId);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: PROMPT },
    ...userContext.map((m) => {
      const msg = {
        role: m.role,
        content: m.content,
      } as ChatCompletionMessageParam;

      // Добавляем reasoning_details через Object.assign для обхода типизации
      if (m.role === 'assistant' && m.reasoning_details) {
        return Object.assign(msg, { reasoning_details: m.reasoning_details });
      }

      return msg;
    }),
  ];

  try {
    const apiResponse = await client.chat.completions.create({
      model: 'xiaomi/mimo-v2-flash:free',
      messages,
      reasoning: { enabled: true },
      stream: false,
      // temperature: 0.2,
      // max_tokens: 512,
    } as OpenRouterCompletionParams);

    const responseMsg = apiResponse.choices[0]?.message;
    const answer = responseMsg?.content ?? '';

    // Безопасное извлечение reasoning_details через unknown
    const reasoningDetails = (responseMsg as unknown as { reasoning_details?: unknown })
      ?.reasoning_details;
    pushToContext(userId, 'assistant', answer, reasoningDetails);

    console.log('userMessage', userMessage);
    console.log('answer', answer);

    return answer;
  } catch (err) {
    console.error('OpenRouter SDK error:', err);
    return 'Ошибка при обращении к модели';
  }
}

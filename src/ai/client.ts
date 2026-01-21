import { getUserContext, pushToContext } from '../context/memory';
import { OPENROUTER_URL, PROMPT } from './options';

export async function generateReply(userId: number, userMessage: string): Promise<string> {
  pushToContext(userId, 'user', userMessage);
  console.log('userMessage', userMessage);

  const messages = getUserContext(userId);

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://yourdomain.com',
      'X-Title': 'Telegram AI Bot',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        {
          role: 'system',
          content: PROMPT,
        },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    console.error('OpenRouter error:', await response.text());
    return 'Ошибка при обращении к модели';
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content ?? '';
  pushToContext(userId, 'assistant', answer);

  console.log('userMessage', userMessage);
  console.log('answer', answer);

  return answer;
}

import { openrouterChat } from '@/news/openrouter-chat.js';
import { OpenRouterResponse } from '@/types';

export async function fetchNews(prompt: string): Promise<string> {
  try {
    const data = (await openrouterChat({
      model: 'deepseek/deepseek-r1-0528:free',
      messages: [
        { role: 'system', content: 'Ты — новостной агрегатор. Дай только факты, коротко.' },
        { role: 'user', content: prompt },
      ],
      reasoning: { enabled: true },
    })) as OpenRouterResponse;

    const msg = data.choices?.[0]?.message;

    if (typeof msg?.content === 'string') {
      return msg.content;
    }

    if (Array.isArray(msg?.content)) {
      return msg.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }

    return '';
  } catch (err) {
    console.error('NEWS ERROR:', err);
    return '';
  }
}

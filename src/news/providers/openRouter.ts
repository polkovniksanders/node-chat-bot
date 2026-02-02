import { openrouterChat } from '@/news/openrouter-chat.js';
import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

import { OpenRouterResponse } from '@/types';

export async function fetchWithOpenRouter(prompt: string): Promise<string> {
  const data = (await openrouterChat({
    model: 'deepseek/deepseek-r1-0528:free',
    messages: [
      { role: 'system', content: NEWS_GENERATION_PROMPT },
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
}

import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export async function fetchAnthropic(prompt: string): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: NEWS_GENERATION_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('ANTHROPIC ERROR:', err);
    throw new Error(err);
  }

  const data: any = await res.json();
  return data.content?.[0]?.text ?? '';
}

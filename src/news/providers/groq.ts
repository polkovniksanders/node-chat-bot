import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function fetchGroq(prompt: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: NEWS_GENERATION_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('GROQ ERROR:', err);
    throw new Error(err);
  }

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

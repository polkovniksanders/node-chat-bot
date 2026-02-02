import OpenAI from 'openai';
import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function fetchOpenAI(prompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: NEWS_GENERATION_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  return response.choices[0].message.content ?? '';
}

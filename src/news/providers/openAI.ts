import OpenAI from 'openai';
import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

export async function fetchOpenAI(prompt: string): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: NEWS_GENERATION_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  return response.choices[0].message.content ?? '';
}

import OpenAI from 'openai';
import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

const client = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN!,
});

export async function fetchHuggingFace(prompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'deepseek-ai/DeepSeek-R1:sambanova',
    messages: [
      { role: 'system', content: NEWS_GENERATION_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  return response.choices[0].message.content ?? '';
}

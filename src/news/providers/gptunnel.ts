import { gptunnelChat } from '@/ai/gptunnel.js';
import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

export async function fetchGptunnel(prompt: string): Promise<string> {
  return gptunnelChat([
    { role: 'system', content: NEWS_GENERATION_PROMPT },
    { role: 'user', content: prompt },
  ]);
}

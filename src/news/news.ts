import { fetchOpenRouter } from '../openrouter.js';
import { formatDigest } from './formatter.js';
import { NEWS_PROMPT } from '../config/prompts.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const raw = await fetchOpenRouter(NEWS_PROMPT);
  return formatDigest(raw);
}

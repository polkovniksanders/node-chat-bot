import { fetchOpenRouter } from '../openrouter.js';
import { NEWS_PROMPT_SINGLE_EMOJI } from './prompts.js';
import { formatDigest } from './formatter.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const raw = await fetchOpenRouter(NEWS_PROMPT_SINGLE_EMOJI);
  return formatDigest(raw);
}

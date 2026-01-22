import { fetchOpenRouter } from '../openrouter.js';
import { NEWS_PROMPT_EMOJI } from './prompts.js';
import { formatDigest } from './formatter.js';

export async function getNewsDigestEmoji(): Promise<string> {
  const raw = await fetchOpenRouter(NEWS_PROMPT_EMOJI);
  return formatDigest(raw);
}

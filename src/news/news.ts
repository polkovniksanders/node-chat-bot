import { fetchOpenRouter } from '../openrouter.js';
import { formatDigest } from './formatter.js';
import { NEWS_DIGEST_EMOJI } from '../config/prompts.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const raw = await fetchOpenRouter(NEWS_DIGEST_EMOJI);
  return formatDigest(raw);
}

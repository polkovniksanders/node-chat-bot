import { fetchOpenRouter } from '../openrouter';
import { NEWS_PROMPT_EMOJI } from './prompts';
import { formatDigest } from './formatter';

export async function getNewsDigestEmoji(): Promise<string> {
  const raw = await fetchOpenRouter(NEWS_PROMPT_EMOJI);
  return formatDigest(raw);
}

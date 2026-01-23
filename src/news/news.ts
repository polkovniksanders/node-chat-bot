import { fetchOpenRouter } from '@/openrouter.js';
import { NEWS_DIGEST_EMOJI } from '@/config/prompts.js';
import { formatDigest } from '@/news/formatter.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const raw = await fetchOpenRouter(NEWS_DIGEST_EMOJI);
  return formatDigest(raw);
}

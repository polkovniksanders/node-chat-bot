import { fetchOpenRouter } from '@/openrouter';
import { NEWS_DIGEST_EMOJI } from '@/config/prompts';
import { formatDigest } from '@/news/formatter';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const raw = await fetchOpenRouter(NEWS_DIGEST_EMOJI);
  return formatDigest(raw);
}

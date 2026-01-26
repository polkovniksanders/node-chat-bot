import { NEWS_DIGEST_EMOJI } from '@/config/prompts.js';
import { formatDigest } from '@/news/formatter.js';
import { fetchOpenAI } from '@/news/ai-model.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const raw = await fetchOpenAI(NEWS_DIGEST_EMOJI);
  return formatDigest(raw);
}

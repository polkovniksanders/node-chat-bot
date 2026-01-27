import { NEWS_DIGEST_EMOJI } from '@/config/prompts.js';
import { formatDigest } from '@/news/formatter.js';
import { fetchGemini } from '@/news/gemini.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const raw = await fetchGemini(NEWS_DIGEST_EMOJI);

  return formatDigest(raw);
}

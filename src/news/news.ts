import { NEWS_DIGEST_EMOJI } from '@/config/prompts.js';
import { formatDigest } from '@/news/formatter.js';
import { fetchNews } from '@/news/fetch-news.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const raw = await fetchNews(NEWS_DIGEST_EMOJI);

  return formatDigest(raw);
}

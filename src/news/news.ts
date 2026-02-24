import { buildNewsDigestPrompt } from '@/config/prompts.js';
import { formatDigest } from '@/news/formatter.js';
import { fetchNews } from '@/news/fetch-news.js';
import {
  getRecentHistory,
  saveNewsEntry,
  generateRandomParams,
} from '@/news/news-history.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
}> {
  const history = await getRecentHistory();
  const params = generateRandomParams(history);
  const prompt = buildNewsDigestPrompt(history, params);

  console.log('📋 News params:', JSON.stringify(params));

  const raw = await fetchNews(prompt);

  const today = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  await saveNewsEntry({ date: today, news: params });

  return formatDigest(raw);
}

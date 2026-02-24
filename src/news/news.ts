import { buildNewsDigestPrompt } from '@/config/prompts.js';
import { formatDigest } from '@/news/formatter.js';
import { fetchNews } from '@/news/fetch-news.js';
import { generateNewsImage } from '@/news/image-generator.js';
import {
  getRecentHistory,
  saveNewsEntry,
  generateRandomParams,
} from '@/news/news-history.js';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
  image: Buffer | null;
}> {
  const history = await getRecentHistory();
  const params = generateRandomParams(history);
  const prompt = buildNewsDigestPrompt(history, params);

  console.log('📋 News params:', JSON.stringify(params));

  // Текст и картинка генерируются параллельно — оба используют params
  const [raw, image] = await Promise.all([fetchNews(prompt), generateNewsImage(params)]);

  const today = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  await saveNewsEntry({ date: today, news: params });

  return { ...formatDigest(raw), image };
}

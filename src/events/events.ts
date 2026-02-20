import { getDailyEventsPrompt } from '@/config/prompts.js';
import { fetchNews } from '@/news/fetch-news.js';

export async function getDailyEvents(): Promise<{ text: string }> {
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Yekaterinburg',
  });

  const prompt = getDailyEventsPrompt(dateStr);
  const raw = await fetchNews(prompt);

  return { text: raw };
}

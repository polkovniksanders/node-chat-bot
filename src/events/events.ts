import { fetchRealEventsForDate } from '@/events/fetchRealEvents.js';
import { fetchNews } from '@/news/fetch-news.js';

export async function getDailyEvents(): Promise<{ text: string }> {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }),
  );

  const english = await fetchRealEventsForDate(now);

  const prompt = `Переведи следующий текст на русский язык. Сохрани HTML-теги <b> и <i> без изменений. Не добавляй ничего от себя — только перевод.\n\n${english}`;
  const translated = await fetchNews(prompt);

  return { text: translated };
}

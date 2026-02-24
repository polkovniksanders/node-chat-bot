import { fetchRealEventsForDate } from '@/events/fetchRealEvents.js';

export async function getDailyEvents(): Promise<{ text: string }> {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }),
  );

  const text = await fetchRealEventsForDate(now);
  return { text };
}

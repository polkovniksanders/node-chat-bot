import { generateContent } from '@/ai/generateContent.js';
import { NOSTALGIA_SYSTEM_PROMPT } from '@/config/prompts.js';
import { getCategoryForDate } from '@/content/nostalgiaCycle.js';
import { TIMEZONE } from '@/config/constants.js';

const NOSTALGIA_TIMEOUT_MS = 10_000;

export async function fetchNostalgia(date: Date): Promise<string | null> {
  try {
    const category = getCategoryForDate(date);
    const formattedDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      timeZone: TIMEZONE,
    });

    const userPrompt =
      `Сегодня ${formattedDate}. Категория: «${category}».\n` +
      `Напиши один ностальгический факт из этой категории — эпоха 1989–2004, ` +
      `постсоветское пространство. Избегай самых очевидных примеров категории. ` +
      `Факт должен содержать хотя бы одну конкретную деталь: название, год или ощущение.`;

    const timeoutPromise = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('nostalgia timeout')), NOSTALGIA_TIMEOUT_MS),
    );

    const result = await Promise.race([generateContent(NOSTALGIA_SYSTEM_PROMPT, userPrompt), timeoutPromise]);
    const trimmed = result.trim();
    if (!trimmed) {
      console.warn('fetchNostalgia: empty result from generateContent');
      return null;
    }
    return escapeHtml(trimmed);
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

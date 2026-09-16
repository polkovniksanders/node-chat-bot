import { polzaChat } from '@/ai/polza.js';

// Убираем теги размышлений ( thinking, <thinking>, <reasoning>) которые возвращают некоторые модели
function stripThinkingTags(text: string): string {
  return text
    .replace(/ thinking[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trim();
}

export async function fetchNews(prompt: string): Promise<string> {
  console.log('📡 fetchNews: calling Polza...');
  const raw = await polzaChat([{ role: 'user', content: prompt }]);
  const result = stripThinkingTags(raw);

  if (result) {
    console.log('✅ News generated via Polza');
    return result;
  }

  throw new Error('Polza вернул пустой ответ для новостей');
}
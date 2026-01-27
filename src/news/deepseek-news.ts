import { deepseek } from '@/news/deepseek.js';

export async function fetchDeepSeekNews(prompt: string): Promise<string> {
  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Ты — новостной агрегатор. Дай только факты, коротко.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content ?? '';
  } catch (err) {
    console.error('DEEPSEEK NEWS ERROR:', err);
    return '';
  }
}

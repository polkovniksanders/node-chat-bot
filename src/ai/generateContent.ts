import { polzaChat } from '@/ai/polza.js';

/**
 * Генерирует текст через Polza.ai.
 */
export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  console.log('📡 generateContent: calling Polza...');
  const result = await polzaChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
  if (result.trim()) {
    console.log('✅ generateContent: Polza success');
    return result.trim();
  }
  throw new Error('Polza returned empty content');
}

import { gptunnelChat } from '@/ai/gptunnel.js';
import { ANTHROPIC_URL, ANTHROPIC_MODEL } from '@/config/api.js';

export async function callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error: ${err}`);
  }

  const data: any = await res.json();
  return data.content?.[0]?.text ?? '';
}

/**
 * Генерирует текст через GPTunnel с фолбэком на Anthropic.
 */
export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  try {
    console.log('📡 generateContent: trying GPTunnel...');
    const result = await gptunnelChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    if (result.trim()) {
      console.log('✅ generateContent: GPTunnel success');
      return result.trim();
    }
  } catch (err) {
    console.error('❌ generateContent: GPTunnel failed:', err);
  }

  try {
    console.log('📡 generateContent: trying Anthropic...');
    const result = await callAnthropic(systemPrompt, userPrompt);
    if (result.trim()) {
      console.log('✅ generateContent: Anthropic success');
      return result.trim();
    }
  } catch (err) {
    console.error('❌ generateContent: Anthropic failed:', err);
  }

  throw new Error('All AI providers failed to generate content');
}
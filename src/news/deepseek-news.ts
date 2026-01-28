import { openrouterChat } from '@/news/openrouter-chat.js';
import { fetchOpenAI } from '@/news/ai-model.js';
import { fetchGemini } from '@/news/gemini.js';
import { OpenRouterResponse } from '@/types';

const SYSTEM_PROMPT = 'Ты — новостной агрегатор. Дай только факты, коротко.';

type AIProvider = {
  name: string;
  fetch: (prompt: string) => Promise<string>;
};

async function fetchWithOpenRouter(prompt: string): Promise<string> {
  const data = (await openrouterChat({
    model: 'deepseek/deepseek-r1-0528:free',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    reasoning: { enabled: true },
  })) as OpenRouterResponse;

  const msg = data.choices?.[0]?.message;

  if (typeof msg?.content === 'string') {
    return msg.content;
  }

  if (Array.isArray(msg?.content)) {
    return msg.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  }

  return '';
}

const AI_PROVIDERS: AIProvider[] = [
  { name: 'OpenRouter (DeepSeek)', fetch: fetchWithOpenRouter },
  { name: 'OpenAI (GPT-4o-mini)', fetch: fetchOpenAI },
  { name: 'Google Gemini', fetch: fetchGemini },
];

export async function fetchNews(prompt: string): Promise<string> {
  for (const provider of AI_PROVIDERS) {
    try {
      console.log(`📡 Trying ${provider.name}...`);
      const result = await provider.fetch(prompt);

      if (result && result.trim()) {
        console.log(`✅ Success with ${provider.name}`);
        return result;
      }

      console.warn(`⚠️ ${provider.name} returned empty result, trying next...`);
    } catch (err) {
      console.error(`❌ ${provider.name} failed:`, err);
    }
  }

  // Fallback: если все AI провайдеры недоступны, возвращаем заглушку
  console.error('❌ All AI providers failed, returning fallback message');
  return `🐱 Сегодня новости отдыхают, как и я после сытного обеда. Загляните позже — обещаю рассказать что-нибудь интересное!`;
}

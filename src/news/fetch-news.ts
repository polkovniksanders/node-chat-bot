import { fetchOpenAI } from '@/news/providers/openAI.js';
import { fetchGemini } from '@/news/providers/gemini.js';
import { fetchGroq } from '@/news/providers/groq.js';
import { fetchGptunnel } from '@/news/providers/gptunnel.js';
import { fetchAnthropic } from '@/news/providers/anthropic.js';
import {
  fetchHuggingFace,
  fetchHuggingFaceQwen,
  fetchHuggingFaceLlama,
  fetchHuggingFaceMistral,
  fetchHuggingFaceGemma,
} from '@/news/providers/huggingface.js';

type AIProvider = {
  name: string;
  fetch: (prompt: string) => Promise<string>;
};

const AI_PROVIDERS: AIProvider[] = [
  { name: 'GPTunnel (gpt-4o-mini)', fetch: fetchGptunnel },
  { name: 'Anthropic (Claude Haiku)', fetch: fetchAnthropic },
  { name: 'HuggingFace (DeepSeek-R1)', fetch: fetchHuggingFace },
  { name: 'HuggingFace (Qwen 2.5 72B)', fetch: fetchHuggingFaceQwen },
  { name: 'HuggingFace (Llama 3.3 70B)', fetch: fetchHuggingFaceLlama },
  { name: 'HuggingFace (Mistral Small 24B)', fetch: fetchHuggingFaceMistral },
  { name: 'HuggingFace (Gemma 3 27B)', fetch: fetchHuggingFaceGemma },
  { name: 'Groq (Llama 3.3 70B)', fetch: fetchGroq },
  { name: 'OpenAI (GPT-4o-mini)', fetch: fetchOpenAI },
  { name: 'Google Gemini', fetch: fetchGemini },
];

// Убираем теги размышлений (<think>, <thinking>, <reasoning>) которые возвращают некоторые модели
function stripThinkingTags(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trim();
}

export async function fetchNews(prompt: string): Promise<string> {
  for (const provider of AI_PROVIDERS) {
    try {
      console.log(`📡 Trying ${provider.name}...`);
      const raw = await provider.fetch(prompt);
      const result = stripThinkingTags(raw);

      if (result) {
        console.log(`✅ Success with ${provider.name}`);
        return result;
      }

      console.warn(`⚠️ ${provider.name} returned empty result, trying next...`);
    } catch (err) {
      console.error(`❌ ${provider.name} failed:`, err);
    }
  }

  console.error('❌ All AI providers failed');
  throw new Error('All AI providers failed to generate news');
}

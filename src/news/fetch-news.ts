import { fetchOpenAI } from '@/news/providers/openAI.js';
import { fetchGemini } from '@/news/providers/gemini.js';
import { fetchGroq } from '@/news/providers/groq.js';
import { fetchWithOpenRouter } from '@/news/providers/openRouter.js';
import {
  fetchHuggingFace,
  fetchHuggingFaceQwen,
  fetchHuggingFaceLlama,
  fetchHuggingFaceMistral,
  fetchHuggingFacePhi,
} from '@/news/providers/huggingface.js';

type AIProvider = {
  name: string;
  fetch: (prompt: string) => Promise<string>;
};

const AI_PROVIDERS: AIProvider[] = [
  { name: 'HuggingFace (DeepSeek-R1)', fetch: fetchHuggingFace },
  { name: 'HuggingFace (Qwen 2.5 72B)', fetch: fetchHuggingFaceQwen },
  { name: 'HuggingFace (Llama 3.3 70B)', fetch: fetchHuggingFaceLlama },
  { name: 'HuggingFace (Mistral Small 24B)', fetch: fetchHuggingFaceMistral },
  { name: 'HuggingFace (Phi-4)', fetch: fetchHuggingFacePhi },
  { name: 'Groq (Llama 3.3 70B)', fetch: fetchGroq },
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

  console.error('❌ All AI providers failed');
  throw new Error('All AI providers failed to generate news');
}

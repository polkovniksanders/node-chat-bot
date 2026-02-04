import OpenAI from 'openai';
import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

const client = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN!,
});

function createHuggingFaceFetcher(model: string) {
  return async (prompt: string): Promise<string> => {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: NEWS_GENERATION_PROMPT },
        { role: 'user', content: prompt },
      ],
    });

    return response.choices[0].message.content ?? '';
  };
}

export const fetchHuggingFace = createHuggingFaceFetcher('unsloth/DeepSeek-OCR-2');
export const fetchHuggingFaceQwen = createHuggingFaceFetcher('Qwen/Qwen2.5-72B-Instruct');
export const fetchHuggingFaceLlama = createHuggingFaceFetcher('meta-llama/Llama-3.3-70B-Instruct');
export const fetchHuggingFaceMistral = createHuggingFaceFetcher(
  'mistralai/Mistral-Small-24B-Instruct-2501',
);
export const fetchHuggingFacePhi = createHuggingFaceFetcher('nvidia/personaplex-7b-v1');

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NEWS_GENERATION_PROMPT } from '@/config/prompts.js';

export async function fetchGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const fullPrompt = `${NEWS_GENERATION_PROMPT}\n\n${prompt}`;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();

  return text ?? '';
}

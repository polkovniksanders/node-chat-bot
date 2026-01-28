import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = 'Ты — новостной агрегатор. Дай только факты, коротко.';

export async function fetchGemini(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();

  return text ?? '';
}

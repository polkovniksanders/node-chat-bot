import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function fetchGemini(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return text ?? '';
  } catch (err) {
    console.error('GEMINI ERROR:', err);
    return '';
  }
}

import { getUserContext, pushToContext } from '@/context/memory.js';
import { CHAT_BOT_PROMPT } from '@/config/prompts.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateReply(userId: number, userMessage: string) {
  pushToContext(userId, 'user', userMessage);

  const history = getUserContext(userId);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: CHAT_BOT_PROMPT }] },
      ...history.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ],
  });

  const answer = result.response.text() ?? 'Не понял, повтори';

  pushToContext(userId, 'assistant', answer);

  return answer;
}

import { getUserContext, pushToContext } from '@/context/memory.js';
import { CHAT_BOT_PROMPT } from '@/config/prompts.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function openrouterChat(body: any) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://yourdomain.com',
      'X-Title': 'Telegram AI Bot',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function generateReply(userId: number, userMessage: string): Promise<string> {
  pushToContext(userId, 'user', userMessage);
  const userContext = getUserContext(userId);

  const messages = [
    { role: 'system', content: CHAT_BOT_PROMPT },
    ...userContext.map((m) => {
      const msg: any = { role: m.role, content: m.content };
      if (m.role === 'assistant' && m.reasoning_details) {
        msg.reasoning_details = m.reasoning_details;
      }
      return msg;
    }),
  ];

  try {
    const data = await openrouterChat({
      model: 'xiaomi/mimo-v2-flash:free',
      messages,
      reasoning: { enabled: true },
    });

    // @ts-ignore
    const responseMsg = data.choices?.[0]?.message;
    console.log('responseMsg', responseMsg);

    // -----------------------------
    // 🔥 Универсальный парсер контента
    // -----------------------------
    let answer = '';

    if (typeof responseMsg?.content === 'string') {
      answer = responseMsg.content;
    } else if (Array.isArray(responseMsg?.content)) {
      answer = responseMsg.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }

    // -----------------------------
    // 🔥 Защита от пустых ответов
    // -----------------------------
    if (!answer || !answer.trim()) {
      answer = 'Извини, я не понял вопрос. Попробуй переформулировать.';
    }

    // -----------------------------
    // 🔥 Сохраняем reasoning_details
    // -----------------------------
    const reasoningDetails = (responseMsg as any)?.reasoning_details ?? null;

    pushToContext(userId, 'assistant', answer, reasoningDetails);

    console.log('userMessage', userMessage);
    console.log('answer', answer);

    return answer;
  } catch (err) {
    console.error('OpenRouter error:', err);
    return 'Ошибка при обращении к модели';
  }
}

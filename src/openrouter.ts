export async function fetchOpenRouter(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://yourdomain.com',
      'X-Title': 'Telegram AI Bot',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        {
          role: 'system',
          content:
            'Ты — новостной агрегатор. Дай только факты. Каждая новость должна быть короткой, 1–2 предложения, лаконично, без лишних деталей.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json();
  // @ts-ignore
  return data.choices?.[0]?.message?.content ?? '';
}

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function fetchOpenAI(prompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Ты — новостной агрегатор. Дай только факты.' },
      { role: 'user', content: prompt },
    ],
  });
  console.log('fetchOpenAI response', response);

  return response.choices[0].message.content ?? '';
}

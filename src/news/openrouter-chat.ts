const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function openrouterChat(body: any) {
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
    const err = await res.text();
    console.error('OPENROUTER ERROR:', err);
    throw new Error(err);
  }

  return res.json();
}

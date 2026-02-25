const BASE_URL = 'https://gptunnel.ru/v1';
const IMAGE_MODEL = 'nano-banana-1k';

export async function generateImage(prompt: string): Promise<Buffer> {
  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: process.env.GPTUNNEL_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GPTunnel image error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  const imageUrl: string | undefined = data?.data?.[0]?.url;

  if (!imageUrl) throw new Error('GPTunnel вернул пустой ответ без URL изображения');

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Не удалось скачать изображение: ${imgRes.status}`);

  return Buffer.from(await imgRes.arrayBuffer());
}

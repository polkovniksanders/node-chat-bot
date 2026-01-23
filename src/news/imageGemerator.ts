import { buildImagePrompt } from './buildImagePrompt.js';

export async function generateDigestImage(digestText: string): Promise<string> {
  const prompt = buildImagePrompt(digestText);
  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    throw new Error('POLLINATIONS_API_KEY is not set');
  }

  const url = new URL('https://gen.pollinations.ai/image/' + encodeURIComponent(prompt));
  url.searchParams.set('model', 'flux');
  url.searchParams.set('width', '1000');
  url.searchParams.set('height', '1000');
  url.searchParams.set('safe', 'true');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('seed', String(Date.now()));
  url.searchParams.set('_ts', Date.now().toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Pollinations API error: ${response.status} ${response.statusText}`);
  }

  const imageUrl = response.url;
  if (!imageUrl || !imageUrl.startsWith('http')) {
    throw new Error('Invalid image URL returned from Pollinations');
  }

  return imageUrl;
}

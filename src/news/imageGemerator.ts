import { buildImagePrompt } from './buildImagePrompt';
import { OpenRouter } from '@openrouter/sdk';

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

export async function generateDigestImage(digestText: string): Promise<string> {
  const prompt = buildImagePrompt(digestText);

  const response = await openrouter.chat.send({
    model: 'sourceful/riverflow-v2-standard-preview',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    modalities: ['image', 'text'],
  });

  const message = response.choices[0].message;
  if (!message.images || message.images.length === 0) {
    throw new Error('No image generated');
  }

  return message.images[0].imageUrl.url;
}

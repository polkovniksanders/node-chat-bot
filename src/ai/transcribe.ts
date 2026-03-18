/**
 * Транскрибирует аудио через HuggingFace Whisper (бесплатно).
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.HF_TOKEN;
  if (!apiKey) throw new Error('HF_TOKEN не задан в .env');

  const res = await fetch(
    'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'audio/ogg',
      },
      body: audioBuffer,
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HuggingFace Whisper error: ${err}`);
  }

  const data: any = await res.json();
  return data.text?.trim() ?? '';
}

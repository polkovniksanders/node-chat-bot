/**
 * Транскрибирует аудио через OpenAI Whisper.
 */
export async function transcribeAudio(audioBuffer: Buffer, filename = 'voice.ogg'): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY не задан в .env');

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), filename);
  formData.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI Whisper error: ${err}`);
  }

  const data: any = await res.json();
  return data.text?.trim() ?? '';
}

/**
 * Транскрибирует аудио через Groq Whisper (бесплатно), фолбэк — OpenAI Whisper.
 */
export async function transcribeAudio(audioBuffer: Buffer, filename = 'voice.ogg'): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    try {
      return await transcribeWith(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        process.env.GROQ_API_KEY,
        audioBuffer,
        filename,
        'whisper-large-v3',
      );
    } catch (err) {
      console.warn('Groq Whisper failed, falling back to OpenAI:', err);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    return await transcribeWith(
      'https://api.openai.com/v1/audio/transcriptions',
      process.env.OPENAI_API_KEY,
      audioBuffer,
      filename,
      'whisper-1',
    );
  }

  throw new Error('Нет доступных API ключей для транскрипции (GROQ_API_KEY или OPENAI_API_KEY)');
}

async function transcribeWith(
  url: string,
  apiKey: string,
  audioBuffer: Buffer,
  filename: string,
  model: string,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), filename);
  formData.append('model', model);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper error (${url}): ${err}`);
  }

  const data: any = await res.json();
  return data.text?.trim() ?? '';
}

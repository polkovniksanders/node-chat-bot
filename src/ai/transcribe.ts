const BASE_URL = 'https://gptunnel.ru/v1';

/**
 * Транскрибирует аудио через GPTunnel Whisper (whisper-1).
 * @param audioBuffer — бинарные данные аудиофайла (OGG, MP3, WAV и др.)
 * @param filename — имя файла для multipart, влияет на определение формата
 */
export async function transcribeAudio(audioBuffer: Buffer, filename = 'voice.ogg'): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), filename);
  formData.append('model', 'whisper-1');

  const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: process.env.GPTUNNEL_API_KEY ?? '',
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPTunnel Whisper error: ${err}`);
  }

  const data: any = await res.json();
  return data.text?.trim() ?? '';
}

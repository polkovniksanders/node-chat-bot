/**
 * Транскрибирует аудио через Gemini 1.5 Flash (поддерживает OGG/OPUS).
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY не задан в .env');

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'audio/ogg',
              data: audioBuffer.toString('base64'),
            },
          },
          {
            text: 'Transcribe the audio exactly as spoken. Return only the transcribed text, nothing else.',
          },
        ],
      },
    ],
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini transcription error: ${err}`);
  }

  const data: any = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

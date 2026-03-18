/**
 * Транскрибирует аудио через GPTunnel gpt-4o (мультимодальный, аудио в base64).
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GPTUNNEL_API_KEY;
  if (!apiKey) throw new Error('GPTUNNEL_API_KEY не задан в .env');

  const res = await fetch('https://gptunnel.ru/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: audioBuffer.toString('base64'),
                format: 'ogg',
              },
            },
            {
              type: 'text',
              text: 'Transcribe the audio exactly as spoken. Return only the transcribed text, nothing else.',
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPTunnel transcription error: ${err.slice(0, 300)}`);
  }

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

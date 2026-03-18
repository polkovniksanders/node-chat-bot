/**
 * Транскрибирует аудио через AssemblyAI (бесплатно, только email-регистрация).
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY не задан в .env');

  const headers = { authorization: apiKey, 'content-type': 'application/json' };

  // 1. Загружаем аудио
  const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/octet-stream' },
    body: audioBuffer,
  });
  if (!uploadRes.ok) throw new Error(`AssemblyAI upload error: ${await uploadRes.text()}`);
  const { upload_url } = await uploadRes.json() as { upload_url: string };

  // 2. Запускаем транскрипцию
  const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers,
    body: JSON.stringify({ audio_url: upload_url, language_detection: true }),
  });
  if (!transcriptRes.ok) throw new Error(`AssemblyAI transcript error: ${await transcriptRes.text()}`);
  const { id } = await transcriptRes.json() as { id: string };

  // 3. Ждём результат (polling, макс 30 сек)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, { headers });
    const poll = await pollRes.json() as { status: string; text?: string; error?: string };
    if (poll.status === 'completed') return poll.text?.trim() ?? '';
    if (poll.status === 'error') throw new Error(`AssemblyAI: ${poll.error}`);
  }

  throw new Error('AssemblyAI: превышено время ожидания');
}

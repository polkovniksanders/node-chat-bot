const BASE_URL = 'https://gptunnel.ru/v1';
const IMAGE_MODELS = ['flux-2-klein-4b-chat', 'yandex-art'];
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

async function apiPost(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: process.env.GPTUNNEL_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`GPTunnel ${path} error ${res.status}: ${text}`);

  return JSON.parse(text);
}

async function createTask(model: string, prompt: string): Promise<string> {
  const data = await apiPost('/media/create', { model, prompt, ar: '1:1' });
  const taskId: string | undefined = data?.id;
  if (!taskId) throw new Error(`GPTunnel не вернул task ID: ${JSON.stringify(data)}`);
  return taskId;
}

async function pollResult(taskId: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const data = await apiPost('/media/result', { task_id: taskId });

    if (data?.status === 'done') {
      const url: string | undefined = data?.url;
      if (!url) throw new Error('GPTunnel вернул status=done, но URL отсутствует');
      return url;
    }

    if (data?.status === 'error') {
      throw new Error(`GPTunnel вернул ошибку генерации: ${JSON.stringify(data)}`);
    }

    // status: idle | processing — продолжаем ждать
  }

  throw new Error('GPTunnel: таймаут генерации изображения (120 сек.)');
}

async function tryGenerateWithModel(model: string, prompt: string): Promise<string> {
  const taskId = await createTask(model, prompt);
  console.log(`🎨 GPTunnel image task created (${model}): ${taskId}`);
  return pollResult(taskId);
}

export async function generateImage(prompt: string): Promise<Buffer> {
  let lastError: Error | undefined;

  for (const model of IMAGE_MODELS) {
    try {
      const imageUrl = await tryGenerateWithModel(model, prompt);
      console.log(`✅ GPTunnel image ready (${model}): ${imageUrl}`);
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`Не удалось скачать изображение: ${imgRes.status}`);
      return Buffer.from(await imgRes.arrayBuffer());
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`⚠️ GPTunnel model ${model} failed: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error('Все модели генерации изображений недоступны');
}

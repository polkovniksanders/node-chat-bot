const BASE_URL = 'https://gptunnel.ru/v1';

// Паттерны моделей, непригодных для текстового чата
const EXCLUDED_PATTERNS = ['coder', 'codex', 'search', 'faceswap', 'imagine', 'video', 'tts', 'embed', 'moderat'];

let cachedModel: string | null = null;

export async function getGptunnelModel(): Promise<string> {
  if (cachedModel) return cachedModel;

  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: process.env.GPTUNNEL_API_KEY ?? '' },
    });

    if (!res.ok) throw new Error(`${res.status}`);

    const { data } = (await res.json()) as { data: any[] };

    const model = data
      .filter(
        (m) =>
          m.type === 'TEXT' && !EXCLUDED_PATTERNS.some((p) => m.id.toLowerCase().includes(p)),
      )
      .sort(
        (a, b) =>
          parseFloat(a.cost_context) +
          parseFloat(a.cost_completion) -
          (parseFloat(b.cost_context) + parseFloat(b.cost_completion)),
      )[0];

    cachedModel = model?.id ?? 'gpt-4o-mini';
    console.log(
      `🤖 GPTunnel model selected: ${cachedModel}` +
        (model ? ` (${model.cost_context}+${model.cost_completion} per 1K tokens)` : ''),
    );
  } catch (err) {
    console.warn('⚠️ GPTunnel model selection failed, using gpt-4o-mini:', err);
    cachedModel = 'gpt-4o-mini';
  }

  return cachedModel!;
}

export async function gptunnelChat(
  messages: { role: string; content: string }[],
): Promise<string> {
  const model = await getGptunnelModel();

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: process.env.GPTUNNEL_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) throw new Error(await res.text());

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

import { NewsParams } from '@/news/news-history.js';

const LOCATION_MAP: Record<string, string> = {
  кухня: 'kitchen',
  гостиная: 'living room',
  подоконник: 'windowsill',
  коридор: 'hallway',
  ванная: 'bathroom',
  спальня: 'bedroom',
  балкон: 'balcony',
  'у миски': 'near food bowl',
  'у когтеточки': 'near scratching post',
  прихожая: 'entrance hall',
};

const TIME_MAP: Record<string, string> = {
  утром: 'morning, warm golden light',
  днём: 'afternoon, bright daylight',
  вечером: 'evening, cozy warm lamp light',
  ночью: 'night, dim moonlight',
};

const EVENT_MAP: Record<string, string> = {
  'миска с кормом': 'eating from a food bowl',
  пылесос: 'scared of a running vacuum cleaner',
  стиралка: 'watching a spinning washing machine',
  чайник: 'sitting next to a boiling kettle',
  шторы: 'tangled in curtains',
  плед: 'curled up on a cozy blanket',
  диван: 'lounging on a sofa',
  когтеточка: 'scratching a scratching post',
  мячик: 'playing with a toy ball',
  'Твитти устроил переполох': 'annoyed by a yellow cockatiel parrot flying around',
  'мамочка болтает по телефону': 'sitting next to owner who is talking on the phone',
  гости: 'hiding under furniture from guests',
  'сквозняк из форточки': 'fur ruffled by a breeze from an open window',
  'зарядное устройство': 'chewing on a phone charger cable',
  'пакет из магазина': 'sitting inside a shopping bag',
  'зонтик у двери': 'sniffing a wet umbrella',
  'запах еды': 'nose raised, sniffing food smells',
  'звонок в дверь': 'startled and wide-eyed from a doorbell',
};

function buildImagePrompt(params: NewsParams): string {
  const location = LOCATION_MAP[params.location] ?? params.location;
  const time = TIME_MAP[params.time] ?? params.time;
  const event = EVENT_MAP[params.event] ?? params.event;

  return (
    `A cute fluffy black cat with white paws and white chest, ${event}, ` +
    `in a cozy Russian apartment ${location}, ${time}, ` +
    `digital illustration, warm colors, charming cartoon style, high quality`
  );
}

async function fetchWithTimeout(
  fetchFn: () => Promise<Buffer | null>,
  timeoutMs: number,
): Promise<Buffer | null> {
  return Promise.race([
    fetchFn(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

async function fetchFromPollinations(prompt: string): Promise<Buffer | null> {
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function fetchFromHuggingFace(prompt: string): Promise<Buffer | null> {
  const token = process.env.HF_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
      },
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function generateNewsImage(params: NewsParams): Promise<Buffer | null> {
  const prompt = buildImagePrompt(params);
  console.log('🎨 Image prompt:', prompt);

  console.log('🎨 Trying Pollinations.ai...');
  const fromPollinations = await fetchWithTimeout(() => fetchFromPollinations(prompt), 30_000);
  if (fromPollinations) {
    console.log('✅ Image ready from Pollinations.ai');
    return fromPollinations;
  }

  console.warn('⚠️ Pollinations failed, trying HuggingFace SDXL...');
  const fromHuggingFace = await fetchWithTimeout(() => fetchFromHuggingFace(prompt), 35_000);
  if (fromHuggingFace) {
    console.log('✅ Image ready from HuggingFace');
    return fromHuggingFace;
  }

  console.warn('⚠️ Image generation failed — will post text only');
  return null;
}

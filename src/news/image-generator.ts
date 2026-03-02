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
  'под кроватью': 'under the bed',
  'на холодильнике': 'on top of the refrigerator',
  'в шкафу': 'inside an open wardrobe',
  'у батареи': 'curled up next to a radiator',
};

const TIME_MAP: Record<string, string> = {
  утром: 'morning, warm golden light',
  днём: 'afternoon, bright daylight',
  вечером: 'evening, cozy warm lamp light',
  ночью: 'night, dim moonlight',
  'на рассвете': 'at dawn, soft pink early morning glow',
  'в сумерках': 'at dusk, blue-gray twilight',
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
  'новая подушка': 'kneading and napping on a brand new fluffy pillow',
  'лазерная указка': 'chasing a red laser dot frantically on the wall',
  'тунец закончился': 'staring accusingly at an empty tuna can',
  'уборка в квартире': 'perched on a chair watching the owner mop the floor',
  'мамочка включила фен': 'fleeing in panic from a running hair dryer',
  'посылка с Озона': 'sitting smugly inside a freshly opened delivery cardboard box',
  'воробей за окном': 'chattering excitedly at sparrows through the window glass',
  'зеркало в прихожей': 'puffed up and hissing at own reflection in a hallway mirror',
  'мамочка ушла надолго': 'sitting by the front door waiting for the owner to return',
  'упала кружка со стола': 'looking innocent next to a fallen mug on the floor',
  'непонятный шорох ночью': 'wide-eyed and alert creeping through a dark hallway at night',
  'новый ковёр': 'enthusiastically scratching and kneading a brand new rug',
};

const ART_STYLES = [
  'digital illustration, warm colors, charming cartoon style, high quality',
  'watercolor painting, soft washes, cozy and gentle mood',
  'comic book style, bold outlines, vibrant colors, expressive',
  'oil painting, textured brushstrokes, rich colors, classical feel',
  'flat design vector art, pastel palette, minimalist and cute',
  "children's book illustration, whimsical, soft pencil lines, storybook feel",
  'retro vintage poster, muted tones, nostalgic 1950s illustration style',
  'cozy cottagecore illustration, earthy tones, hand-drawn warmth',
  'anime style, expressive eyes, clean lineart, soft shading',
  'impressionist painting, loose brushwork, dreamy atmosphere',
];

function buildImagePrompt(params: NewsParams): string {
  const location = LOCATION_MAP[params.location] ?? params.location;
  const time = TIME_MAP[params.time] ?? params.time;
  const event = EVENT_MAP[params.event] ?? params.event;
  const style = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];

  return (
    `A cute fluffy black cat with white paws and white chest, ${event}, ` +
    `in a cozy Russian apartment ${location}, ${time}, ` +
    `${style}`
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

import { gptunnelChat } from '@/ai/gptunnel.js';

interface TrackOfDay {
  artist: string;
  title: string;
  comment: string;
}

export async function fetchTrackOfDay(): Promise<TrackOfDay> {
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `Ты — кот Степка. Чёрный, с белыми лапками, живёшь в Челябинске на 16 этаже. Ленивый, ироничный, любишь тунец и мамулю, не любишь попугая Твитти.

Порекомендуй один музыкальный трек на сегодня (${today}). Это должен быть реальный существующий трек — любой жанр, любая эпоха. Можно русскую музыку, можно зарубежную.

Ответь СТРОГО в формате JSON (без markdown, без \`\`\`):
{
  "artist": "Исполнитель",
  "title": "Название трека",
  "comment": "Короткий комментарий от Степки (1-2 предложения, в характере кота)"
}`;

  const raw = await gptunnelChat([{ role: 'user', content: prompt }]);

  // Вырезаем JSON из ответа (на случай если AI добавит лишнее)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Unexpected AI response: ${raw}`);

  const parsed = JSON.parse(match[0]) as TrackOfDay;
  if (!parsed.artist || !parsed.title || !parsed.comment) {
    throw new Error(`Incomplete track data: ${raw}`);
  }

  return parsed;
}

export function buildTrackMessage(track: TrackOfDay): string {
  const query = encodeURIComponent(`${track.artist} ${track.title}`);
  const yaLink = `https://music.yandex.ru/search?text=${query}`;

  return (
    `🎵 <b>Трек дня от Степки:</b>\n` +
    `<b>${track.artist}</b> — <i>${track.title}</i>\n\n` +
    `💬 ${track.comment}\n\n` +
    `<a href="${yaLink}">🔍 Найти в Яндекс.Музыке</a>`
  );
}
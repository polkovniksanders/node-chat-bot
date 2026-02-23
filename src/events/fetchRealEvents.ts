interface WikiEvent {
  text: string;
  year?: number;
}

async function fetchWiki(type: string, month: number, day: number): Promise<WikiEvent[]> {
  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/${type}/${month}/${day}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'TelegramEventsBot/1.0' } });
  if (!res.ok) return [];
  const data = (await res.json()) as Record<string, WikiEvent[]>;
  return data[type] ?? [];
}

export async function fetchRealEventsForDate(date: Date): Promise<string> {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const [selected, holidays, births] = await Promise.all([
    fetchWiki('selected', month, day),
    fetchWiki('holidays', month, day),
    fetchWiki('births', month, day),
  ]);

  const dateStr = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Yekaterinburg',
  });

  let text = `<b>📅 ${dateStr}</b>\n`;

  if (holidays.length > 0) {
    text += `\n🎉 <b>Праздники:</b>\n`;
    holidays.slice(0, 4).forEach((h) => {
      text += `• ${h.text}\n`;
    });
  }

  const events = selected.length ? selected : [];
  if (events.length > 0) {
    text += `\n🏛 <b>В этот день в истории:</b>\n`;
    events.slice(0, 5).forEach((e) => {
      text += `• ${e.year ? `<b>${e.year}</b> — ` : ''}${e.text}\n`;
    });
  }

  if (births.length > 0) {
    text += `\n✨ <b>Интересно:</b>\n`;
    births.slice(0, 2).forEach((b) => {
      text += `• ${b.year ? `${b.year} — ` : ''}${b.text}\n`;
    });
  }

  return text;
}

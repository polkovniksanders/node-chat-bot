interface WikiEvent {
  text: string;
  year?: number;
}

interface WikiResponse {
  events: WikiEvent[];
  births: WikiEvent[];
  holidays: WikiEvent[];
}

export async function fetchRealEventsForDate(date: Date): Promise<string> {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const url = `https://api.wikimedia.org/feed/v1/wikipedia/ru/onthisday/all/${month}/${day}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'TelegramEventsBot/1.0' } });

  if (!res.ok) return '';

  const data = (await res.json()) as WikiResponse;

  const dateStr = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Yekaterinburg',
  });

  let text = `<b>📅 ${dateStr}</b>\n`;

  if (data.holidays?.length > 0) {
    text += `\n🎉 <b>Праздники:</b>\n`;
    data.holidays.slice(0, 4).forEach((h) => {
      text += `• ${h.text}\n`;
    });
  }

  if (data.events?.length > 0) {
    text += `\n🏛 <b>В этот день в истории:</b>\n`;
    data.events.slice(0, 5).forEach((e) => {
      text += `• ${e.year ? `<b>${e.year}</b> — ` : ''}${e.text}\n`;
    });
  }

  if (data.births?.length > 0) {
    text += `\n✨ <b>Родились в этот день:</b>\n`;
    data.births.slice(0, 2).forEach((b) => {
      text += `• ${b.year ? `${b.year} — ` : ''}${b.text}\n`;
    });
  }

  return text;
}

interface DoomsdayData {
  seconds: number;
  updatedYear: number;
}

const FALLBACK: DoomsdayData = { seconds: 85, updatedYear: 2026 };

export async function fetchDoomsdayClock(): Promise<string> {
  try {
    const html = await fetch('https://thebulletin.org/doomsday-clock/').then((r) => r.text());
    const data = parseClockFromHtml(html) ?? FALLBACK;
    return buildDoomsdayMessage(data);
  } catch {
    return buildDoomsdayMessage(FALLBACK);
  }
}

function parseClockFromHtml(html: string): DoomsdayData | null {
  // Meta tag: content="It is 85 seconds to midnight."
  const secondsMatch = html.match(/It is(?:\s+now)?\s+(\d+)\s+seconds?\s+to\s+midnight/i);
  if (secondsMatch) {
    return { seconds: parseInt(secondsMatch[1], 10), updatedYear: new Date().getFullYear() };
  }

  // Minutes and seconds: "X minutes and Y seconds to midnight"
  const minutesMatch = html.match(/(\d+)\s+minutes?\s+(?:and\s+)?(\d+)\s+seconds?\s+to\s+midnight/i);
  if (minutesMatch) {
    const total = parseInt(minutesMatch[1], 10) * 60 + parseInt(minutesMatch[2], 10);
    return { seconds: total, updatedYear: new Date().getFullYear() };
  }

  return null;
}

function buildDoomsdayMessage(data: DoomsdayData): string {
  const timeStr = formatSeconds(data.seconds);
  return (
    `☢️ <b>Часы Судного дня:</b>\n` +
    `До полуночи осталось <b>${timeStr}</b>\n` +
    `📅 Последнее обновление: ${data.updatedYear} г.\n` +
    `<i>Проект «Бюллетеня учёных-атомщиков» с 1947 года</i>`
  );
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s} секунд`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m} мин. ${rem} сек.` : `${m} минут`;
}

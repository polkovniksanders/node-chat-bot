// Sources:
// 1. OpenHolidays API   — official public holidays by country (free, no auth)
// 2. isdayoff.ru        — check if today is a day off in Russia (free, no auth)
// 3. calend.ru          — Russian memorable dates & holidays (scraping, no auth)
//    ↳ fallback: Wikimedia On This Day (ru) holidays
// 4. Wikimedia On This Day (ru) — historical events, births (free, no auth)
// 5. byabbe.se On This Day    — Day in History fallback (free, no auth)
// 6. uselessfacts.jsph.pl     — Facts API, fact of the day (free, no auth)
//    ↳ translated to Russian via GPTunnel

interface OpenHoliday {
  id: string;
  startDate: string;
  endDate: string;
  name: Array<{ language: string; text: string }>;
}

interface WikiEvent {
  text: string;
  year?: number;
}

interface WikiResponse {
  events: WikiEvent[];
  births: WikiEvent[];
  holidays: WikiEvent[];
}

interface ByabbeEvent {
  year: string;
  description: string;
}

interface ByabbeResponse {
  date: string;
  events: ByabbeEvent[];
  births: ByabbeEvent[];
  deaths: ByabbeEvent[];
}

async function fetchOpenHolidays(date: Date): Promise<string[]> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=RU&languageIsoCode=RU&validFrom=${dateStr}&validTo=${dateStr}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = (await res.json()) as OpenHoliday[];
    return data
      .map((h) => h.name.find((n) => n.language === 'RU')?.text ?? h.name[0]?.text ?? '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function checkIsDayOff(date: Date): Promise<boolean | null> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const url = `https://isdayoff.ru/api/getdata?year=${year}&month=${month}&day=${day}&cc=ru`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim() === '1';
  } catch {
    return null;
  }
}

async function fetchWikiEvents(date: Date): Promise<WikiResponse | null> {
  try {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/ru/onthisday/all/${month}/${day}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TelegramEventsBot/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as WikiResponse;
  } catch {
    return null;
  }
}

// Russian-focused categories to include from calend.ru
const RUSSIAN_CATEGORIES = ['России', 'Православн', 'воинской', 'Народн', 'Патриот'];

async function fetchCalendRuHolidays(date: Date): Promise<string[]> {
  try {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const url = `https://www.calend.ru/day/${month}-${day}/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const results: string[] = [];
    const liPattern = /<li>([\s\S]*?)<\/li>/g;
    let liMatch;

    while ((liMatch = liPattern.exec(html)) !== null) {
      const liContent = liMatch[1];
      const linkMatch = /<a\s+href="[^"]*\/holidays\/[^"]*">\s*([\s\S]*?)\s*<\/a>/.exec(liContent);
      const imgMatch = /<img[^>]+alt="([^"]+)"/.exec(liContent);

      if (linkMatch && imgMatch) {
        const name = linkMatch[1].trim();
        const category = imgMatch[1].trim();
        if (
          RUSSIAN_CATEGORIES.some((kw) => category.includes(kw)) &&
          name.length > 3
        ) {
          results.push(name);
        }
      }
    }

    return results.slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchDayInHistory(date: Date): Promise<ByabbeResponse | null> {
  try {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const url = `https://byabbe.se/on-this-day/${month}/${day}.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as ByabbeResponse;
  } catch {
    return null;
  }
}

async function fetchFact(): Promise<string | null> {
  try {
    const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text: string };
    const text = data.text?.trim();
    if (!text) return null;
    return await translateFact(text);
  } catch {
    return null;
  }
}

async function translateFact(text: string): Promise<string> {
  try {
    const { gptunnelChat } = await import('@/ai/gptunnel.js');
    const result = await gptunnelChat([
      {
        role: 'system',
        content: 'Переведи текст на русский язык. Верни только перевод, без пояснений.',
      },
      { role: 'user', content: text },
    ]);
    return result.trim() || text;
  } catch {
    return text;
  }
}

export async function fetchRealEventsForDate(date: Date): Promise<string> {
  const [holidaysResult, isDayOffResult, wikiResult, historyResult, factResult, calendResult] =
    await Promise.allSettled([
      fetchOpenHolidays(date),
      checkIsDayOff(date),
      fetchWikiEvents(date),
      fetchDayInHistory(date),
      fetchFact(),
      fetchCalendRuHolidays(date),
    ]);

  const dateStr = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Yekaterinburg',
  });

  const isDayOff = isDayOffResult.status === 'fulfilled' ? isDayOffResult.value : null;
  const dayOffEmoji = isDayOff === true ? ' 🏖' : isDayOff === false ? ' 💼' : '';

  let text = `📅 <b>${dateStr}</b>${dayOffEmoji}\n`;

  // Official state holidays (OpenHolidays API)
  const officialHolidays =
    holidaysResult.status === 'fulfilled' ? holidaysResult.value : [];
  if (officialHolidays.length > 0) {
    text += `\n🎉 <b>Праздники:</b>\n`;
    officialHolidays.forEach((h) => {
      text += `• ${h}\n`;
    });
  }

  const wiki = wikiResult.status === 'fulfilled' ? wikiResult.value : null;
  const history = historyResult.status === 'fulfilled' ? historyResult.value : null;
  const calendHolidays = calendResult.status === 'fulfilled' ? calendResult.value : [];

  // Memorable dates — calend.ru (primary) with Wikimedia holidays as fallback
  if (calendHolidays.length > 0) {
    text += `\n🌟 <b>Памятные даты:</b>\n`;
    calendHolidays.forEach((h) => {
      text += `• ${h}\n`;
    });
  } else if (wiki && wiki.holidays && wiki.holidays.length > 0) {
    text += `\n🌟 <b>Памятные даты:</b>\n`;
    wiki.holidays.slice(0, 4).forEach((h) => {
      text += `• ${h.text}\n`;
    });
  }

  // Historical events — Wikimedia (primary) with byabbe.se fallback
  if (wiki && wiki.events && wiki.events.length > 0) {
    text += `\n🏛 <b>В этот день в истории:</b>\n`;
    wiki.events.slice(0, 5).forEach((e) => {
      text += `• ${e.year ? `<b>${e.year}</b> — ` : ''}${e.text}\n`;
    });
  } else if (history && history.events && history.events.length > 0) {
    text += `\n🏛 <b>В этот день в истории:</b>\n`;
    history.events.slice(0, 5).forEach((e) => {
      text += `• ${e.year ? `<b>${e.year}</b> — ` : ''}${e.description}\n`;
    });
  }

  // Notable births — Wikimedia (primary) with byabbe.se fallback
  if (wiki && wiki.births && wiki.births.length > 0) {
    text += `\n✨ <b>Родились в этот день:</b>\n`;
    wiki.births.slice(0, 3).forEach((b) => {
      text += `• ${b.year ? `${b.year} — ` : ''}${b.text}\n`;
    });
  } else if (history && history.births && history.births.length > 0) {
    text += `\n✨ <b>Родились в этот день:</b>\n`;
    history.births.slice(0, 3).forEach((b) => {
      text += `• ${b.year ? `${b.year} — ` : ''}${b.description}\n`;
    });
  }

  // Fact of the day (Facts API)
  const fact = factResult.status === 'fulfilled' ? factResult.value : null;
  if (fact) {
    text += `\n🐾 <b>Факт дня:</b>\n${fact}\n`;
  }

  return text;
}

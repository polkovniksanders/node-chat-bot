import { generateContent } from '@/ai/generateContent.js';

const SYSTEM_PROMPT =
  'Ты — писатель коротких рассказов о животных для Telegram-канала кота Стёпки из Челябинска. ' +
  'Рассказы яркие, с неожиданным поворотом или тёплым финалом, животные всегда в главных ролях. ' +
  'Никакого markdown — только чистый текст. Строго на русском языке. ' +
  'Объём: 150–200 слов.';

const USER_PROMPT =
  'Напиши короткий рассказ (150–200 слов) о животных, где они играют главную роль. ' +
  'Тема и герои — на твой выбор (лесные, домашние, морские, экзотические животные). ' +
  'Рассказ должен быть интересным, с характером и неожиданным поворотом или тёплым финалом. ' +
  'Без вводных фраз типа "Вот рассказ:" — сразу начни с заголовка. ' +
  'Формат:\n' +
  'Строка 1: заголовок (без кавычек, без звёздочек, без решёток)\n' +
  'Строка 2: пустая\n' +
  'Строки 3+: текст рассказа';

function parseStoryContent(raw: string): { title: string; body: string } {
  const lines = raw.trim().split('\n');
  let title = '';
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      title = line.replace(/[*#_]/g, '').trim();
      bodyStart = i + 1;
      break;
    }
  }

  const body = lines
    .slice(bodyStart)
    .join('\n')
    .replace(/\*\*/g, '')
    .replace(/[#_]/g, '')
    .trim();

  return { title, body };
}

export async function generateAnimalStoryPost(): Promise<string> {
  const raw = await generateContent(SYSTEM_PROMPT, USER_PROMPT);
  const { title, body } = parseStoryContent(raw);

  const header = title ? `<b>${title}</b>` : '<b>Рассказ дня</b>';

  return `📖 <b>Рассказ дня</b>

${header}

${body}

#рассказдня #животные #степка #история
<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>`;
}

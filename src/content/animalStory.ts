import { generateContent } from '@/ai/generateContent.js';
import { ANIMAL_STORY_SYSTEM_PROMPT, ANIMAL_STORY_USER_PROMPT } from '@/config/prompts.js';

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
  const raw = await generateContent(ANIMAL_STORY_SYSTEM_PROMPT, ANIMAL_STORY_USER_PROMPT);
  const { title, body } = parseStoryContent(raw);

  const header = title ? `<b>${title}</b>` : '<b>Рассказ дня</b>';

  return `📖 <b>Рассказ дня</b>

${header}

${body}

#рассказдня #животные #степка #история
<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>`;
}
import { generateContent } from '@/ai/generateContent.js';
import { PET_NAMES_SYSTEM_PROMPT, PET_NAMES_USER_PROMPT } from '@/config/prompts.js';

export async function generatePetNamesPost(): Promise<string> {
  const aiContent = await generateContent(PET_NAMES_SYSTEM_PROMPT, PET_NAMES_USER_PROMPT);

  return `🐾 <b>5 необычных кличек для питомцев</b>

${aiContent}

#кличкидляживотных #питомцы #животные #степка
<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>`;
}
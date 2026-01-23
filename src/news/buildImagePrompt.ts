export function buildImagePrompt(digestText: string): string {
  // простой способ выделить ключевые слова/темы: берем существующие эмодзи и существительные
  // для production можно использовать NLP / OpenRouter LLM для выделения 2–3 тем
  const themes = extractKeyThemes(digestText); // ['nature', 'AI', 'animals']

  return `
Minimalistic flat illustration for a news digest.

Themes:
- ${themes.join('\n- ')}

Style:
- clean
- modern
- no text
- no letters
- no logos
- soft colors
- telegram-friendly
- editorial illustration
- not abstract
- not surreal

Scene:
A calm, balanced composition representing the main themes of today's digest,
suitable as a background image for a daily news digest.
`;
}

// Простейший пример извлечения ключевых тем
function extractKeyThemes(text: string): string[] {
  // для начала просто берем существительные из текста (можно позже заменить на LLM)
  // либо можно искать ключевые слова вручную
  const possibleThemes = ['nature', 'science', 'AI', 'technology', 'animals', 'ecology', 'biology'];
  return possibleThemes.filter((theme) => text.toLowerCase().includes(theme)).slice(0, 3);
}

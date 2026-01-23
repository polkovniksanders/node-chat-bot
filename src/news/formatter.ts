import { InlineKeyboard } from 'grammy';

export function formatDigest(content: string) {
  return {
    text: `
<b>📰 Дайджест новостей</b>

${content}

— — —
`,
    reply_markup: new InlineKeyboard()
      .switchInline('📤 Поделиться')
      .url('⭐ Подписаться', 'https://t.me/stepka_and_twitty'),
  };
}

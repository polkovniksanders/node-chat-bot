export function formatDigest(content: string) {
  return {
    text: `
<b>📰 Дайджест новостей</b>

${content}

<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>

`,
  };
}

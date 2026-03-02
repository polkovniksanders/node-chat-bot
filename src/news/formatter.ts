export function formatDigest(content: string) {
  const lines = content.trim().split('\n');

  // First non-empty line is the title; strip any stray markdown markers
  let title = '';
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      title = line.replace(/^\*\*(.+)\*\*$/, '$1').replace(/[*#_]/g, '').trim();
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

  const header = title ? `<b>📢 ${title}</b>` : `<b>📢 Котовости</b>`;

  return {
    text: `${header}

${body}

<a href="https://t.me/stepka_and_twitty">⭐ Подписаться</a>
`,
  };
}

import { Context } from 'grammy';
import { gptunnelChat } from '@/ai/gptunnel.js';

const ALLOWED_REACTIONS = [
  '👍','👎','❤️','🔥','🥰','👏','😁','🤔','🤯','😱','🤬','😢','🎉','🤩','🤮',
  '💩','🙏','👌','🕊','🤡','🥱','🥴','😍','🐳','❤‍🔥','🌚','🌭','💯','🤣','⚡',
  '🍌','🏆','💔','🤨','😐','🍓','🍾','💋','🖕','😈','😴','😭','🤓','👻','👀',
  '🎃','🙈','😇','😨','🤝','✍️','🤗','🫡','🎅','🎄','☃️','💅','🤪','🗿','🆒',
  '💘','🙉','🦄','😘','💊','🙊','😎','👾','🤷‍♂️','🤷','🤷‍♀️','😡',
];

const STEPKA_REACTIONS = ['❤️','😍','🤔','😴','🙈','🤣','👀','💅','😎','🥱','🔥','👻','😁','🎉'];

const RANDOM_CHANCE = 0.15;

function randomStepkaReaction(): string {
  return STEPKA_REACTIONS[Math.floor(Math.random() * STEPKA_REACTIONS.length)];
}

async function chooseReactionWithAI(text: string): Promise<string> {
  const prompt = `Ты кот Степка — ироничный, ленивый, любишь тунец. Выбери ОДНО эмодзи-реакцию на сообщение пользователя.
Разрешённые эмодзи: ${ALLOWED_REACTIONS.join(' ')}
Ответь ТОЛЬКО одним эмодзи, без текста.
Сообщение: "${text.slice(0, 200)}"`;

  try {
    const result = await gptunnelChat([{ role: 'user', content: prompt }]);
    const emoji = result.trim();
    if (ALLOWED_REACTIONS.includes(emoji)) return emoji;
  } catch {
    // fallback below
  }
  return randomStepkaReaction();
}

export async function tryReact(ctx: Context, messageId: number, text?: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  try {
    const emoji = text ? await chooseReactionWithAI(text) : randomStepkaReaction();
    await ctx.api.setMessageReaction(chatId, messageId, [{ type: 'emoji', emoji: emoji as any }]);
  } catch {
    // reactions are best-effort, never throw
  }
}

export function shouldReactRandomly(): boolean {
  return Math.random() < RANDOM_CHANCE;
}

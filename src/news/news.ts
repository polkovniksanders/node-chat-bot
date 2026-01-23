import { fetchOpenRouter } from '../openrouter.js';
import { NEWS_PROMPT_EMOJI } from './prompts.js';
import { formatDigest } from './formatter.js';
import { InlineKeyboard } from 'grammy';

export async function getNewsDigestEmoji(): Promise<{
  text: string;
  reply_markup: InlineKeyboard;
}> {
  const raw = await fetchOpenRouter(NEWS_PROMPT_EMOJI);
  return formatDigest(raw);
}

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { bot } from '@/botInstance.js';

interface WhisperEntry {
  id: number;
  userId: number;
  username?: string;
  firstName: string;
  text: string;
  publishedAt: string;
  published: boolean;
}

const WHISPERS_FILE = path.join(process.cwd(), 'data', 'whispers.json');

async function readWhispers(): Promise<WhisperEntry[]> {
  try {
    const content = await readFile(WHISPERS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeWhispers(entries: WhisperEntry[]): Promise<void> {
  const dir = path.dirname(WHISPERS_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(WHISPERS_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

export function setupWhisperHandler(botInstance: typeof bot) {
  botInstance.command('secret', async (ctx) => {
    if (ctx.chat.type !== 'private') {
      await ctx.reply('🤫 Шёпоты принимаются только в личке.');
      return;
    }

    const text = ctx.match.trim();
    if (!text) {
      await ctx.reply('🤫 Напиши текст после команды:\n/secret Твой текст');
      return;
    }

    const channelId = process.env.EVENTS_CHANNEL_ID;
    if (!channelId) {
      await ctx.reply('❌ Канал для шёпотов не настроен.');
      return;
    }

    const whispers = await readWhispers();
    const entry: WhisperEntry = {
      id: whispers.length + 1,
      userId: ctx.from!.id,
      username: ctx.from!.username,
      firstName: ctx.from!.first_name,
      text,
      publishedAt: new Date().toISOString(),
      published: false,
    };

    try {
      await bot.api.sendMessage(channelId, `🤫 Мне тут кое-кто сообщил, что ${text}`, {
        parse_mode: 'HTML',
      });
      entry.published = true;
      await ctx.reply('✅ Твой шёпот услышан и передан в канал 🐾');
    } catch (err) {
      console.error('❌ Ошибка публикации шёпота:', err);
      await ctx.reply('❌ Не удалось передать шёпот. Попробуй позже.');
    }

    whispers.push(entry);
    await writeWhispers(whispers);
  });
}

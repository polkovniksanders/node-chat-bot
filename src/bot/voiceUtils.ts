import { Context } from 'grammy';

export async function downloadVoice(ctx: Context, fileId: string): Promise<Buffer> {
  const file = await ctx.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download voice: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

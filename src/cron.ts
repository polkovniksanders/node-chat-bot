import cron from 'node-cron';
import { getNewsDigestEmoji } from './news/news.js';
import { bot } from './botInstance.js';

const CHANNEL_ID = process.env.CHANNEL_ID!;

cron.schedule('0 9 * * *', async () => {
  const digest = await getNewsDigestEmoji();
  await bot.api.sendMessage(CHANNEL_ID, digest, { parse_mode: 'HTML' });
});

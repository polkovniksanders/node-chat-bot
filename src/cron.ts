import cron from 'node-cron';
import { getNewsDigestEmoji } from './news/news';
import { bot } from './botInstance';

const CHANNEL_ID = process.env.CHANNEL_ID!;

// Каждый день в 09:00
cron.schedule('0 9 * * *', async () => {
  const digest = await getNewsDigestEmoji();
  await bot.api.sendMessage(CHANNEL_ID, digest, { parse_mode: 'HTML' });
});

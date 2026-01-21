import cron from 'node-cron';
import { bot } from '../botInstance';
import { getNewsDigestEmoji } from '../news/news';

export function setupDailyNewsCron() {
  cron.schedule('0 9 * * *', async () => {
    const digest = await getNewsDigestEmoji();
    await bot.api.sendMessage(process.env.CHANNEL_ID!, digest, { parse_mode: 'HTML' });
  });
}

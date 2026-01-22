import 'dotenv/config';

import { bot } from './botInstance';
import { setupDailyNewsCron } from './cron/dailyNews';
import http from 'http';

setupDailyNewsCron();
bot.start().then(() => console.log('Bot started'));
http.createServer(() => {}).listen(process.env.PORT || 3000);

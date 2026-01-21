import 'dotenv/config';
import { createBot } from './bot';
import http from 'http';

const bot = createBot();

bot.start().then(() => console.log('bot start'));

http.createServer(() => {}).listen(process.env.PORT || 3000);

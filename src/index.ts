import 'dotenv/config';
import { createBot } from './bot';

const bot = createBot();

bot.start().then(() => console.log('Step 4: bot.start() called'));

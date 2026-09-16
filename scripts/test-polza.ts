import 'dotenv/config';
import { polzaChat, polzaChatSmart } from '../src/ai/polza.js';

const msg = [{ role: 'user' as const, content: 'Привет! Назови себя одним предложением.' }];

console.log('\n📡 Testing polzaChat (обычная модель)...');
const answer = await polzaChat(msg);
console.log('✅ Response:', answer);

const question = 'Что ты умеешь? Ответь коротко.';
console.log('\n📡 Testing polzaChatSmart (умная модель)...');
const smart = await polzaChatSmart([{ role: 'user', content: question }]);
console.log('✅ Response:', smart);
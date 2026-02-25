import 'dotenv/config';
import { getGptunnelModel } from '../src/ai/gptunnel.js';

const model = await getGptunnelModel();
console.log('Selected model:', model);

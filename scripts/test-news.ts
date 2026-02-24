import 'dotenv/config';
import { writeFileSync } from 'fs';
import { getRecentHistory, generateRandomParams } from '../src/news/news-history.js';
import { generateNewsImage } from '../src/news/image-generator.js';
import { fetchNews } from '../src/news/fetch-news.js';
import { buildNewsDigestPrompt } from '../src/config/prompts.js';

const history = await getRecentHistory();
const params = generateRandomParams(history);

console.log('\n📋 Params:', JSON.stringify(params, null, 2));
console.log('\n⏳ Generating text + image in parallel...\n');

const prompt = buildNewsDigestPrompt(history, params);

const [text, image] = await Promise.all([
  fetchNews(prompt),
  generateNewsImage(params),
]);

console.log('\n📰 News text:\n', text);

if (image) {
  writeFileSync('test-news-image.jpg', image);
  console.log('\n✅ Image saved to test-news-image.jpg');
} else {
  console.log('\n⚠️ No image generated');
}

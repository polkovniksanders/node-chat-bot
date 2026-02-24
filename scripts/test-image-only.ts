import { writeFileSync } from 'fs';

const prompt = 'A cute black cat on a windowsill, cartoon style';
const url =
  'https://image.pollinations.ai/prompt/' +
  encodeURIComponent(prompt) +
  '?width=512&height=512&nologo=true&model=flux';

console.log('Fetching:', url);
const res = await fetch(url);
console.log('Status:', res.status, res.statusText);
console.log('Content-Type:', res.headers.get('content-type'));
const buf = Buffer.from(await res.arrayBuffer());
console.log('Size:', buf.length, 'bytes');
if (buf.length > 1000) {
  writeFileSync('test-pollinations.jpg', buf);
  console.log('✅ Saved to test-pollinations.jpg');
}

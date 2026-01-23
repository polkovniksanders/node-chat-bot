import esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const external = Object.keys(pkg.dependencies || {});

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  external, // Не бандлим node_modules (используем на сервере)
  minify: true, // Минификация
  sourcemap: false, // Без sourcemaps на проде
  treeShaking: true, // Удаление мертвого кода
  splitting: false, // Один файл для Node.js
  metafile: true, // Анализ размера
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

console.log('✅ Build complete');

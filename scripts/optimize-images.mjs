import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const targets = [
  { src: 'public/logo.png', out: 'public/logo.webp', options: { quality: 85, effort: 6 } },
  { src: 'public/weather_center.png', out: 'public/weather_center.webp', options: { quality: 78, effort: 6 } },
];

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

for (const { src, out, options } of targets) {
  try {
    await stat(src);
  } catch {
    console.log(`skip (no existe): ${src}`);
    continue;
  }
  const { width, height } = await sharp(src).webp(options).toFile(out);
  const before = (await stat(src)).size;
  const after = (await stat(out)).size;
  console.log(`${src} -> ${out}  ${width}x${height}  ${kb(before)} -> ${kb(after)} (-${Math.round((1 - after / before) * 100)}%)`);
}

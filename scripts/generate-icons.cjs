const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.resolve('C:/Users/ochen/.gemini/antigravity/brain/80f84782-6a94-4ede-a66b-d5c68517c32d/alertasmeteo_icon_refined_1782826709881.png');
const outDir = path.resolve('./public/icons');
const publicDir = path.resolve('./public');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const size of sizes) {
    const out = path.join(outDir, `icon-${size}x${size}.png`);
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(out);
    console.log(`✓ icon-${size}x${size}.png`);
  }

  // apple-touch-icon 180x180
  await sharp(src)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // favicon 32x32
  await sharp(src)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ favicon.png (32x32)');

  console.log('\nAll icons generated successfully!');
}

run().catch(err => { console.error(err); process.exit(1); });

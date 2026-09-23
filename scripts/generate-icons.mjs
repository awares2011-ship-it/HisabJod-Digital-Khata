import sharp from 'sharp';
import { copyFileSync, mkdirSync } from 'fs';
import path from 'path';

const src = 'D:\\hisabjob logo.png';
const outPublic = 'public';
const outAndroid = 'android/app/src/main/res';

const sizes = [
  { file: `${outPublic}/apple-icon.png`, size: 180 },
  { file: `${outPublic}/icon-192.png`, size: 192 },
  { file: `${outPublic}/icon-512.png`, size: 512 },
  { file: `${outPublic}/icon-light-32x32.png`, size: 32 },
  { file: `${outPublic}/icon-dark-32x32.png`, size: 32 },
  { file: `${outAndroid}/mipmap-mdpi/ic_launcher.png`, size: 48 },
  { file: `${outAndroid}/mipmap-mdpi/ic_launcher_round.png`, size: 48 },
  { file: `${outAndroid}/mipmap-hdpi/ic_launcher.png`, size: 72 },
  { file: `${outAndroid}/mipmap-hdpi/ic_launcher_round.png`, size: 72 },
  { file: `${outAndroid}/mipmap-xhdpi/ic_launcher.png`, size: 96 },
  { file: `${outAndroid}/mipmap-xhdpi/ic_launcher_round.png`, size: 96 },
  { file: `${outAndroid}/mipmap-xxhdpi/ic_launcher.png`, size: 144 },
  { file: `${outAndroid}/mipmap-xxhdpi/ic_launcher_round.png`, size: 144 },
  { file: `${outAndroid}/mipmap-xxxhdpi/ic_launcher.png`, size: 192 },
  { file: `${outAndroid}/mipmap-xxxhdpi/ic_launcher_round.png`, size: 192 },
];

for (const { file, size } of sizes) {
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(file);
    console.log(`✓ ${file} ${size}x${size}`);
  } catch (e) {
    console.error(`✗ ${file}`, e.message);
  }
}
// also copy original to public/icon.png and update icon.svg fallback
try {
  await sharp(src).resize(512,512,{fit:'contain', background:{r:255,g:255,b:255,alpha:0}}).png().toFile(`${outPublic}/icon.png`);
  console.log('✓ public/icon.png');
} catch(e){}

// Keep icon.svg but also update it to embed png? Just copy png as svg placeholder - keep existing svg but ensure manifest points to png
copyFileSync(src, `${outPublic}/hisabjod-logo-original.png`);
console.log('✓ hisabjod-logo-original.png');

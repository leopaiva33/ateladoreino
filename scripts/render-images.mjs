// Renderiza as ilustrações de art/*.svg em PNG (1200x630) dentro de public/images/posts/.
// Uso: npm run images
import { readdir, mkdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import sharp from 'sharp';

const ART_DIR = 'art';
const OUT_DIR = join('public', 'images', 'posts');

await mkdir(OUT_DIR, { recursive: true });

const files = (await readdir(ART_DIR)).filter((f) => f.endsWith('.svg'));
for (const file of files) {
  const name = basename(file, '.svg');
  const svg = await readFile(join(ART_DIR, file));
  const out = join(OUT_DIR, `${name}.png`);
  await sharp(svg, { density: 144 })
    .resize(1200, 630, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log('gerado', out);
}

// Miniaturas (440x231, WebP) para as listas de posts, em public/images/posts/thumbs/.
const THUMB_DIR = join(OUT_DIR, 'thumbs');
await mkdir(THUMB_DIR, { recursive: true });
for (const file of files) {
  const name = basename(file, '.svg');
  const svg = await readFile(join(ART_DIR, file));
  const out = join(THUMB_DIR, `${name}.webp`);
  await sharp(svg, { density: 144 })
    .resize(440, 231, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(out);
  console.log('miniatura', out);
}

// Imagem padrão de compartilhamento (redes sociais não aceitam SVG).
const og = await readFile(join('public', 'og-default.svg'));
await sharp(og, { density: 144 })
  .resize(1200, 630)
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(join('public', 'og-default.png'));
console.log('gerado public/og-default.png');

// Ajuda a escolher as fotos do carrossel (modelo "foto" de scripts/gerar-carrossel.mjs).
// Monta uma folha de contato numerada com as candidatas, para olhar e escolher os ids.
//
// Uso:
//   node scripts/fotos-carrossel.mjs --ids 1323550,1112048,1144176
//       folha com fotos do Pexels já conhecidas (não precisa de chave)
//   PEXELS_API_KEY=... node scripts/fotos-carrossel.mjs "sunrise mountains" [quantidade]
//       busca no Pexels (chave grátis em https://www.pexels.com/api/); prefira termos em inglês
//
// Saída: video-previa/fotos-<nome>.jpg (fora do git) e a lista de ids no terminal. No
// carrossel.json, use "foto": "pexels:<id>". Fotos do Pexels: uso comercial liberado, sem crédito
// obrigatório. Evite fotos com símbolos de uma denominação ou religião específica (terço, imagens
// de santos, Alcorão), texto legível em outra língua e rostos em close.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const iIds = args.indexOf('--ids');
const CHAVE = process.env.PEXELS_API_KEY;
const miniatura = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=360`;

let candidatas = [];
let nome;
if (iIds >= 0) {
  candidatas = args[iIds + 1].split(',').map((id) => ({ id: id.trim(), autor: '' }));
  nome = 'ids';
} else {
  const termo = args.find((a) => !/^\d+$/.test(a));
  const qtd = Number(args.find((a) => /^\d+$/.test(a)) ?? 15);
  if (!termo) {
    console.error('Uso: node scripts/fotos-carrossel.mjs "termo" [quantidade]   ou   --ids 1,2,3');
    process.exit(1);
  }
  if (!CHAVE) {
    console.error('Defina PEXELS_API_KEY para buscar (chave grátis em https://www.pexels.com/api/), ou use --ids.');
    process.exit(1);
  }
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(termo)}&per_page=${qtd}&orientation=portrait`, {
    headers: { Authorization: CHAVE },
  });
  if (!r.ok) throw new Error(`Pexels respondeu HTTP ${r.status}.`);
  const j = await r.json();
  candidatas = j.photos.map((f) => ({ id: String(f.id), autor: f.photographer }));
  nome = termo.replace(/\W+/g, '-').toLowerCase();
}

const W = 240;
const H = 300;
const COLS = 5;
const camadas = [];
const validas = [];
for (const c of candidatas) {
  const r = await fetch(miniatura(c.id));
  if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) {
    console.log(`  ${c.id}: não encontrada`);
    continue;
  }
  const i = validas.length;
  const x = (i % COLS) * W;
  const y = Math.floor(i / COLS) * (H + 30);
  camadas.push({ input: await sharp(Buffer.from(await r.arrayBuffer())).resize(W, H, { fit: 'cover' }).toBuffer(), left: x, top: y });
  camadas.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="30"><rect width="100%" height="100%" fill="#111"/><text x="8" y="21" font-size="17" font-family="sans-serif" fill="#fff">${c.id}</text></svg>`),
    left: x,
    top: y + H,
  });
  validas.push(c);
}
if (!validas.length) throw new Error('Nenhuma foto encontrada.');
await mkdir('video-previa', { recursive: true });
const arquivo = join('video-previa', `fotos-${nome}.jpg`);
const linhas = Math.ceil(validas.length / COLS);
await writeFile(
  arquivo,
  await sharp({ create: { width: COLS * W, height: linhas * (H + 30), channels: 3, background: '#222' } }).composite(camadas).jpeg({ quality: 82 }).toBuffer(),
);
console.log(`folha de contato: ${arquivo}`);
for (const c of validas) console.log(`  pexels:${c.id}${c.autor ? `  (${c.autor})` : ''}`);

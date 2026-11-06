// Gera os slides (PNG 1080x1350, formato 4:5 do Instagram) de um carrossel a partir de
// conteudo-social/<slug>/carrossel.json. Saída: public/social/<slug>/slide-01.png ...
// (a pasta public/ vira endereço público depois do deploy, que a API do Instagram exige).
// Uso: npm run carrossel -- <slug>
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const slug = process.argv[2];
if (!slug) {
  console.error('Uso: npm run carrossel -- <slug>   (ex.: salmo-23-significado)');
  process.exit(1);
}

const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'));
const L = 1080;
const A = 1350;
const MARGEM = 110;
const LARG_TEXTO = L - 2 * MARGEM;
const C = {
  fundo1: '#fff4de',
  fundo2: '#f1cfae',
  vinho: '#7a1f2b',
  ouro: '#b9822f',
  ouroClaro: '#e9b45f',
  texto: '#3b2a2a',
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Renderiza texto com quebra automática (Pango) e devolve {input, w, h}. */
async function texto(
  conteudo,
  { fonte = 'Georgia 46', cor = C.texto, largura = LARG_TEXTO, alinhar = 'centre', estilo = '' } = {},
) {
  let m = esc(conteudo);
  if (estilo.includes('i')) m = `<i>${m}</i>`;
  if (estilo.includes('b')) m = `<b>${m}</b>`;
  const buf = await sharp({
    text: {
      text: `<span foreground="${cor}">${m}</span>`,
      font: fonte,
      width: largura,
      rgba: true,
      align: alinhar,
      spacing: 8,
    },
  })
    .png()
    .toBuffer();
  const meta = await sharp(buf).metadata();
  return { input: buf, w: meta.width, h: meta.height };
}

const fundoSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.fundo1}"/><stop offset="1" stop-color="${C.fundo2}"/></linearGradient>
    <radialGradient id="h" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#f6c97a" stop-opacity=".45"/><stop offset="1" stop-color="#f6c97a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${L}" height="${A}" fill="url(#g)"/>
  <rect width="${L}" height="${A}" fill="url(#h)"/>
  <rect x="36" y="36" width="${L - 72}" height="${A - 72}" rx="18" fill="none" stroke="${C.ouro}" stroke-opacity=".55" stroke-width="3"/>
</svg>`);

const linha = () => ({
  input: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="8"><rect y="2" width="120" height="4" rx="2" fill="${C.ouro}"/></svg>`,
  ),
  w: 120,
  h: 8,
});

/** Empilha blocos centralizados na faixa vertical [topo, base]. */
function empilhar(blocos, topo, base, folga = 44) {
  const total = blocos.reduce((s, b) => s + b.h, 0) + folga * (blocos.length - 1);
  let y = Math.round(topo + Math.max(0, (base - topo - total) / 2));
  return blocos.map((b) => {
    const item = { input: b.input, top: y, left: b.left ?? Math.round((L - b.w) / 2) };
    y += b.h + folga;
    return item;
  });
}

async function slide(s, i, total) {
  const camadas = [];
  const marca = await texto('A TELA DO REINO', { fonte: 'Arial 26', cor: C.ouro, estilo: 'b' });
  camadas.push({ input: marca.input, top: 78, left: Math.round((L - marca.w) / 2) });
  const contador = await texto(`${i + 1} / ${total}`, { fonte: 'Arial 26', cor: C.ouro });
  camadas.push({ input: contador.input, top: A - 98, left: Math.round((L - contador.w) / 2) });

  let blocos = [];
  let topo = 170;
  const base = A - 150;
  let folga = 44;

  if (s.tipo === 'capa') {
    const arte = await sharp(await readFile(spec.arte)).resize(L - 72, 540, { fit: 'cover' }).png().toBuffer();
    camadas.push({ input: arte, top: 130, left: 36 });
    blocos = [
      await texto('DEVOCIONAL', { fonte: 'Arial 30', cor: C.ouro, estilo: 'b' }),
      await texto(s.titulo, { fonte: 'Georgia 74', cor: C.vinho, estilo: 'b' }),
      await texto('Deslize →', { fonte: 'Arial 34', cor: C.ouro }),
    ];
    topo = 690;
  } else if (s.tipo === 'texto' || s.tipo === 'final') {
    if (s.titulo) {
      blocos.push(await texto(s.titulo, { fonte: 'Georgia 66', cor: C.vinho, estilo: 'b' }));
      blocos.push(linha());
    }
    blocos.push(await texto(s.texto, { fonte: 'Georgia 52' }));
    if (s.rodape) blocos.push(await texto(s.rodape, { fonte: 'Arial 34', cor: C.ouro, estilo: 'b' }));
  } else if (s.tipo === 'versiculo') {
    blocos.push(await texto('“', { fonte: 'Georgia 150', cor: C.ouroClaro, largura: 200 }));
    blocos.push(await texto(s.citacao, { fonte: 'Georgia 56', cor: C.vinho, estilo: 'i' }));
    blocos.push(await texto(s.ref, { fonte: 'Arial 34', cor: C.ouro, estilo: 'b' }));
    blocos.push(linha());
    blocos.push(await texto(s.comentario, { fonte: 'Georgia 44' }));
  } else if (s.tipo === 'lista') {
    blocos.push(await texto(s.titulo, { fonte: 'Georgia 66', cor: C.vinho, estilo: 'b' }));
    blocos.push(linha());
    const itens = [];
    for (let k = 0; k < s.itens.length; k++) {
      itens.push(await texto(`${k + 1}. ${s.itens[k]}`, { fonte: 'Georgia 50', alinhar: 'left', largura: LARG_TEXTO - 40 }));
    }
    const larguraMax = Math.max(...itens.map((b) => b.w));
    itens.forEach((b) => (b.left = Math.round((L - larguraMax) / 2)));
    blocos.push(...itens);
    folga = 36;
  } else {
    throw new Error(`Tipo de slide desconhecido: ${s.tipo}`);
  }

  camadas.push(...empilhar(blocos, topo, base, folga));
  return sharp(fundoSvg).composite(camadas).png({ compressionLevel: 9 }).toBuffer();
}

const saida = join('public', 'social', slug);
await mkdir(saida, { recursive: true });
for (let i = 0; i < spec.slides.length; i++) {
  const buf = await slide(spec.slides[i], i, spec.slides.length);
  const arquivo = join(saida, `slide-${String(i + 1).padStart(2, '0')}.png`);
  await sharp(buf).toFile(arquivo);
  console.log('gerado', arquivo);
}

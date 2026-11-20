// Uso: node art/reel-queda/montar.mjs <saida.mp4>
// Monta o Reel 1 da série A Queda (1080x1920): cenas ilustradas com movimento lento,
// textos na tela, raio piscando na cena 1, transições e a trilha do canal.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const REPO = '/home/user/ateladoreino';
const require = createRequire(join(REPO, 'package.json'));
const sharp = require('sharp');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire(join(execFileSync('npm', ['root', '-g']).toString().trim(), 'x.js'))('playwright')); }

const TMP = join(require('node:os').tmpdir(), 'reel-queda/');
const SAIDA = process.argv[2];
mkdirSync(TMP, { recursive: true });

const DUR = 8, FADE = 0.8, FPS = 30;
const CENAS = [
  { arte: 'cena-1', zoom: 'in',
    texto: 'Quando os discípulos voltaram da missão, Jesus disse:',
    citacao: '“Eu via Satanás, como raio, cair do céu.”', ref: 'Lucas 10:18' },
  { arte: 'cena-2', zoom: 'out',
    texto: 'A Bíblia não conta essa história de uma vez.',
    texto2: 'Ao longo dos séculos, a tradição juntou as peças.' },
  { arte: 'cena-3', zoom: 'in',
    citacao: '“Subirei acima das mais altas nuvens e serei semelhante ao Altíssimo.”',
    ref: 'Isaías 14:14 · dito ao rei da Babilônia' },
  { arte: 'cena-4', zoom: 'out',
    texto: 'Muitos cristãos ouvem aí também a voz de Satanás.',
    texto2: 'O nome “Lúcifer” veio da tradução latina deste capítulo.',
    selo: 'A raiz das duas leituras: o orgulho' },
  { arte: 'cena-5', zoom: 'in',
    citacao: '“Perfeito eras nos teus caminhos, desde o dia em que foste criado, até que se achou iniquidade em ti.”',
    ref: 'Ezequiel 28:15 · dito ao rei de Tiro' },
  { arte: 'cena-6', zoom: 'in',
    citacao: '“E houve batalha no céu: Miguel e os seus anjos batalhavam contra o dragão…”',
    ref: 'Apocalipse 12:7' },
  { arte: 'cena-7', zoom: 'out',
    texto: 'A Bíblia não diz quando ele caiu. Mas diz quem o venceu:',
    citacao: 'na cruz, Cristo triunfou.', ref: 'Colossenses 2:15',
    rodape: 'Estudo completo: ateladoreino.com' },
];

const fonte = (f) => 'data:font/ttf;base64,' + readFileSync(join(REPO, 'assets/fonts', f)).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = (c, i) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Playfair;src:url(${fonte('PlayfairDisplay-SemiBoldItalic.ttf')});font-weight:600;font-style:italic}
@font-face{font-family:PlayfairB;src:url(${fonte('PlayfairDisplay-ExtraBold.ttf')});font-weight:800}
@font-face{font-family:Mont;src:url(${fonte('Montserrat-Bold.ttf')});font-weight:700}
@font-face{font-family:Mont;src:url(${fonte('Montserrat-Medium.ttf')});font-weight:500}
html,body{margin:0;width:1080px;height:1920px;background:transparent}
.topo{position:absolute;top:150px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center;
  font:700 28px Mont;letter-spacing:.22em;color:#fbf1dc;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.topo b{color:#f3c76b}
.chip{font:700 24px Mont;letter-spacing:.14em;color:#2a0f16;background:#f3c76b;padding:10px 20px;border-radius:40px}
.bloco{position:absolute;left:80px;right:80px;bottom:420px;color:#fbf1dc;text-shadow:0 3px 18px rgba(0,0,0,.75)}
.texto{font:500 46px/1.35 Mont;margin:0 0 26px}
.cit{font:600 italic 62px/1.25 Playfair;color:#fff7e4;margin:0 0 30px}
.cit.longa{font-size:54px}
.ref{font:700 28px Mont;letter-spacing:.16em;text-transform:uppercase;color:#f3c76b}
.selo{display:inline-block;margin-top:14px;font:700 30px Mont;color:#2a0f16;background:#f3c76b;padding:14px 24px;border-radius:14px}
.rodape{margin-top:34px;font:700 32px Mont;color:#fbf1dc}
</style></head><body>
<div class="topo"><span>A TELA DO <b>REINO</b></span><span class="chip">SÉRIE A QUEDA · ${i + 1}/7</span></div>
<div class="bloco">
${c.texto ? `<p class="texto">${esc(c.texto)}</p>` : ''}
${c.texto2 ? `<p class="texto">${esc(c.texto2)}</p>` : ''}
${c.citacao ? `<p class="cit${c.citacao.length > 90 ? ' longa' : ''}">${esc(c.citacao)}</p>` : ''}
${c.ref ? `<div class="ref">${esc(c.ref)}</div>` : ''}
${c.selo ? `<div class="selo">${esc(c.selo)}</div>` : ''}
${c.rodape ? `<div class="rodape">${esc(c.rodape)}</div>` : ''}
</div></body></html>`;

// 1) Fundos em 2160x3840 (o dobro), para o movimento de câmera ficar suave.
// Se existir art/reel-queda/foto-<cena>.png (imagem realista gerada no Canva), ela é usada no
// lugar da ilustração, com um degradê escuro embaixo para o texto ficar legível.
const DEGRADE = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2160" height="3840">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset=".4" stop-color="#0b0710" stop-opacity="0"/><stop offset=".62" stop-color="#0b0710" stop-opacity=".7"/>
    <stop offset="1" stop-color="#0b0710" stop-opacity=".95"/></linearGradient></defs>
  <rect width="2160" height="3840" fill="url(#g)"/></svg>`);
const temFoto = (nome) => existsSync(join(REPO, 'art/reel-queda', `foto-${nome}.png`));
const fundo = async (nome) => {
  const out = join(TMP, nome + '.png');
  if (temFoto(nome)) {
    await sharp(join(REPO, 'art/reel-queda', `foto-${nome}.png`)).resize(2160, 3840, { fit: 'cover' })
      .composite([{ input: DEGRADE }]).png().toFile(out);
  } else {
    await sharp(readFileSync(join(REPO, 'art/reel-queda', nome + '.svg')), { density: 144 })
      .resize(2160, 3840).png().toFile(out);
  }
  return out;
};
const fundos = [];
for (const c of CENAS) fundos.push(await fundo(c.arte));
const raio = temFoto('cena-1') ? null : await fundo('cena-1-raio');

// 2) Textos em PNG transparente.
const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
const textos = [];
for (const [i, c] of CENAS.entries()) {
  await pag.setContent(html(c, i), { waitUntil: 'load' });
  await pag.evaluate(() => document.fonts.ready);
  const out = join(TMP, `texto-${i + 1}.png`);
  await pag.screenshot({ path: out, omitBackground: true });
  textos.push(out);
}
await nav.close();

// 3) Vídeo.
const N = DUR * FPS;
const zp = (dir) => {
  const z = dir === 'in' ? `1+0.10*on/${N}` : `1.10-0.10*on/${N}`;
  return `zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=${FPS}`;
};
const ent = [];
const add = (arq) => { ent.push('-loop', '1', '-framerate', String(FPS), '-t', String(DUR), '-i', arq); return ent.length / 8 - 1; };
let f = '';
const cenasOut = [];
CENAS.forEach((c, i) => {
  const b = add(fundos[i]);
  const t = add(textos[i]);
  f += `[${b}:v]${zp(c.zoom)},setsar=1[b${i}];`;
  let base = `[b${i}]`;
  if (i === 0 && raio) {
    const r = add(raio);
    f += `[${r}:v]${zp(c.zoom)},format=rgba[r0];`;
    f += `${base}[r0]overlay=enable='between(t,1.2,1.35)+between(t,1.5,1.62)+between(t,4.6,4.72)'[bb0];`;
    base = '[bb0]';
  }
  f += `[${t}:v]format=rgba,fade=t=in:st=0.5:d=0.8:alpha=1[t${i}];`;
  f += `${base}[t${i}]overlay=0:0,format=yuv420p[c${i}];`;
  cenasOut.push(`[c${i}]`);
});
let atual = cenasOut[0], off = 0;
for (let i = 1; i < cenasOut.length; i++) {
  off += DUR - FADE;
  const out = i === cenasOut.length - 1 ? '[v]' : `[x${i}]`;
  f += `${atual}${cenasOut[i]}xfade=transition=fade:duration=${FADE}:offset=${off.toFixed(2)}${out};`;
  atual = out;
}
const total = off + DUR;
const musica = join(REPO, 'assets/musica/fundo.mp3');
const iMus = ent.length / 8;
ent.push('-stream_loop', '-1', '-i', musica);
f += `[${iMus}:a]atrim=0:${total},asetpts=N/SR/TB,volume=0.9,afade=t=in:d=1.5,afade=t=out:st=${total - 3}:d=3[a]`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...ent, '-filter_complex', f, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', String(total), SAIDA], { stdio: 'inherit' });
console.log(`gerado ${SAIDA} (${total.toFixed(1)} s)`);

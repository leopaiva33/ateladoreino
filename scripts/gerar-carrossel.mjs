// Gera os slides do carrossel do Instagram (1080x1350, formato 4:5) a partir de
// conteudo-social/<slug>/carrossel.json, no modelo "foto": foto de fundo escurecida, título em
// Playfair Display, gancho na capa, "isca" no rodapé de cada slide (antecipa o próximo), numeração
// e barra de progresso. Saída: public/social/<slug>/slide-01.jpg ... (a pasta public/ vira endereço
// público depois do deploy, que a API do Instagram exige).
// Uso: npm run carrossel -- <slug>
//
// Com --reel, gera o Reel: os mesmos slides em 1080x1920, dentro da área que a interface do
// Instagram não cobre, sem numeração nem iscas, em sequência, com transições suaves e a música de
// fundo do canal (assets/musica/fundo.mp3). Saída: public/social/<slug>/reel.mp4 e reel-capa.jpg.
// Uso: npm run reel -- <slug>
//
// Com --pin, gera os pins do Pinterest (1000x1500, formato 2:3): pin-1.jpg com a capa e pin-2.jpg
// com o primeiro versículo (ou o primeiro slide de texto), com o endereço do site.
// Uso: npm run pin -- <slug>
//
// Com --previa, grava tudo em video-previa/<slug>/ (fora do git) em vez de public/social/, para
// conferir antes de publicar. Com --json <arquivo>, lê outro carrossel.json (implica --previa).
// Ex.: npm run carrossel -- exemplo --json .claude/skills/carrossel-instagram/exemplo-carrossel.json
//
// Fotos: em cada slide, "foto": "pexels:<id>" (baixada do Pexels e guardada em .cache-carrossel/),
// um endereço https ou um caminho local. Para escolher fotos: scripts/fotos-carrossel.mjs.
// Sem foto, a capa e o slide final usam a ilustração do artigo ("arte") e os outros, fundo vinho.
// Texto entre *asteriscos* sai em itálico dourado (destaque).
//
// Os slides são montados em HTML e fotografados pelo Chromium do Playwright (já vem nas sessões do
// Claude Code na nuvem; no computador, `npm i -g playwright` e `npx playwright install chromium`).
import { readFile, writeFile, mkdir, mkdtemp, rm, access, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const iJson = args.indexOf('--json');
const arqJson = iJson >= 0 ? args[iJson + 1] : null;
const slug = args.find((a, i) => !a.startsWith('--') && (iJson < 0 || i !== iJson + 1));
if (!slug) {
  console.error('Uso: npm run carrossel -- <slug> [--reel | --pin] [--previa]   (ex.: salmo-23-significado)');
  process.exit(1);
}
const reel = args.includes('--reel');
const pin = args.includes('--pin');
const previa = args.includes('--previa') || !!arqJson;
const modo = pin ? 'pin' : reel ? 'reel' : 'feed';

const spec = JSON.parse(await readFile(arqJson ?? join('conteudo-social', slug, 'carrossel.json'), 'utf8'));
const existe = (p) => access(p).then(() => true, () => false);
const url = (p) => pathToFileURL(resolve(p)).href;

// Tamanho e áreas seguras de cada formato. No Reel, a interface do Instagram cobre o topo e,
// principalmente, a base da tela.
const FORMATO = {
  feed: { w: 1080, h: 1350, topo: 0, base: 0 },
  reel: { w: 1080, h: 1920, topo: 250, base: 460 },
  pin: { w: 1000, h: 1500, topo: 40, base: 60 },
}[modo];

// ---------- fotos ----------
const CACHE = '.cache-carrossel';
async function baixar(endereco, destino) {
  if (await existe(destino)) return destino;
  const r = await fetch(endereco);
  if (!r.ok) throw new Error(`Não foi possível baixar ${endereco} (HTTP ${r.status}).`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(destino, Buffer.from(await r.arrayBuffer()));
  return destino;
}
/** Caminho local da foto de um slide: "pexels:<id>", https://... ou caminho no projeto. */
async function foto(ref) {
  if (!ref) return null;
  const pexels = /^pexels:(\d+)$/.exec(ref);
  if (pexels) {
    const id = pexels[1];
    return baixar(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`, join(CACHE, `pexels-${id}.jpg`));
  }
  if (/^https?:\/\//.test(ref)) return baixar(ref, join(CACHE, createHash('sha1').update(ref).digest('hex').slice(0, 16) + '.jpg'));
  if (!(await existe(ref))) throw new Error(`Foto não encontrada: ${ref}`);
  return ref;
}

// ---------- texto ----------
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Escapa e transforma *trecho* em destaque (itálico dourado). */
const rico = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

const css = `
@font-face{font-family:Playfair;src:url(${url('assets/fonts/PlayfairDisplay-ExtraBold.ttf')});font-weight:800}
@font-face{font-family:Playfair;src:url(${url('assets/fonts/PlayfairDisplay-SemiBoldItalic.ttf')});font-weight:600;font-style:italic}
@font-face{font-family:Mont;src:url(${url('assets/fonts/Montserrat-Bold.ttf')});font-weight:700}
@font-face{font-family:Mont;src:url(${url('assets/fonts/Montserrat-Medium.ttf')});font-weight:500}
:root{--vinho-esc:#2a0a10;--ouro:#f5c66e;--creme:#fbf1dc;--k:1;--vt:50%;
  --W:${FORMATO.w}px;--H:${FORMATO.h}px;--topo:${FORMATO.topo}px;--base:${FORMATO.base}px}
*{box-sizing:border-box;margin:0}
body{width:var(--W);height:var(--H);overflow:hidden;background:#000}
.s{position:relative;width:var(--W);height:var(--H);overflow:hidden;color:#fff;font-family:Mont}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.veu{position:absolute;inset:0}
.marca{position:absolute;top:calc(var(--topo) + 58px);left:72px;font:700 25px Mont;letter-spacing:.24em;color:var(--creme);opacity:.95;text-shadow:0 1px 3px rgba(0,0,0,.7),0 0 18px rgba(0,0,0,.45)}
.marca b{color:var(--ouro)}
.num{position:absolute;top:52px;right:72px;font:700 25px Mont;color:var(--creme);opacity:.75;letter-spacing:.08em}
.prog{position:absolute;left:72px;right:72px;bottom:56px;display:flex;gap:8px}
.prog i{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.25)}
.prog i.on{background:var(--ouro);box-shadow:0 0 12px rgba(245,198,110,.6)}
.isca{position:absolute;right:72px;bottom:calc(var(--base) + 96px);font:700 28px Mont;color:var(--vinho-esc);background:var(--ouro);padding:16px 26px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.site{position:absolute;left:0;right:0;bottom:calc(var(--base) + 60px);text-align:center;font:700 32px Mont;color:var(--ouro);letter-spacing:.04em}
.c{position:absolute;left:84px;right:84px}
.c.baixo{bottom:calc(var(--base) + 200px)}
.c.meio{top:50%;transform:translateY(-50%)}
.c.alto{top:calc(var(--topo) + 190px)}
.chapeu{display:inline-block;font:700 calc(var(--k)*27px) Mont;letter-spacing:.18em;text-transform:uppercase;color:var(--ouro);border:2px solid var(--ouro);padding:12px 22px;border-radius:999px}
.chapeu.cheio{background:var(--ouro);color:var(--vinho-esc);box-shadow:0 6px 24px rgba(0,0,0,.35)}
h1{font:800 calc(var(--k)*118px)/1.0 Playfair;letter-spacing:-.015em;text-shadow:0 6px 40px rgba(0,0,0,.55)}
h2{font:800 calc(var(--k)*84px)/1.06 Playfair;text-shadow:0 4px 30px rgba(0,0,0,.5)}
em{font-style:italic;font-weight:600;color:var(--ouro)}
.apoio{font:500 calc(var(--k)*42px)/1.35 Mont;color:var(--creme)}
.texto{font:500 calc(var(--k)*50px)/1.38 Mont;text-shadow:0 2px 20px rgba(0,0,0,.6)}
.texto em{font:italic 600 calc(var(--k)*56px) Playfair}
.frase{font:800 calc(var(--k)*84px)/1.1 Playfair;text-shadow:0 4px 30px rgba(0,0,0,.5)}
.aspas{font:800 calc(var(--k)*240px)/.55 Playfair;color:var(--ouro);height:calc(var(--k)*96px)}
.citacao{font:italic 600 calc(var(--k)*62px)/1.24 Playfair;text-shadow:0 2px 24px rgba(0,0,0,.6)}
.ref{font:700 calc(var(--k)*30px) Mont;letter-spacing:.14em;color:var(--ouro);margin-top:30px;text-transform:uppercase}
.linha{width:120px;height:4px;background:var(--ouro);margin:calc(var(--k)*48px) 0 calc(var(--k)*40px);border-radius:2px}
.destaque{font:800 calc(var(--k)*60px)/1.15 Playfair}
.lista{list-style:none;padding:0;margin-top:calc(var(--k)*50px);display:grid;gap:calc(var(--k)*24px)}
.lista li{display:flex;gap:30px;align-items:center;font:500 calc(var(--k)*44px)/1.25 Mont;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:calc(var(--k)*28px) 32px}
.lista b{font:800 calc(var(--k)*66px) Playfair;color:var(--ouro);min-width:90px}
.oracao{font:italic 600 calc(var(--k)*66px)/1.3 Playfair;text-shadow:0 2px 24px rgba(0,0,0,.6)}
.amem{font:700 30px Mont;letter-spacing:.2em;color:var(--ouro);margin-top:34px}
.botoes{display:flex;gap:22px;margin-top:calc(var(--k)*48px)}
.botoes span{font:700 32px Mont;padding:22px 34px;border-radius:999px;background:var(--ouro);color:var(--vinho-esc)}
.botoes span+span{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.7)}
.rodape{font:700 calc(var(--k)*34px) Mont;color:var(--creme);margin-top:40px;opacity:.9}
`;

const VINHO = `<div class="bg" style="background:radial-gradient(110% 80% at 80% 0%,#a52f40 0%,#5c1521 42%,#1a060b 100%)"></div>
<div class="bg" style="background:radial-gradient(60% 40% at 10% 100%,rgba(245,198,110,.18),transparent)"></div>`;
const escuro = (topo, base) => `linear-gradient(180deg,rgba(12,4,8,${topo}) 0%,rgba(12,4,8,${(topo + base) / 2}) 50%,rgba(12,4,8,${base}) 100%)`;
const VEU = {
  // Capa e final: o escurecimento começa logo acima do texto (--vt, medido depois do layout), para
  // a foto aparecer limpa em cima e o texto ter contraste em qualquer formato (feed, Reel, pin).
  capa: 'linear-gradient(180deg,rgba(0,0,0,.22) 0%,rgba(18,5,9,0) 18%,rgba(18,5,9,0) calc(var(--vt) - 10%),rgba(18,5,9,.62) calc(var(--vt) + 6%),rgba(18,5,9,.95) calc(var(--vt) + 30%))',
  final: 'linear-gradient(180deg,rgba(0,0,0,.2) 0%,rgba(18,5,9,.1) calc(var(--vt) - 10%),rgba(18,5,9,.7) calc(var(--vt) + 6%),rgba(18,5,9,.95) calc(var(--vt) + 30%))',
  versiculo: escuro(0.55, 0.8),
  oracao: escuro(0.68, 0.9),
  texto: escuro(0.4, 0.86),
};

async function fundo(s) {
  const tipo = s.tipo === 'frase' ? 'texto' : s.tipo;
  let arq = await foto(s.foto);
  if (!arq && (tipo === 'capa' || tipo === 'final') && spec.arte && (await existe(spec.arte))) arq = spec.arte;
  if (!arq || tipo === 'lista') return VINHO;
  return `<div class="bg" style="background-image:url('${url(arq)}')"></div><div class="veu" style="background:${s.veu ?? VEU[tipo]}"></div>`;
}

function conteudo(s) {
  switch (s.tipo) {
    case 'capa': {
      const chapeu = s.chapeu ?? 'Devocional';
      return `<div class="c baixo"><span class="chapeu cheio">${esc(chapeu)}</span><h1 style="margin-top:34px">${rico(s.titulo)}</h1>${s.apoio ? `<p class="apoio" style="margin-top:30px">${rico(s.apoio)}</p>` : ''}</div>`;
    }
    case 'versiculo':
      return `<div class="c meio"><div class="aspas">“</div><p class="citacao">${esc(s.citacao)}</p><p class="ref">${esc(s.ref)}</p>${s.destaque || s.comentario ? `<div class="linha"></div><p class="destaque">${rico(s.destaque ?? s.comentario)}</p>` : ''}</div>`;
    case 'lista':
      return `<div class="c alto"><h2>${rico(s.titulo)}</h2><ul class="lista">${s.itens.map((t, k) => `<li><b>${String(k + 1).padStart(2, '0')}</b><span>${rico(t)}</span></li>`).join('')}</ul></div>`;
    case 'oracao':
      return `<div class="c meio">${s.titulo ? `<span class="chapeu cheio">${esc(s.titulo)}</span>` : ''}<p class="oracao" style="margin-top:44px">“${rico(s.texto.replace(/\s*Amém\.?\s*$/i, ''))}”</p><p class="amem">AMÉM</p></div>`;
    case 'final':
      return `<div class="c baixo"><h2 style="font-size:calc(var(--k)*100px)">${rico(s.titulo)}</h2>${s.texto ? `<p class="apoio" style="margin-top:28px">${rico(s.texto)}</p>` : ''}${modo === 'feed' ? `<div class="botoes">${(s.botoes ?? ['Salvar', 'Enviar']).map((b) => `<span>${esc(b)}</span>`).join('')}</div>` : ''}${s.rodape ? `<p class="rodape">${rico(s.rodape)}</p>` : ''}</div>`;
    case 'texto':
    case 'frase':
      return s.titulo
        ? `<div class="c baixo"><h2>${rico(s.titulo)}</h2><p class="texto" style="margin-top:34px">${rico(s.texto)}</p></div>`
        : `<div class="c baixo"><p class="frase">${rico(s.texto)}</p></div>`;
    default:
      throw new Error(`Tipo de slide desconhecido: ${s.tipo}`);
  }
}

async function html(s, i, total) {
  let extras = '';
  if (modo === 'feed') {
    const isca = s.isca ?? (s.tipo === 'capa' ? 'Deslize' : null);
    extras += `<div class="num">${i + 1}/${total}</div>`;
    if (isca && s.tipo !== 'final') extras += `<div class="isca">${esc(isca)} →</div>`;
    extras += `<div class="prog">${Array.from({ length: total }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
  } else if (modo === 'pin') {
    extras += `<div class="site">ateladoreino.com</div>`;
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="s">${await fundo(s)}${conteudo(s)}<div class="marca">A TELA DO <b>REINO</b></div>${extras}</div></body></html>`;
}

/** Reduz a escala do texto (variável --k) até o bloco caber entre a marca e a isca. */
async function ajustar(p) {
  await p.evaluate(({ topo, base, h }) => {
    const c = document.querySelector('.c');
    const limTopo = topo + 120;
    const limBase = h - base - 150;
    for (let k = 1; k >= 0.6; k -= 0.03) {
      document.documentElement.style.setProperty('--k', k.toFixed(2));
      const r = c.getBoundingClientRect();
      if (r.top >= limTopo && r.bottom <= limBase) break;
    }
    const topoTexto = c.getBoundingClientRect().top;
    document.documentElement.style.setProperty('--vt', `${(((topoTexto - 40) / h) * 100).toFixed(1)}%`);
  }, FORMATO);
}

async function carregarPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const raizGlobal = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(join(raizGlobal, 'x.js'))('playwright');
  }
}

const { chromium } = await carregarPlaywright();
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: FORMATO.w, height: FORMATO.h } });
const tmp = await mkdtemp(join(tmpdir(), 'carrossel-'));

/** Renderiza um slide e devolve o PNG (buffer). */
async function slide(s, i, total) {
  const arq = join(tmp, `s${i}.html`);
  await writeFile(arq, await html(s, i, total));
  await pagina.goto(url(arq));
  await pagina.evaluate(() => document.fonts.ready);
  await ajustar(pagina);
  return pagina.screenshot({ type: 'png' });
}

const saida = previa ? join('video-previa', slug) : join('public', 'social', slug);
await mkdir(saida, { recursive: true });

try {
  if (pin) {
    const capa = spec.slides.find((s) => s.tipo === 'capa');
    const segundo = spec.slides.find((s) => s.tipo === 'versiculo') ?? spec.slides.find((s) => s.tipo === 'texto' || s.tipo === 'frase');
    for (const [n, s] of [[1, capa], [2, segundo]]) {
      if (!s) continue;
      const arquivo = join(saida, `pin-${n}.jpg`);
      await sharp(await slide(s, 0, 1)).jpeg({ quality: 88, mozjpeg: true }).toFile(arquivo);
      console.log('gerado', arquivo);
    }
  } else if (!reel) {
    // Slides em JPEG (com foto, PNG ficaria cerca de 10 vezes maior). Remove os PNG do modelo antigo.
    for (const f of (await readdir(saida)).filter((f) => /^slide-\d+\.png$/.test(f))) await rm(join(saida, f));
    for (let i = 0; i < spec.slides.length; i++) {
      const arquivo = join(saida, `slide-${String(i + 1).padStart(2, '0')}.jpg`);
      await sharp(await slide(spec.slides[i], i, spec.slides.length)).jpeg({ quality: 88, mozjpeg: true }).toFile(arquivo);
      console.log('gerado', arquivo);
    }
  } else {
    // Tempo de cada slide: o suficiente para ler com calma (capa e final, mais curtos).
    const palavras = (s) => [s.titulo, s.texto, s.citacao, s.ref, s.destaque ?? s.comentario, s.apoio, ...(s.itens ?? [])].filter(Boolean).join(' ').split(/\s+/).length;
    const duracao = (s) => (s.tipo === 'capa' ? 3 : s.tipo === 'final' ? 3.5 : Math.min(6.5, Math.max(3.5, 1.5 + palavras(s) * 0.22)));
    const FADE = 0.6;
    const entradas = [];
    const durs = [];
    for (let i = 0; i < spec.slides.length; i++) {
      const quadro = join(tmp, `q${i}.png`);
      await writeFile(quadro, await slide(spec.slides[i], i, spec.slides.length));
      if (i === 0) await sharp(quadro).jpeg({ quality: 88 }).toFile(join(saida, 'reel-capa.jpg'));
      const d = duracao(spec.slides[i]) + (i < spec.slides.length - 1 ? FADE : 0);
      durs.push(d);
      entradas.push('-loop', '1', '-framerate', '30', '-t', d.toFixed(2), '-i', quadro);
    }
    // Transições em cadeia: cada slide entra com fade sobre o anterior.
    let filtro = '';
    let atual = '[0:v]';
    let deslocamento = 0;
    for (let i = 1; i < durs.length; i++) {
      deslocamento += durs[i - 1] - FADE;
      const saidaV = i === durs.length - 1 ? '[v]' : `[x${i}]`;
      filtro += `${atual}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${deslocamento.toFixed(2)}${saidaV};`;
      atual = saidaV;
    }
    const total = deslocamento + durs[durs.length - 1];
    const musica = 'assets/musica/fundo.mp3';
    const temMusica = await existe(musica);
    const argsFf = ['-y', '-loglevel', 'error', ...entradas];
    if (temMusica) {
      argsFf.push('-stream_loop', '-1', '-i', musica);
      filtro += `[${durs.length}:a]atrim=0:${total.toFixed(2)},asetpts=N/SR/TB,volume=0.8,afade=t=in:d=1,afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5[a]`;
    } else filtro = filtro.replace(/;$/, '');
    argsFf.push('-filter_complex', filtro, '-map', '[v]');
    if (temMusica) argsFf.push('-map', '[a]', '-c:a', 'aac', '-b:a', '128k');
    argsFf.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-t', total.toFixed(2), join(saida, 'reel.mp4'));
    execFileSync('ffmpeg', argsFf, { stdio: 'inherit' });
    console.log(`gerado ${join(saida, 'reel.mp4')} (${total.toFixed(1)} s${temMusica ? ', com música' : ''})`);
  }
} finally {
  await navegador.close();
  await rm(tmp, { recursive: true, force: true });
}

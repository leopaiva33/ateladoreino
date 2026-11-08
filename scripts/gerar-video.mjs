// Gera o vídeo do YouTube (1920x1080) de um artigo a partir de:
//   conteudo-social/<slug>/youtube.md  -> narração de cada seção ("### N. ..." + "**Narração:**")
//   conteudo-social/<slug>/video.json  -> cenas de cada seção (cartões no estilo da marca)
// Saída em video-out/<slug>/: video.mp4, legendas.srt, miniatura.png (fora do git).
//
// Voz:
//   - ElevenLabs (voz clonada): defina ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID.
//   - Sem essas variáveis, usa a voz sintética do espeak-ng, se instalada (provisória, só para testar),
//     ou silêncio com a duração estimada da fala. Para forçar uma delas: VOZ_PROVISORIA=espeak|silencio.
// Música de fundo opcional: assets/musica/fundo.mp3 (abaixa sozinha durante a narração).
//
// Uso: npm run video -- <slug> [--so-cenas]
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const slug = process.argv[2];
if (!slug) {
  console.error('Uso: npm run video -- <slug>   (ex.: confiar-em-deus-nos-tempos-dificeis)');
  process.exit(1);
}
const soCenas = process.argv.includes('--so-cenas');
const existe = (p) => access(p).then(() => true, () => false);

const W = 1920;
const H = 1080;
const FPS = 30;
const PAUSA = 0.6; // segundos de respiro depois de cada seção
const C = {
  fundo1: '#fff4de',
  fundo2: '#f1cfae',
  vinho: '#7a1f2b',
  ouro: '#b9822f',
  ouroClaro: '#e9b45f',
  texto: '#3b2a2a',
};

const pasta = join('conteudo-social', slug);
const spec = JSON.parse(await readFile(join(pasta, 'video.json'), 'utf8'));
const roteiro = await readFile(join(pasta, 'youtube.md'), 'utf8');
const saida = join('video-out', slug);
const cache = join('.cache-video', slug);
await mkdir(join(saida, 'cenas'), { recursive: true });
await mkdir(cache, { recursive: true });

// ---------- Roteiro: narração por seção ----------
const secoesMd = [];
for (const bloco of roteiro.split(/^### /m).slice(1)) {
  const titulo = bloco.split('\n')[0].replace(/^\d+\.\s*/, '').replace(/\s*\(.*\)\s*$/, '').trim();
  const narr = bloco.match(/\*\*Narração:\*\*\s*\n([\s\S]*?)(?=\n\*\*Na tela|\n### |$)/)?.[1]?.trim();
  if (narr) secoesMd.push({ titulo, narracao: narr.replace(/\s*\n\s*\n\s*/g, '\n\n') });
}
if (secoesMd.length !== spec.secoes.length) {
  throw new Error(`youtube.md tem ${secoesMd.length} seções com narração; video.json tem ${spec.secoes.length}.`);
}

/** Ajusta o texto para a fala: referências bíblicas e números ordinais de livros. */
function paraFala(t) {
  const ord = { 1: 'Primeira', 2: 'Segunda', 3: 'Terceira' };
  const ordM = { 1: 'Primeiro', 2: 'Segundo' };
  return t
    .replace(/\b([123]) (Pedro|João|Timóteo|Tessalonicenses|Coríntios)\b/g, (_, n, l) => `${ord[n]} ${l}`)
    .replace(/\b([12]) (Reis|Samuel|Crônicas)\b/g, (_, n, l) => `${ordM[n]} ${l}`)
    .replace(/(\d+):(\d+)-(\d+)/g, '$1, versículos $2 a $3')
    .replace(/(\d+):(\d+)/g, '$1, versículo $2')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Voz ----------
const KEY = process.env.ELEVENLABS_API_KEY;
const VOZ = process.env.ELEVENLABS_VOICE_ID;
const MODELO = process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2';
const temEspeak = await run('espeak-ng', ['--version']).then(() => true, () => false);
const MODO = KEY && VOZ ? 'elevenlabs' : (process.env.VOZ_PROVISORIA ?? (temEspeak ? 'espeak' : 'silencio'));

async function duracao(arquivo) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo]);
  return parseFloat(stdout);
}

async function narrar(texto, anterior, posterior) {
  const fala = paraFala(texto);
  const id = createHash('sha1').update(`${MODO === 'elevenlabs' ? VOZ + MODELO : MODO}|${fala}`).digest('hex').slice(0, 16);
  const arq = join(cache, `${id}.${MODO === 'elevenlabs' ? 'mp3' : 'wav'}`);
  if (!(await existe(arq))) {
    if (MODO === 'elevenlabs') {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({
          text: fala,
          model_id: MODELO,
          previous_text: anterior ? paraFala(anterior) : undefined,
          next_text: posterior ? paraFala(posterior) : undefined,
          voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true },
        }),
      });
      if (!r.ok) throw new Error(`ElevenLabs respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
      await writeFile(arq, Buffer.from(await r.arrayBuffer()));
    } else if (MODO === 'espeak') {
      await run('espeak-ng', ['-v', 'pt-br', '-s', '150', '-g', '4', '-w', arq, fala]);
    } else {
      const seg = (fala.split(' ').length / 140) * 60; // ~140 palavras por minuto
      await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', seg.toFixed(2), arq]);
    }
  }
  return { arq, dur: await duracao(arq) };
}

// ---------- Cenas (cartões 1920x1080) ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
async function texto(conteudo, { fonte = 'Georgia 60', cor = C.texto, largura = 1500, alinhar = 'centre', estilo = '' } = {}) {
  let m = esc(conteudo);
  if (estilo.includes('i')) m = `<i>${m}</i>`;
  if (estilo.includes('b')) m = `<b>${m}</b>`;
  const buf = await sharp({
    text: { text: `<span foreground="${cor}">${m}</span>`, font: fonte, width: largura, rgba: true, align: alinhar, spacing: 12, dpi: 110 },
  })
    .png()
    .toBuffer();
  const meta = await sharp(buf).metadata();
  return { input: buf, w: meta.width, h: meta.height };
}
const linha = () => ({
  input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="140" height="8"><rect y="2" width="140" height="4" rx="2" fill="${C.ouro}"/></svg>`),
  w: 140,
  h: 8,
});

/** Ilustração de fundo: art/cenas/<nome>.svg ou public/images/posts/<nome>.png, em 1920x1080. */
const imagens = new Map();
async function imagem(nome) {
  if (!imagens.has(nome)) {
    const svg = join('art', 'cenas', `${nome}.svg`);
    const png = join('public', 'images', 'posts', `${nome}.png`);
    let buf;
    if (await existe(svg)) buf = await sharp(svg, { density: 96 }).resize(W, H, { fit: 'cover' }).png().toBuffer();
    else if (await existe(png)) buf = await sharp(png).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).png().toBuffer();
    else if (await existe(nome)) buf = await sharp(nome).resize(W, H, { fit: 'cover' }).png().toBuffer();
    else throw new Error(`Imagem de fundo não encontrada: "${nome}" (art/cenas/${nome}.svg ou public/images/posts/${nome}.png)`);
    imagens.set(nome, buf);
  }
  return imagens.get(nome);
}

/** Desloca a ilustração (ampliada) para o lado oposto ao painel, para o assunto da cena ficar visível. */
async function fundoDeslocado(buf, lado) {
  if (lado !== 'esquerda' && lado !== 'direita') return buf;
  const ESC = 1.42;
  const w = Math.round(W * ESC);
  const h = Math.round(H * ESC);
  const foco = lado === 'direita' ? 0.3 : 0.7; // onde o centro da ilustração fica no quadro
  const left = Math.min(w - W, Math.max(0, Math.round(w / 2 - foco * W)));
  const top = Math.round((h - H) / 2);
  return sharp(buf).resize(w, h).extract({ left, top, width: W, height: H }).png().toBuffer();
}

async function cena(c) {
  const lado = c.tipo === 'arte' ? 'centro' : (c.lado ?? spec.lado ?? 'direita');
  const camadas = [{ input: await fundoDeslocado(await imagem(c.fundo ?? spec.arte), lado), top: 0, left: 0 }];
  const base = () => sharp({ create: { width: W, height: H, channels: 3, background: '#000' } });

  if (c.tipo === 'arte') {
    if (c.titulo) {
      const faixa = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#2a0d12" stop-opacity="0"/><stop offset="1" stop-color="#2a0d12" stop-opacity=".78"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#v)"/></svg>`,
      );
      camadas.push({ input: faixa, top: 0, left: 0 });
      const blocos = [await texto(c.titulo, { fonte: 'Georgia 96', cor: '#fff7e8', estilo: 'b', largura: 1600 })];
      if (c.subtitulo) blocos.push(await texto(c.subtitulo, { fonte: 'Georgia 50', cor: C.ouroClaro, estilo: 'i' }));
      let y = H - 90 - blocos.reduce((s, b) => s + b.h, 0) - 24 * (blocos.length - 1);
      for (const b of blocos) {
        camadas.push({ input: b.input, top: y, left: Math.round((W - b.w) / 2) });
        y += b.h + 24;
      }
    }
    return base().composite(camadas).png().toBuffer();
  }

  // Cartão: painel claro sobre a ilustração. O texto encolhe até caber no painel.
  const lateral = lado === 'esquerda' || lado === 'direita';
  const LARG = lateral ? 720 : 1240;
  const folga = c.tipo === 'lista' ? 22 : 28;
  const ALT_MAX = H - 280;
  let blocos;
  let altTexto;
  for (let k = lateral ? 0.82 : 1; ; k -= 0.06) {
    const F = (nome, tam) => `${nome} ${Math.round(tam * k)}`;
    blocos = [await texto('A TELA DO REINO', { fonte: 'Arial 22', cor: C.ouro, estilo: 'b' })];
    if (c.tipo === 'versiculo') {
      blocos.push(await texto('“', { fonte: F('Georgia', 110), cor: C.ouroClaro, largura: 200 }));
      blocos.push(await texto(c.citacao, { fonte: F('Georgia', 58), cor: C.vinho, estilo: 'i', largura: LARG }));
      blocos.push(await texto(c.ref, { fonte: F('Arial', 36), cor: C.ouro, estilo: 'b' }));
      if (c.comentario) blocos.push(linha(), await texto(c.comentario, { fonte: F('Georgia', 44), largura: LARG }));
    } else if (c.tipo === 'lista') {
      blocos.push(await texto(c.titulo, { fonte: F('Georgia', 66), cor: C.vinho, estilo: 'b', largura: LARG }), linha());
      const itens = [];
      for (let n = 0; n < c.itens.length; n++) {
        itens.push(await texto(`${c.numerar === false ? '•' : `${n + 1}.`} ${c.itens[n]}`, { fonte: F('Georgia', 46), alinhar: 'left', largura: LARG }));
      }
      const larg = Math.max(...itens.map((b) => b.w));
      itens.forEach((b) => (b.left = Math.round((W - larg) / 2)));
      blocos.push(...itens);
    } else if (c.tipo === 'texto' || c.tipo === 'aviso') {
      if (c.titulo) blocos.push(await texto(c.titulo, { fonte: F('Georgia', 70), cor: C.vinho, estilo: 'b', largura: LARG }), linha());
      blocos.push(await texto(c.texto, { fonte: F('Georgia', c.tipo === 'aviso' ? 48 : 54), largura: LARG }));
      if (c.rodape) blocos.push(await texto(c.rodape, { fonte: F('Arial', 36), cor: C.ouro, estilo: 'b', largura: LARG }));
    } else {
      throw new Error(`Tipo de cena desconhecido: ${c.tipo}`);
    }
    altTexto = blocos.reduce((sm, b) => sm + b.h, 0) + folga * (blocos.length - 1);
    if (altTexto <= ALT_MAX || k < 0.5) break;
  }
  const pw = lateral ? 880 : Math.min(W - 160, Math.max(980, Math.max(...blocos.map((b) => b.w)) + 200));
  const ph = Math.min(H - 120, altTexto + 150);
  const px = lado === 'direita' ? W - pw - 110 : lado === 'esquerda' ? 110 : Math.round((W - pw) / 2);
  const cx = px + pw / 2; // centro horizontal do painel
  const py = Math.round((H - ph) / 2);
  const painel = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter></defs>
    <rect width="${W}" height="${H}" fill="#1c0d12" fill-opacity="${lateral ? '.08' : '.18'}"/>
    <rect x="${px + 6}" y="${py + 18}" width="${pw}" height="${ph}" rx="28" fill="#1c0d12" fill-opacity=".45" filter="url(#s)"/>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="28" fill="#fff7e8" fill-opacity=".93"/>
    <rect x="${px + 14}" y="${py + 14}" width="${pw - 28}" height="${ph - 28}" rx="20" fill="none" stroke="${C.ouro}" stroke-opacity=".55" stroke-width="2.5"/>
  </svg>`);
  camadas.push({ input: painel, top: 0, left: 0 });
  let y = Math.round(py + (ph - altTexto) / 2);
  for (const b of blocos) {
    const left = b.left !== undefined ? b.left + Math.round(cx - W / 2) : Math.round(cx - b.w / 2);
    camadas.push({ input: b.input, top: y, left });
    y += b.h + folga;
  }
  return base().composite(camadas).png().toBuffer();
}

// ---------- Montagem ----------
const clipes = [];
const audios = [];
const legendas = [];
let t = 0;
let nCena = 0;
for (let i = 0; i < spec.secoes.length; i++) {
  const { narracao } = secoesMd[i];
  const voz = soCenas
    ? { dur: (paraFala(narracao).split(' ').length / 140) * 60 }
    : await narrar(narracao, secoesMd[i - 1]?.narracao, secoesMd[i + 1]?.narracao);
  const durSecao = voz.dur + PAUSA;
  if (voz.arq) audios.push({ arq: voz.arq, dur: voz.dur });

  // Legendas: frases com tempo proporcional ao tamanho.
  const frases = narracao.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g).map((f) => f.trim()).filter(Boolean);
  const totalChars = frases.reduce((s, f) => s + f.length, 0);
  let tf = t;
  for (const f of frases) {
    const d = (voz.dur * f.length) / totalChars;
    legendas.push({ ini: tf, fim: tf + d, texto: f });
    tf += d;
  }

  // Cenas da seção: duração dividida pelo peso de cada uma.
  const cenas = spec.secoes[i].cenas;
  const pesoTotal = cenas.reduce((s, c) => s + (c.peso ?? 1), 0);
  for (const c of cenas) {
    const d = (durSecao * (c.peso ?? 1)) / pesoTotal;
    const png = join(saida, 'cenas', `${String(++nCena).padStart(2, '0')}.png`);
    await writeFile(png, await cena(c));
    clipes.push({ png, dur: d, zoom: c.tipo === 'arte' });
  }
  t += durSecao;
}
console.log(`${nCena} cenas, ${t.toFixed(1)} s de vídeo${MODO === 'elevenlabs' ? '' : ` (voz provisória: ${MODO})`}.`);
if (soCenas) process.exit(0);

// Cada cena vira um clipe com zoom lento (ilustração) ou leve aproximação (cartões) e fade.
const partes = [];
for (let k = 0; k < clipes.length; k++) {
  const { png, dur, zoom } = clipes[k];
  const n = Math.ceil(dur * FPS);
  const z = zoom ? 0.12 : 0.03;
  const mp4 = join(saida, 'cenas', `${String(k + 1).padStart(2, '0')}.mp4`);
  const fade = Math.min(0.4, dur / 4);
  await run('ffmpeg', [
    '-y', '-v', 'error', '-loop', '1', '-i', png,
    '-vf',
    `scale=${W * 2}:${H * 2},zoompan=z='1+${z}*on/${n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${n}:s=${W}x${H}:fps=${FPS},` +
      `fade=t=in:st=0:d=${fade},fade=t=out:st=${(dur - fade).toFixed(3)}:d=${fade},format=yuv420p`,
    '-frames:v', String(n), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', mp4,
  ]);
  partes.push(mp4);
}
const lista = join(saida, 'cenas', 'lista.txt');
await writeFile(lista, partes.map((p) => `file '${p.split('/').pop()}'`).join('\n'));
const soVideo = join(saida, 'so-video.mp4');
await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', soVideo]);

// Áudio: seções com a pausa entre elas; música opcional com ducking.
const entradas = [];
const filtros = [];
audios.forEach((a, k) => {
  entradas.push('-i', a.arq);
  filtros.push(`[${k}:a]aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur=${(a.dur + PAUSA).toFixed(3)}[a${k}]`);
});
filtros.push(`${audios.map((_, k) => `[a${k}]`).join('')}concat=n=${audios.length}:v=0:a=1,apad=pad_dur=5,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${t.toFixed(3)}[voz]`);
const musica = 'assets/musica/fundo.mp3';
let mapa = '[voz]';
if (await existe(musica)) {
  entradas.push('-stream_loop', '-1', '-i', musica);
  const m = audios.length;
  filtros.push(`[voz]asplit=2[v1][v2]`);
  filtros.push(`[${m}:a]volume=0.25,atrim=0:${t.toFixed(2)},afade=t=out:st=${(t - 3).toFixed(2)}:d=3[mus]`);
  filtros.push(`[mus][v2]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[musd]`);
  filtros.push(`[v1][musd]amix=inputs=2:duration=first:normalize=0[mix]`);
  mapa = '[mix]';
}
const audio = join(saida, 'audio.m4a');
await run('ffmpeg', ['-y', '-v', 'error', ...entradas, '-filter_complex', filtros.join(';'), '-map', mapa, '-c:a', 'aac', '-b:a', '192k', audio]);

const final = join(saida, 'video.mp4');
await run('ffmpeg', ['-y', '-v', 'error', '-i', soVideo, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final]);

// Legendas SRT.
const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
await writeFile(join(saida, 'legendas.srt'), legendas.map((l, k) => `${k + 1}\n${ts(l.ini)} --> ${ts(l.fim)}\n${l.texto}\n`).join('\n'));

// Miniatura 1280x720.
const mini = spec.miniatura;
const sombra = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a0d12" stop-opacity=".82"/><stop offset=".6" stop-color="#2a0d12" stop-opacity="0"/></linearGradient></defs><rect width="1280" height="720" fill="url(#v)"/></svg>`,
);
const tTit = await texto(mini.titulo, { fonte: 'Arial Black 62', cor: '#fff7e8', estilo: 'b', largura: 560, alinhar: 'left' });
const tSub = await texto(mini.subtitulo, { fonte: 'Georgia 34', cor: C.ouroClaro, estilo: 'i', largura: 560, alinhar: 'left' });
await sharp(await readFile(spec.arte))
  .resize(1280, 720, { fit: 'cover' })
  .composite([
    { input: sombra, top: 0, left: 0 },
    { input: tTit.input, top: Math.round((720 - tTit.h - tSub.h - 20) / 2), left: 60 },
    { input: tSub.input, top: Math.round((720 + tTit.h - tSub.h + 20) / 2), left: 60 },
  ])
  .png()
  .toFile(join(saida, 'miniatura.png'));

console.log(`Pronto: ${final} (${(await duracao(final)).toFixed(1)} s), legendas.srt e miniatura.png em ${saida}/`);

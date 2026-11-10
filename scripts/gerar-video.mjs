// Gera o vídeo do YouTube (1920x1080) de um artigo a partir de:
//   conteudo-social/<slug>/youtube.md  -> narração de cada seção ("### N. ..." + "**Narração:**")
//   conteudo-social/<slug>/video.json  -> cenas de cada seção (cartões no estilo da marca)
// Saída em video-out/<slug>/: video.mp4, legendas.srt, miniatura.png (fora do git).
//
// Voz:
//   - ElevenLabs (voz clonada): defina ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID.
//   - Sem essas variáveis, usa a voz sintética do espeak-ng, se instalada (provisória, só para testar),
//     ou silêncio com a duração estimada da fala. Para forçar uma delas: VOZ_PROVISORIA=espeak|silencio.
// Fundo de cada cena: a foto escolhida em imagens.json (Pixabay ou Pexels; ver buscar-imagens.mjs) ou, sem foto,
// a ilustração de "fundo" (art/cenas/*.svg ou public/images/posts/*.png). SEM_FOTOS=1 ignora as fotos.
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

// Fotos dos bancos de imagens escolhidas para as cenas (conteudo-social/<slug>/imagens.json, gerado por buscar-imagens.mjs).
const arqFotos = join(pasta, 'imagens.json');
const fotos = {};
if (!process.env.SEM_FOTOS && (await existe(arqFotos))) {
  for (const [chave, e] of Object.entries(JSON.parse(await readFile(arqFotos, 'utf8')))) if (e.escolhida) fotos[chave] = e.escolhida;
}
async function foto(f) {
  const arq = join(cache, 'fotos', `${f.id}.jpg`);
  if (!(await existe(arq))) {
    await mkdir(join(cache, 'fotos'), { recursive: true });
    const ua = { headers: { 'user-agent': 'ateladoreino-video/1.0 (+https://ateladoreino.com)' } };
    const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
    // Pede ao servidor, esperando e tentando de novo quando o banco limita os pedidos (429).
    const pedir = async (url) => {
      for (let tentativa = 0; ; tentativa++) {
        const resp = await fetch(url, ua);
        if (resp.status !== 429 || tentativa >= 5) return resp;
        await espera(Number(resp.headers.get('retry-after')) * 1000 || 4000 * 2 ** tentativa);
      }
    };
    // Os links do Pixabay expiram em 24 h: com a chave, pede um link novo pelo id antes de baixar.
    let src = f.src;
    if (f.id.startsWith('pixabay-') && process.env.PIXABAY_API_KEY) {
      const rApi = await pedir(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&id=${f.id.slice(8)}`);
      if (rApi.ok) src = (await rApi.json()).hits?.[0]?.largeImageURL ?? src;
    }
    const r = await pedir(src);
    if (!r.ok) throw new Error(`Não consegui baixar a foto ${f.id} (${r.status}).`);
    await writeFile(arq, Buffer.from(await r.arrayBuffer()));
  }
  return sharp(arq).resize(W, H, { fit: 'cover', position: 'attention', kernel: 'lanczos3' }).png().toBuffer();
}

// ---------- Estilo das cenas ----------
// Foto em tela cheia e o texto direto sobre a parte mais "limpa" da imagem (céu, fundo liso),
// em Montserrat, sem caixa: escuro sobre fundo claro, branco com sombra suave sobre fundo escuro.
const FONTE_BOLD = 'assets/fonts/Montserrat-Bold.ttf';
const FONTE_MEDIA = 'assets/fonts/Montserrat-Medium.ttf';
async function mont(conteudo, { peso = 'Bold', tam = 60, cor = '#1b1410', largura = 860, alinhar = 'centre' } = {}) {
  const buf = await sharp({
    text: {
      text: `<span foreground="${cor}">${esc(conteudo)}</span>`,
      font: `Montserrat ${peso} ${tam}`,
      fontfile: peso === 'Bold' ? FONTE_BOLD : FONTE_MEDIA,
      width: largura,
      rgba: true,
      align: alinhar,
      spacing: Math.round(tam * 0.08),
      dpi: 110,
    },
  })
    .png()
    .toBuffer();
  const meta = await sharp(buf).metadata();
  return { input: buf, w: meta.width, h: meta.height };
}

/** Analisa as metades da imagem: escolhe a mais lisa para o texto e mede o brilho dela. */
async function analisar(buf) {
  const { data, info } = await sharp(buf).resize(96, 54, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const metade = (x0, x1) => {
    const v = [];
    for (let y = 4; y < info.height - 4; y++) for (let x = x0; x < x1; x++) v.push(data[y * info.width + x] / 255);
    const m = v.reduce((s, a) => s + a, 0) / v.length;
    const dp = Math.sqrt(v.reduce((s, a) => s + (a - m) ** 2, 0) / v.length);
    return { m, dp };
  };
  return { esquerda: metade(4, 46), direita: metade(50, 92), centro: metade(24, 72) };
}

/** Sombra suave (para texto claro sobre fundo escuro). */
async function sombraTexto(bloco) {
  const pad = 30;
  const preto = await sharp(bloco.input).ensureAlpha().linear([0, 0, 0, 0.75], [0, 0, 0, 0]).toBuffer();
  const input = await sharp(preto)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .blur(9)
    .png()
    .toBuffer();
  return { input, pad };
}

async function cena(c, chave) {
  const fundoBuf = fotos[chave] ? await foto(fotos[chave]) : await imagem(c.fundo ?? spec.arte);
  const camadas = [{ input: fundoBuf, top: 0, left: 0 }];
  const base = () => sharp({ create: { width: W, height: H, channels: 3, background: '#000' } });
  const an = await analisar(fundoBuf);

  // Texto centralizado no quadro (padrão). Uma cena pode pedir "lado": "esquerda" ou "direita".
  const lado = c.lado ?? 'centro';
  const regiao = an[lado];
  const claro = regiao.m > 0.56; // fundo claro -> texto escuro
  const cor = claro ? '#1b1410' : '#fffaf2';
  const corRef = claro ? '#3a2a22' : '#f3e6d0';
  const LARG = lado === 'centro' ? 1300 : 900;
  const cx = lado === 'esquerda' ? W * 0.27 : lado === 'direita' ? W * 0.73 : W / 2;

  // Véu suave (sem caixa) atrás do texto, só para garantir a leitura.
  const veu = claro
    ? `<radialGradient id="v" cx="${cx / W}" cy=".48" r=".5"><stop offset="0" stop-color="#fff6e6" stop-opacity=".4"/><stop offset="1" stop-color="#fff6e6" stop-opacity="0"/></radialGradient>`
    : `<radialGradient id="v" cx="${cx / W}" cy=".48" r=".55"><stop offset="0" stop-color="#120a06" stop-opacity=".45"/><stop offset="1" stop-color="#120a06" stop-opacity="0"/></radialGradient>`;
  camadas.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${veu}</defs><rect width="${W}" height="${H}" fill="url(#v)"/></svg>`), top: 0, left: 0 });

  let blocos;
  let folgas;
  for (let k = 1; ; k -= 0.07) {
    const t = (n) => Math.round(n * k);
    blocos = [];
    folgas = [];
    const add = (b, folga) => {
      if (blocos.length) folgas.push(folga);
      blocos.push(b);
    };
    if (c.tipo === 'arte') {
      if (c.titulo) add(await mont(c.titulo, { tam: t(78), cor, largura: LARG }), 0);
      if (c.subtitulo) add(await mont(c.subtitulo, { peso: 'Medium', tam: t(42), cor: corRef, largura: LARG }), t(14));
    } else if (c.tipo === 'versiculo') {
      add(await mont(`“${c.citacao}”`, { tam: t(62), cor, largura: LARG }), 0);
      add(await mont(`(${c.ref})`, { peso: 'Medium', tam: t(38), cor: corRef, largura: LARG }), t(22));
      if (c.comentario) add(await mont(c.comentario, { peso: 'Medium', tam: t(40), cor, largura: LARG }), t(44));
    } else if (c.tipo === 'lista') {
      add(await mont(c.titulo, { tam: t(62), cor, largura: LARG }), 0);
      for (let n = 0; n < c.itens.length; n++) {
        add(await mont(`${c.numerar === false ? '' : `${n + 1}. `}${c.itens[n]}`, { peso: 'Medium', tam: t(44), cor, largura: LARG }), t(n ? 14 : 34));
      }
    } else if (c.tipo === 'texto' || c.tipo === 'aviso') {
      if (c.titulo) add(await mont(c.titulo, { tam: t(66), cor, largura: LARG }), 0);
      add(await mont(c.texto, { peso: c.tipo === 'aviso' ? 'Medium' : c.titulo ? 'Medium' : 'Bold', tam: t(c.tipo === 'aviso' ? 44 : c.titulo ? 46 : 60), cor, largura: LARG }), t(26));
      if (c.rodape) add(await mont(c.rodape, { peso: 'Medium', tam: t(36), cor: corRef, largura: LARG }), t(22));
    } else {
      throw new Error(`Tipo de cena desconhecido: ${c.tipo}`);
    }
    const alt = blocos.reduce((s, b) => s + b.h, 0) + folgas.reduce((s, f) => s + f, 0);
    if (alt <= H - 260 || k < 0.5) break;
  }
  const alt = blocos.reduce((s, b) => s + b.h, 0) + folgas.reduce((s, f) => s + f, 0);
  let y = Math.round((H - alt) / 2);
  for (let n = 0; n < blocos.length; n++) {
    const b = blocos[n];
    const left = Math.round(cx - b.w / 2);
    if (!claro) {
      const s = await sombraTexto(b);
      camadas.push({ input: s.input, top: y - s.pad + 3, left: left - s.pad + 2 });
    }
    camadas.push({ input: b.input, top: y, left });
    y += b.h + (folgas[n] ?? 0);
  }
  return base().composite(camadas).png().toBuffer();
}

// ---------- Montagem ----------
const clipes = [];
const audios = [];
const legendas = [];
let t = 0;
let nCena = 0;
const capitulos = [];
for (let i = 0; i < spec.secoes.length; i++) {
  const { narracao } = secoesMd[i];
  capitulos.push({ inicio: t, titulo: secoesMd[i].titulo });
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
  for (let j = 0; j < cenas.length; j++) {
    const c = cenas[j];
    const d = (durSecao * (c.peso ?? 1)) / pesoTotal;
    const png = join(saida, 'cenas', `${String(++nCena).padStart(2, '0')}.png`);
    await writeFile(png, await cena(c, `${i + 1}.${j + 1}`));
    clipes.push({ png, dur: d, zoom: c.tipo === 'arte' || Boolean(fotos[`${i + 1}.${j + 1}`]) });
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

// Narração sozinha (sem música), para conferir a voz.
await run('ffmpeg', [
  '-y', '-v', 'error', ...audios.flatMap((a) => ['-i', a.arq]),
  '-filter_complex', filtros.slice(0, audios.length + 1).join(';'),
  '-map', '[voz]', '-c:a', 'aac', '-b:a', '160k', join(saida, 'narracao.m4a'),
]);

const final = join(saida, 'video.mp4');
await run('ffmpeg', ['-y', '-v', 'error', '-i', soVideo, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final]);

// Diagnóstico do áudio no log: volume de cada trecho de voz e do vídeo final.
async function volume(arq) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', arq, '-vn', '-af', 'volumedetect', '-f', 'null', '-']);
  const media = stderr.match(/mean_volume: (-?[\d.]+|-inf) dB/)?.[1];
  const pico = stderr.match(/max_volume: (-?[\d.]+|-inf) dB/)?.[1];
  return `média ${media} dB, pico ${pico} dB`;
}
console.log(`Voz (${MODO}):`);
for (const [k, a] of audios.entries()) console.log(`  seção ${k + 1}: ${a.dur.toFixed(1)} s, ${await volume(a.arq)}`);
const { stdout: fluxos } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,channels,duration', '-of', 'compact=p=0', final]);
console.log(`Vídeo final: ${fluxos.trim().replace(/\n/g, ' | ')}`);
console.log(`Áudio do vídeo: ${await volume(final)}`);

// Legendas SRT.
const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
await writeFile(join(saida, 'legendas.srt'), legendas.map((l, k) => `${k + 1}\n${ts(l.ini)} --> ${ts(l.fim)}\n${l.texto}\n`).join('\n'));

// Metadados para o YouTube: título, descrição com os capítulos nos tempos reais e tags.
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const titulo = roteiro.match(/^\*\*Principal[^*]*\*\*\s*(.+)$/m)?.[1]?.trim() ?? slug;
let descricao = roteiro.split(/^## Descrição do vídeo\s*$/m)[1]?.split(/^## /m)[0]?.trim() ?? '';
const blocoCapitulos = `Capítulos:\n${capitulos.map((c) => `${mmss(c.inicio)} ${c.titulo}`).join('\n')}`;
descricao = /Capítulos:\n(?:\d+:\d\d .*\n?)+/.test(descricao)
  ? descricao.replace(/Capítulos:\n(?:\d+:\d\d .*\n?)+/, `${blocoCapitulos}\n`)
  : `${descricao}\n\n${blocoCapitulos}`;
if (Object.keys(fotos).length && !/Fotos:/.test(descricao)) {
  descricao = descricao.replace(/(Citações bíblicas:[^\n]*)/, `$1\nFotos: Pixabay. Música original.`);
}
const artigo = await readFile(join('src', 'content', 'blog', `${slug}.md`), 'utf8').catch(() => '');
const tagsArtigo = (artigo.match(/^tags:\s*\[(.*)\]/m)?.[1] ?? '').split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
const tags = [...new Set([...tagsArtigo, 'devocional', 'Bíblia', 'fé', 'A Tela do Reino'])];
await writeFile(
  join(saida, 'metadados.json'),
  JSON.stringify({ slug, titulo, descricao, tags, duracao: t, capitulos, vozSintetica: MODO === 'elevenlabs' }, null, 2) + '\n',
);

// Miniatura 1280x720: a foto da abertura (ou a ilustração do artigo) e o título em Montserrat.
const mini = spec.miniatura;
const baseMini = fotos['1.1'] ? await foto(fotos['1.1']) : await readFile(spec.arte);
const escuro = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#120a06" stop-opacity=".75"/><stop offset=".65" stop-color="#120a06" stop-opacity="0"/></linearGradient></defs><rect width="1280" height="720" fill="url(#v)"/></svg>`,
);
const tTit = await mont(mini.titulo, { tam: 64, cor: '#fffaf2', largura: 640, alinhar: 'left' });
const tSub = await mont(mini.subtitulo, { peso: 'Medium', tam: 34, cor: '#f6c97a', largura: 640, alinhar: 'left' });
const sTit = await sombraTexto(tTit);
const yTit = Math.round((720 - tTit.h - tSub.h - 20) / 2);
await sharp(baseMini)
  .resize(1280, 720, { fit: 'cover' })
  .composite([
    { input: escuro, top: 0, left: 0 },
    { input: sTit.input, top: yTit - sTit.pad + 3, left: 60 - sTit.pad + 2 },
    { input: tTit.input, top: yTit, left: 60 },
    { input: tSub.input, top: yTit + tTit.h + 20, left: 62 },
  ])
  .png()
  .toFile(join(saida, 'miniatura.png'));

const creditos = [...new Map(Object.values(fotos).map((f) => [f.id, f])).values()];
if (creditos.length) {
  await writeFile(
    join(saida, 'creditos.txt'),
    `Fotos:\n${creditos.map((f) => `- ${f.fotografo} (${f.banco ?? 'Pexels'}): ${f.pagina}`).join('\n')}\n`,
  );
}
console.log(`Pronto: ${final} (${(await duracao(final)).toFixed(1)} s), legendas.srt e miniatura.png em ${saida}/`);

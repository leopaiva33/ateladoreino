// Escolhe o próximo carrossel a publicar no Instagram, acompanhando o calendário do blog.
// Usado por .github/workflows/instagram-agendado.yml. Sem dependências (Node 22).
//
// Um post entra na fila quando:
//   - o artigo não é rascunho e a data (pubDate) já chegou, a partir de INICIO;
//   - o artigo já aparece no sitemap do site no ar (o link da bio precisa funcionar);
//   - existe conteudo-social/<slug>/carrossel.json e os slides em public/social/<slug>/;
//   - ainda não existe conteudo-social/<slug>/instagram.json (registro de publicação).
// Também entram os slugs de conteudo-social/agenda-instagram.json cuja data já chegou.
// Publica um por execução, do mais antigo para o mais novo.
//
// Com --reel, faz a mesma escolha para os Reels (vídeo vertical do carrossel):
// exige public/social/<slug>/reel.mp4 (npm run reel -- <slug>), usa o registro
// conteudo-social/<slug>/reel.json e só considera datas a partir de INICIO_REEL.
// Com --short, igual ao --reel, mas para o YouTube Shorts (registro short.json).
// Com --facebook (e opcionalmente --reel), a mesma fila para a Página do Facebook
// (registros facebook.json e facebook-reel.json), a partir de INICIO_FB.
// Com --threads, a fila do Threads (registro threads.json), a partir de INICIO_FB.
// Com --pinterest, a fila do pin 1 (pinterest-1.json, exige pin-1.jpg); com --pinterest --pin2,
// a do pin 2, três dias depois do artigo. Inclui os artigos desde INICIO_PIN (os antigos também).
// Artigos vencidos sem carrossel geram um aviso no log do GitHub Actions.
import { readdir, readFile, appendFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/content/blog';
const SITEMAP = process.env.SITEMAP_URL ?? 'https://www.ateladoreino.com/sitemap-0.xml';
// Artigos anteriores a esta data só são publicados automaticamente se estiverem em
// conteudo-social/agenda-instagram.json (ou pelo workflow manual).
const short = process.argv.includes('--short');
const reel = short || process.argv.includes('--reel');
const threads = process.argv.includes('--threads');
const pinterest = process.argv.includes('--pinterest');
const pin2 = pinterest && process.argv.includes('--pin2');
const ATRASO = pin2 ? 3 * 86400000 : 0;
const facebook = threads || process.argv.includes('--facebook');
const INICIO = pinterest
  ? Date.parse(process.env.INICIO_PIN_ISO ?? '2026-10-01T00:00:00-03:00')
  : facebook
  ? Date.parse(process.env.INICIO_FB_ISO ?? '2026-11-17T00:00:00-03:00')
  : reel
  ? Date.parse(process.env.INICIO_REEL_ISO ?? '2026-11-16T00:00:00-03:00')
  : Date.parse(process.env.INICIO_ISO ?? '2026-11-07T00:00:00-03:00');
const REGISTRO = pinterest ? (pin2 ? 'pinterest-2.json' : 'pinterest-1.json') : threads ? 'threads.json' : facebook ? (reel ? 'facebook-reel.json' : 'facebook.json') : short ? 'short.json' : reel ? 'reel.json' : 'instagram.json';
const agora = process.env.AGORA_ISO ? Date.parse(process.env.AGORA_ISO) : Date.now();
const existe = (p) => access(p).then(() => true, () => false);

const vencidos = [];
for (const file of (await readdir(DIR)).filter((f) => f.endsWith('.md'))) {
  const fm = (await readFile(join(DIR, file), 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  if (/^draft:\s*true\s*$/m.test(fm)) continue;
  const raw = fm.match(/^pubDate:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '');
  const data = raw ? Date.parse(raw) : NaN;
  if (Number.isNaN(data) || data + ATRASO > agora || data < INICIO) continue;
  vencidos.push({ slug: file.replace(/\.md$/, ''), data });
}

// Carrosséis de artigos antigos (anteriores a INICIO) agendados à mão: { "slug": "AAAA-MM-DDTHH:MM:SS-03:00" }.
const AGENDA = 'conteudo-social/agenda-instagram.json';
if (await existe(AGENDA)) {
  const agenda = JSON.parse(await readFile(AGENDA, 'utf8'));
  for (const [slug, quando] of Object.entries(agenda)) {
    const data = Date.parse(quando);
    if (Number.isNaN(data)) {
      console.log(`::warning::Data inválida em ${AGENDA} para "${slug}": ${quando}`);
      continue;
    }
    if (data > agora || ((reel || facebook || pinterest) && data < INICIO) || vencidos.some((v) => v.slug === slug)) continue;
    vencidos.push({ slug, data });
  }
}
vencidos.sort((a, b) => a.data - b.data);

let sitemap = '';
try {
  const r = await fetch(SITEMAP, { headers: { 'user-agent': 'instagram-agendado' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  sitemap = await r.text();
} catch (erro) {
  console.log(`Não foi possível consultar o sitemap (${erro.message}); nada será publicado agora.`);
}

let escolhido = '';
for (const { slug } of vencidos) {
  const pasta = join('conteudo-social', slug);
  if (await existe(join(pasta, REGISTRO))) continue;
  if (!(await existe(join(pasta, 'carrossel.json')))) {
    console.log(`::warning::"${slug}" já está no blog, mas não tem carrossel (conteudo-social/${slug}/carrossel.json).`);
    continue;
  }
  if (!(await existe(join('public', 'social', slug, pinterest ? `pin-${pin2 ? 2 : 1}.jpg` : reel ? 'reel.mp4' : 'slide-01.png')))) {
    const cmd = pinterest ? 'npm run pin' : reel ? 'npm run reel' : 'npm run carrossel';
    console.log(`::warning::"${slug}" tem carrossel.json, mas ${reel ? 'o Reel não foi gerado' : 'os slides não foram gerados'} (${cmd} -- ${slug}).`);
    continue;
  }
  if (!sitemap.includes(`/blog/${slug}/`)) {
    console.log(`"${slug}" ainda não aparece no site; fica para a próxima execução.`);
    continue;
  }
  if (!escolhido) escolhido = slug;
}

const tipo = pinterest ? `pin ${pin2 ? 2 : 1}` : threads ? 'post' : short ? 'Short' : reel ? 'Reel' : 'carrossel';
const rede = pinterest ? 'Pinterest' : threads ? 'Threads' : facebook ? 'Facebook' : short ? 'YouTube' : 'Instagram';
console.log(escolhido ? `Publicar ${tipo} no ${rede}: ${escolhido}` : `Nenhum ${tipo} a publicar no ${rede} agora.`);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `slug=${escolhido}\n`);

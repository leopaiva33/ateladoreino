// Publica no Pinterest os pins de um artigo (public/social/<slug>/pin-1.jpg e pin-2.jpg, gerados
// com npm run pin -- <slug>), pela API v5, com link para o artigo (com UTM, para o Analytics).
//
// - pin 1: ilustração + título; pin 2 (--pin2): versículo. Títulos e descrições vêm do artigo
//   e do carrossel aprovado. Registro: conteudo-social/<slug>/pinterest-1.json (ou -2).
// - Acesso: PINTEREST_APP_ID, PINTEREST_APP_SECRET e PINTEREST_REFRESH_TOKEN; o token de acesso
//   é renovado a cada execução. Se o Pinterest devolver um refresh token novo e houver GH_TOKEN
//   (segredo GH_SECRETS_TOKEN), ele é gravado em PINTEREST_REFRESH_TOKEN.
// - Pasta: PINTEREST_BOARD (nome); sem ela, a primeira pasta da conta.
// - PINTEREST_SANDBOX=1 usa a API de testes (enquanto o app não tem "Standard access").
//
// Uso:
//   node scripts/publicar-pinterest.mjs --diagnostico
//   node scripts/publicar-pinterest.mjs <slug> [--pin2]              simula
//   node scripts/publicar-pinterest.mjs <slug> [--pin2] --publicar
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const n = args.includes('--pin2') ? 2 : 1;
const publicar = args.includes('--publicar');
const SITE = (process.env.SITE_URL || 'https://ateladoreino.com').replace(/\/$/, '');
const API = process.env.PINTEREST_SANDBOX ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5';
const { PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN, PINTEREST_BOARD } = process.env;
const existe = (p) => access(p).then(() => true, () => false);
const corta = (t, max) => (t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);

async function token() {
  const r = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: PINTEREST_REFRESH_TOKEN }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Pinterest recusou a renovação do acesso: ${j.message || r.status}`);
  if (j.refresh_token && j.refresh_token !== PINTEREST_REFRESH_TOKEN) {
    if (process.env.GH_TOKEN && process.env.GITHUB_REPOSITORY) {
      execFileSync('gh', ['secret', 'set', 'PINTEREST_REFRESH_TOKEN', '--repo', process.env.GITHUB_REPOSITORY, '--body', j.refresh_token], { stdio: 'inherit' });
      console.log('Refresh token do Pinterest atualizado no segredo.');
    } else console.log('::warning::O Pinterest devolveu um refresh token novo, mas não há GH_SECRETS_TOKEN para gravá-lo.');
  }
  return j.access_token;
}
async function api(tk, caminho, corpo) {
  const r = await fetch(`${API}/${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${tk}`, 'content-type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${caminho}: ${j.message || r.status}`);
  return j;
}
async function pasta(tk) {
  const { items = [] } = await api(tk, 'boards?page_size=100');
  const b = PINTEREST_BOARD ? items.find((x) => x.name.toLowerCase() === PINTEREST_BOARD.toLowerCase()) : items[0];
  return { items, b };
}

const temCredenciais = PINTEREST_APP_ID && PINTEREST_APP_SECRET && PINTEREST_REFRESH_TOKEN;

if (args.includes('--diagnostico')) {
  if (!temCredenciais) throw new Error('Faltam PINTEREST_APP_ID, PINTEREST_APP_SECRET e/ou PINTEREST_REFRESH_TOKEN.');
  const tk = await token();
  const conta = await api(tk, 'user_account');
  console.log(`Conta: ${conta.username} (${conta.account_type})${process.env.PINTEREST_SANDBOX ? ' [sandbox]' : ''}`);
  const { items, b } = await pasta(tk);
  console.log(`Pastas: ${items.map((x) => x.name).join(', ') || 'nenhuma'}`);
  console.log(b ? `Pasta usada: ${b.name} (${b.id})` : 'Nenhuma pasta encontrada: crie uma no Pinterest (ou ajuste PINTEREST_BOARD).');
  process.exit(0);
}

if (!slug) {
  console.error('Uso: node scripts/publicar-pinterest.mjs <slug> [--pin2] [--publicar] | --diagnostico');
  process.exit(1);
}
const REGISTRO = join('conteudo-social', slug, `pinterest-${n}.json`);
if (await existe(REGISTRO)) {
  console.log(`${slug}: pin ${n} já publicado.`);
  process.exit(publicar ? 1 : 0);
}
const artigo = await readFile(join('src', 'content', 'blog', `${slug}.md`), 'utf8');
const fm = artigo.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
const campo = (k) => fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1] ?? '';
const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'));
const v = spec.slides.find((s) => s.tipo === 'versiculo');
const link = `${SITE}/blog/${slug}?utm_source=pinterest&utm_medium=social&utm_campaign=pin-${n}`;
const titulo = corta(campo('title'), 100);
const descricao = corta(
  n === 1
    ? `${campo('description')} Devocional com base bíblica na A Tela do Reino.`
    : v
      ? `“${v.citacao.replace(/^…|…$/g, '')}” (${v.ref}). ${v.comentario} ${campo('description')}`
      : campo('description'),
  500,
);
const imagem = `${SITE}/social/${slug}/pin-${n}.jpg`;
const alt = corta(n === 1 ? `Ilustração e título do artigo: ${campo('title')}` : v ? `Versículo ${v.ref}: ${v.citacao}` : campo('title'), 500);
console.log(`Pin ${n}: ${slug}\nTítulo: ${titulo}\nDescrição: ${descricao}\nImagem: ${imagem}\nLink: ${link}\n`);

if (!publicar) {
  console.log('Simulação: nada foi publicado. Use --publicar.');
  process.exit(0);
}
if (!temCredenciais) throw new Error('Faltam PINTEREST_APP_ID, PINTEREST_APP_SECRET e/ou PINTEREST_REFRESH_TOKEN.');
const tk = await token();
const { b } = await pasta(tk);
if (!b) throw new Error('Nenhuma pasta encontrada no Pinterest.');
const pin = await api(tk, 'pins', {
  board_id: b.id,
  title: titulo,
  description: descricao,
  link,
  alt_text: alt,
  media_source: { source_type: 'image_url', url: imagem },
});
console.log(`Pin publicado: https://www.pinterest.com/pin/${pin.id}/`);
await writeFile(REGISTRO, JSON.stringify({ id: pin.id, publicadoEm: new Date().toISOString() }, null, 2) + '\n');

// Publica um carrossel no Instagram pela API oficial da Meta (Instagram Graph API).
// Lê conteudo-social/<slug>/carrossel.json (legenda e quantidade de slides) e usa as imagens
// publicadas em https://ateladoreino.com/social/<slug>/slide-NN.png (a API só aceita endereços
// públicos, então faça o deploy dos slides antes).
//
// Uso:
//   npm run instagram -- <slug>              simula: confere tudo, não publica
//   npm run instagram -- <slug> --publicar   publica de verdade
//
// Variáveis de ambiente (nunca coloque no código nem no Git):
//   IG_USER_ID       ID da conta Instagram profissional (Business/Creator)
//   IG_ACCESS_TOKEN  token de acesso de longa duração com a permissão instagram_content_publish
//   GRAPH_VERSION    opcional, padrão v21.0
//   SITE_URL         opcional, padrão https://ateladoreino.com
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const slug = process.argv[2];
const publicar = process.argv.includes('--publicar');
if (!slug || slug.startsWith('--')) {
  console.error('Uso: npm run instagram -- <slug> [--publicar]');
  process.exit(1);
}

const SITE_URL = (process.env.SITE_URL || 'https://ateladoreino.com').replace(/\/$/, '');
const VERSAO = process.env.GRAPH_VERSION || 'v21.0';
const BASE = `https://graph.facebook.com/${VERSAO}`;
const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;

const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'));
const total = spec.slides.length;
if (total < 2 || total > 10) throw new Error(`O carrossel precisa de 2 a 10 slides (tem ${total}).`);
if (spec.legenda.length > 2200) throw new Error(`Legenda com ${spec.legenda.length} caracteres (máximo 2.200).`);
const hashtags = (spec.legenda.match(/#\S+/g) || []).length;
if (hashtags > 30) throw new Error('Mais de 30 hashtags (limite do Instagram).');

const urls = spec.slides.map((_, i) => `${SITE_URL}/social/${slug}/slide-${String(i + 1).padStart(2, '0')}.png`);

console.log(`Carrossel: ${slug} (${total} slides, legenda com ${spec.legenda.length} caracteres)`);
let faltando = 0;
for (const u of urls) {
  const r = await fetch(u, { method: 'HEAD', redirect: 'follow' }).catch(() => null);
  const ok = r?.ok && (r.headers.get('content-type') || '').startsWith('image/');
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${u}${ok ? '' : ` (${r ? r.status : 'sem resposta'})`}`);
  if (!ok) faltando++;
}
if (faltando) {
  console.error(`\n${faltando} imagem(ns) fora do ar. Faça commit, push e espere o deploy da Vercel.`);
  process.exit(1);
}

if (!publicar) {
  console.log('\nSimulação concluída: nada foi publicado. Rode de novo com --publicar para postar.');
  process.exit(0);
}
if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
  console.error('\nFaltam IG_USER_ID e/ou IG_ACCESS_TOKEN nas variáveis de ambiente.');
  process.exit(1);
}

async function api(caminho, corpo) {
  const params = new URLSearchParams({ ...corpo, access_token: IG_ACCESS_TOKEN });
  const r = await fetch(`${BASE}/${caminho}`, { method: 'POST', body: params });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`Erro da API em ${caminho}: ${j.error?.message || r.status}`);
  return j;
}
async function status(id) {
  const r = await fetch(`${BASE}/${id}?fields=status_code&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`);
  const j = await r.json();
  if (j.error) throw new Error(`Erro ao consultar ${id}: ${j.error.message}`);
  return j.status_code;
}
async function esperar(id, rotulo) {
  for (let t = 0; t < 30; t++) {
    const s = await status(id);
    if (s === 'FINISHED') return;
    if (s === 'ERROR' || s === 'EXPIRED') throw new Error(`${rotulo} terminou com status ${s}.`);
    await new Promise((res) => setTimeout(res, 4000));
  }
  throw new Error(`${rotulo} não ficou pronto a tempo.`);
}

const filhos = [];
for (let i = 0; i < urls.length; i++) {
  const { id } = await api(`${IG_USER_ID}/media`, { image_url: urls[i], is_carousel_item: 'true' });
  await esperar(id, `Slide ${i + 1}`);
  filhos.push(id);
  console.log(`Slide ${i + 1}/${total} enviado`);
}
const { id: carrossel } = await api(`${IG_USER_ID}/media`, {
  media_type: 'CAROUSEL',
  children: filhos.join(','),
  caption: spec.legenda,
});
await esperar(carrossel, 'Carrossel');
const { id: publicado } = await api(`${IG_USER_ID}/media_publish`, { creation_id: carrossel });
console.log(`\nPublicado no Instagram. ID da publicação: ${publicado}`);

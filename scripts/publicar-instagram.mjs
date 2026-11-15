// Publica um carrossel no Instagram pela API oficial da Meta (Instagram Graph API).
// Lê conteudo-social/<slug>/carrossel.json (legenda e quantidade de slides) e usa as imagens
// publicadas em https://ateladoreino.com/social/<slug>/slide-NN.png (a API só aceita endereços
// públicos, então faça o deploy dos slides antes).
//
// Uso:
//   npm run instagram -- <slug>              simula: confere tudo, não publica
//   npm run instagram -- <slug> --publicar   publica de verdade
//   acrescente --reel para publicar o Reel (public/social/<slug>/reel.mp4, gerado com
//   npm run reel -- <slug>) em vez do carrossel; o registro fica em reel.json.
//
// Variáveis de ambiente (nunca coloque no código nem no Git):
//   IG_USER_ID       ID da conta Instagram profissional (Business/Creator)
//   IG_ACCESS_TOKEN  token de acesso de longa duração com a permissão instagram_content_publish
//   GRAPH_VERSION    opcional, padrão v21.0
//   SITE_URL         opcional, padrão https://ateladoreino.com
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const slug = process.argv.slice(2).find((a) => !a.startsWith('--'));
const publicar = process.argv.includes('--publicar');
const reel = process.argv.includes('--reel');
if (!slug) {
  console.error('Uso: npm run instagram -- <slug> [--publicar]');
  process.exit(1);
}

const SITE_URL = (process.env.SITE_URL || 'https://ateladoreino.com').replace(/\/$/, '');
const VERSAO = process.env.GRAPH_VERSION || 'v21.0';
const BASE = `https://graph.facebook.com/${VERSAO}`;
const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;

const REGISTRO = join('conteudo-social', slug, reel ? 'reel.json' : 'instagram.json');
if (publicar && !process.argv.includes('--de-novo')) {
  const anterior = await readFile(REGISTRO, 'utf8').then(JSON.parse, () => null);
  if (anterior) {
    console.error(`"${slug}" já foi publicado em ${anterior.publicadoEm} (ID ${anterior.id}). Use --de-novo para repetir.`);
    process.exit(1);
  }
}

const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'));
const total = spec.slides.length;
if (total < 2 || total > 10) throw new Error(`O carrossel precisa de 2 a 10 slides (tem ${total}).`);
if (spec.legenda.length > 2200) throw new Error(`Legenda com ${spec.legenda.length} caracteres (máximo 2.200).`);
const hashtags = (spec.legenda.match(/#\S+/g) || []).length;
if (hashtags > 30) throw new Error('Mais de 30 hashtags (limite do Instagram).');

const urls = reel
  ? [`${SITE_URL}/social/${slug}/reel.mp4`, `${SITE_URL}/social/${slug}/reel-capa.jpg`]
  : spec.slides.map((_, i) => `${SITE_URL}/social/${slug}/slide-${String(i + 1).padStart(2, '0')}.png`);

console.log(reel ? `Reel: ${slug} (legenda com ${spec.legenda.length} caracteres)` : `Carrossel: ${slug} (${total} slides, legenda com ${spec.legenda.length} caracteres)`);
let faltando = 0;
for (const u of urls) {
  const r = await fetch(u, { method: 'HEAD', redirect: 'follow' }).catch(() => null);
  const tipoOk = u.endsWith('.mp4') ? 'video/' : 'image/';
  const ok = r?.ok && (r.headers.get('content-type') || '').startsWith(tipoOk);
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${u}${ok ? '' : ` (${r ? r.status : 'sem resposta'})`}`);
  if (!ok) faltando++;
}
if (faltando) {
  console.error(`\n${faltando} arquivo(s) fora do ar. Faça commit, push e espere o deploy da Vercel.`);
  process.exit(1);
}

if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
  if (!publicar) {
    console.log('\nSimulação concluída (credenciais não definidas, não foram testadas): nada foi publicado.');
    process.exit(0);
  }
  console.error('\nFaltam IG_USER_ID e/ou IG_ACCESS_TOKEN nas variáveis de ambiente.');
  process.exit(1);
}

// Confere as credenciais sem publicar nada: lê o nome da conta e a cota de publicação.
{
  const tk = encodeURIComponent(IG_ACCESS_TOKEN);
  const conta = await (await fetch(`${BASE}/${IG_USER_ID}?fields=username&access_token=${tk}`)).json();
  if (conta.error) {
    console.error(`\nCredenciais recusadas pela Meta: ${conta.error.message}`);
    process.exit(1);
  }
  const cota = await (await fetch(`${BASE}/${IG_USER_ID}/content_publishing_limit?fields=quota_usage&access_token=${tk}`)).json();
  if (cota.error) {
    console.error(`\nToken sem permissão de publicação (instagram_content_publish): ${cota.error.message}`);
    process.exit(1);
  }
  const usadas = cota.data?.[0]?.quota_usage ?? 0;
  console.log(`\nCredenciais OK: conta @${conta.username}, ${usadas} publicação(ões) via API nas últimas 24 h.`);
}

if (!publicar) {
  console.log('Simulação concluída: nada foi publicado. Rode de novo com --publicar para postar.');
  process.exit(0);
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
async function esperar(id, rotulo, tentativas = 30) {
  for (let t = 0; t < tentativas; t++) {
    const s = await status(id);
    if (s === 'FINISHED') return;
    if (s === 'ERROR' || s === 'EXPIRED') throw new Error(`${rotulo} terminou com status ${s}.`);
    await new Promise((res) => setTimeout(res, 4000));
  }
  throw new Error(`${rotulo} não ficou pronto a tempo.`);
}

if (reel) {
  // Vídeo: a Meta baixa e processa o arquivo, o que pode levar alguns minutos.
  const { id: criacao } = await api(`${IG_USER_ID}/media`, {
    media_type: 'REELS',
    video_url: urls[0],
    cover_url: urls[1],
    caption: spec.legenda,
    share_to_feed: 'true',
  });
  await esperar(criacao, 'Reel', 75);
  const { id: publicado } = await api(`${IG_USER_ID}/media_publish`, { creation_id: criacao });
  console.log(`\nReel publicado no Instagram. ID da publicação: ${publicado}`);
  await writeFile(REGISTRO, JSON.stringify({ id: publicado, publicadoEm: new Date().toISOString() }, null, 2) + '\n');
  console.log(`Registro salvo em ${REGISTRO}`);
  process.exit(0);
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
await writeFile(REGISTRO, JSON.stringify({ id: publicado, publicadoEm: new Date().toISOString() }, null, 2) + '\n');
console.log(`Registro salvo em ${REGISTRO}`);

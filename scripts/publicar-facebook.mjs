// Publica na Página do Facebook (ligada ao Instagram da A Tela do Reino), pela Graph API.
//
// - Carrossel: post com as fotos dos slides (public/social/<slug>/slide-NN.png) e a legenda.
// - Reel (--reel): o vídeo vertical public/social/<slug>/reel.mp4 como Reel da Página.
// - Na legenda, "(link na bio)" vira o link direto do artigo (no Facebook o link funciona).
// - A Página é encontrada sozinha: é a que tem o Instagram IG_USER_ID vinculado.
// - Grava conteudo-social/<slug>/facebook.json (ou facebook-reel.json), o que impede repetir.
//
// Credenciais: IG_USER_ID e IG_ACCESS_TOKEN (o mesmo usuário do sistema do Instagram). O token
// precisa das permissões pages_show_list, pages_read_engagement e pages_manage_posts, e o usuário
// do sistema precisa ter acesso à Página no Gerenciador de Negócios.
//
// Uso:
//   node scripts/publicar-facebook.mjs --diagnostico          confere token, permissões e Página
//   node scripts/publicar-facebook.mjs <slug> [--reel]        simula
//   node scripts/publicar-facebook.mjs <slug> [--reel] --publicar
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const reel = args.includes('--reel');
const publicar = args.includes('--publicar');
const diagnostico = args.includes('--diagnostico');
const VERSAO = process.env.GRAPH_VERSION || 'v21.0';
const BASE = `https://graph.facebook.com/${VERSAO}`;
const SITE = (process.env.SITE_URL || 'https://ateladoreino.com').replace(/\/$/, '');
const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
const existe = (p) => access(p).then(() => true, () => false);

if (!slug && !diagnostico) {
  console.error('Uso: node scripts/publicar-facebook.mjs <slug> [--reel] [--publicar] | --diagnostico');
  process.exit(1);
}
if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
  console.error('Faltam IG_USER_ID e/ou IG_ACCESS_TOKEN.');
  process.exit(1);
}

async function get(caminho, token = IG_ACCESS_TOKEN) {
  const sep = caminho.includes('?') ? '&' : '?';
  const j = await (await fetch(`${BASE}/${caminho}${sep}access_token=${encodeURIComponent(token)}`)).json();
  if (j.error) throw new Error(`${caminho.split('?')[0]}: ${j.error.message}`);
  return j;
}
async function post(caminho, corpo, token) {
  const r = await fetch(`${BASE}/${caminho}`, { method: 'POST', body: new URLSearchParams({ ...corpo, access_token: token }) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`${caminho}: ${j.error?.message || r.status}`);
  return j;
}

// Encontra a Página vinculada ao Instagram e o token dela.
async function pagina() {
  const contas = await get('me/accounts?fields=id,name,tasks,instagram_business_account&limit=100');
  const lista = contas.data ?? [];
  const p = lista.find((c) => c.instagram_business_account?.id === IG_USER_ID);
  return { lista, p };
}

if (diagnostico) {
  const eu = await get('me?fields=id,name');
  console.log(`Token de: ${eu.name} (${eu.id})`);
  const perms = await get('me/permissions').catch((e) => ({ data: [], erro: e.message }));
  const concedidas = (perms.data ?? []).filter((p) => p.status === 'granted').map((p) => p.permission);
  console.log(`Permissões: ${concedidas.join(', ') || perms.erro || 'nenhuma listada'}`);
  for (const n of ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']) {
    console.log(`${concedidas.includes(n) ? 'OK    ' : 'FALTA '} ${n}`);
  }
  const { lista, p } = await pagina().catch((e) => ({ lista: [], erro: e.message }));
  console.log(`Páginas acessíveis: ${lista.map((c) => `${c.name} (${c.id}${c.instagram_business_account ? `, Instagram ${c.instagram_business_account.id}` : ''})`).join('; ') || 'nenhuma'}`);
  console.log(p ? `Página vinculada ao Instagram: ${p.name} (${p.id}), tarefas: ${(p.tasks ?? []).join(', ')}` : 'Nenhuma Página acessível está vinculada a este Instagram.');
  process.exit(0);
}

const REGISTRO = join('conteudo-social', slug, reel ? 'facebook-reel.json' : 'facebook.json');
if (await existe(REGISTRO)) {
  console.log(`${slug}: já publicado no Facebook (${REGISTRO}).`);
  process.exit(publicar ? 1 : 0);
}
const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'));
const link = `${SITE}/blog/${slug}/`;
let legenda = spec.legenda.replace(/\s*\(link na bio\)\.?/gi, `:\n${link}`);
if (!legenda.includes(link)) legenda += `\n\nLeia o texto completo: ${link}`;

const urls = reel
  ? [`${SITE}/social/${slug}/reel.mp4`]
  : spec.slides.map((_, i) => `${SITE}/social/${slug}/slide-${String(i + 1).padStart(2, '0')}.png`);
console.log(`${reel ? 'Reel' : 'Carrossel'} no Facebook: ${slug}\n\n${legenda}\n`);

const { p } = await pagina();
if (!p) throw new Error('Nenhuma Página acessível está vinculada ao Instagram (rode --diagnostico).');
console.log(`Página: ${p.name} (${p.id})`);
if (!publicar) {
  console.log('Simulação: nada foi publicado. Use --publicar.');
  process.exit(0);
}
const { access_token: tokenPagina } = await get(`${p.id}?fields=access_token`);

let id;
if (!reel) {
  // Fotos não publicadas, depois um post com todas elas.
  const fotos = [];
  for (const u of urls) {
    const { id: foto } = await post(`${p.id}/photos`, { url: u, published: 'false' }, tokenPagina);
    fotos.push(foto);
  }
  const corpo = { message: legenda };
  fotos.forEach((f, i) => (corpo[`attached_media[${i}]`] = JSON.stringify({ media_fbid: f })));
  ({ id } = await post(`${p.id}/feed`, corpo, tokenPagina));
} else {
  // Reels da Página: iniciar, enviar pelo endereço do arquivo e finalizar.
  const { video_id } = await post(`${p.id}/video_reels`, { upload_phase: 'start' }, tokenPagina);
  const r = await fetch(`https://rupload.facebook.com/video-upload/${VERSAO}/${video_id}`, {
    method: 'POST',
    headers: { authorization: `OAuth ${tokenPagina}`, file_url: urls[0] },
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(`Envio do vídeo: ${JSON.stringify(j).slice(0, 300)}`);
  await post(`${p.id}/video_reels`, { upload_phase: 'finish', video_id, video_state: 'PUBLISHED', description: legenda }, tokenPagina);
  id = video_id;
}
console.log(`Publicado no Facebook: ${id}`);
await writeFile(REGISTRO, JSON.stringify({ id, publicadoEm: new Date().toISOString() }, null, 2) + '\n');

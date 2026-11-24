// Publica no Threads um post de texto por artigo, com o link do artigo (o Threads mostra o
// cartão com a imagem). O texto sai do carrossel aprovado: título, o primeiro versículo (com a
// referência) e o comentário dele; sem versículo, o primeiro slide de texto.
// Grava conteudo-social/<slug>/threads.json, o que impede repetir.
//
// Credencial: THREADS_ACCESS_TOKEN (token de longa duração do Threads, com threads_basic e
// threads_content_publish). Vale 60 dias; --renovar troca por um novo e, se houver GH_TOKEN com
// permissão de escrever segredos, grava o novo no segredo do repositório (gh secret set).
//
// Uso:
//   node scripts/publicar-threads.mjs --diagnostico
//   node scripts/publicar-threads.mjs <slug>              simula
//   node scripts/publicar-threads.mjs <slug> --publicar
//   node scripts/publicar-threads.mjs --renovar
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const publicar = args.includes('--publicar');
const BASE = 'https://graph.threads.net/v1.0';
const SITE = (process.env.SITE_URL || 'https://ateladoreino.com').replace(/\/$/, '');
const TOKEN = process.env.THREADS_ACCESS_TOKEN;
const existe = (p) => access(p).then(() => true, () => false);

async function api(caminho, corpo) {
  const url = `${BASE}/${caminho}`;
  const r = corpo
    ? await fetch(url, { method: 'POST', body: new URLSearchParams({ ...corpo, access_token: TOKEN }) })
    : await fetch(`${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(TOKEN)}`);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`${caminho.split('?')[0]}: ${j.error?.message || r.status}`);
  return j;
}

/** Monta o texto do post a partir do carrossel (limite do Threads: 500 caracteres). */
export function textoDoPost(spec, link) {
  const capa = spec.slides.find((s) => s.tipo === 'capa')?.titulo ?? '';
  const v = spec.slides.find((s) => s.tipo === 'versiculo');
  const t = spec.slides.find((s) => s.tipo === 'texto');
  const miolo = v ? `“${v.citacao}” (${v.ref})\n\n${v.comentario}` : t ? (t.titulo ? `${t.titulo}: ${t.texto}` : t.texto) : '';
  const pergunta = spec.legenda.split('\n')[0];
  let texto = [capa, miolo, pergunta, `Leia o texto completo: ${link}`].filter(Boolean).join('\n\n');
  if (texto.length > 500) texto = [capa, miolo, `Leia: ${link}`].filter(Boolean).join('\n\n');
  if (texto.length > 500) texto = [capa, `Leia: ${link}`].join('\n\n');
  return texto;
}

if (!TOKEN && !(slug && !publicar)) {
  console.error('Falta THREADS_ACCESS_TOKEN.');
  process.exit(1);
}

if (args.includes('--diagnostico')) {
  const eu = await api('me?fields=id,username');
  console.log(`Conta do Threads: @${eu.username} (${eu.id})`);
  const cota = await api(`${eu.id}/threads_publishing_limit?fields=quota_usage,config`).catch((e) => ({ erro: e.message }));
  console.log(cota.erro ? `Sem permissão de publicação: ${cota.erro}` : `Publicação liberada: ${cota.data?.[0]?.quota_usage ?? 0} posts nas últimas 24 h.`);
  process.exit(0);
}

if (args.includes('--renovar')) {
  const r = await fetch(`${BASE.replace('/v1.0', '')}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(TOKEN)}`);
  const j = await r.json();
  if (!j.access_token) throw new Error(`Renovação recusada: ${j.error?.message || r.status}`);
  const dias = Math.round((j.expires_in ?? 0) / 86400);
  if (process.env.GH_TOKEN) {
    execFileSync('gh', ['secret', 'set', 'THREADS_ACCESS_TOKEN', '--repo', process.env.GITHUB_REPOSITORY, '--body', j.access_token], { stdio: 'inherit' });
    console.log(`Token do Threads renovado (válido por ${dias} dias) e salvo no segredo THREADS_ACCESS_TOKEN.`);
  } else {
    console.log(`::warning::Token do Threads renovado (${dias} dias), mas sem GH_TOKEN para gravar o segredo. Configure o segredo GH_SECRETS_TOKEN.`);
  }
  process.exit(0);
}

if (!slug) {
  console.error('Uso: node scripts/publicar-threads.mjs <slug> [--publicar] | --diagnostico | --renovar');
  process.exit(1);
}
const REGISTRO = join('conteudo-social', slug, 'threads.json');
if (await existe(REGISTRO)) {
  console.log(`${slug}: já publicado no Threads.`);
  process.exit(publicar ? 1 : 0);
}
const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'));
const texto = textoDoPost(spec, `${SITE}/blog/${slug}/`);
console.log(`Threads: ${slug} (${texto.length} caracteres)\n\n${texto}\n`);
if (!publicar) {
  console.log('Simulação: nada foi publicado. Use --publicar.');
  process.exit(0);
}

const eu = await api('me?fields=id');
const { id: criacao } = await api(`${eu.id}/threads`, { media_type: 'TEXT', text: texto });
// A Meta recomenda esperar alguns segundos entre criar e publicar.
await new Promise((r) => setTimeout(r, 10000));
const { id } = await api(`${eu.id}/threads_publish`, { creation_id: criacao });
console.log(`Publicado no Threads: ${id}`);
await writeFile(REGISTRO, JSON.stringify({ id, publicadoEm: new Date().toISOString() }, null, 2) + '\n');

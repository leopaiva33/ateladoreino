// Aplica no canal do YouTube o que está em conteudo-social/youtube-canal.json:
// - descrição e palavras-chave do canal;
// - correções de título ("titulos": { "<id do vídeo>": "<título novo>" });
// - playlists: cria as que não existem (pelo título) e acrescenta os vídeos que faltam, na ordem.
// Pode rodar quantas vezes quiser: só muda o que estiver diferente.
//
// Credenciais: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN (escopo youtube.force-ssl).
// Cota: cerca de 50 unidades por item criado ou alterado (bem abaixo das 10.000 diárias).
// Uso: node scripts/ajustar-youtube.mjs
import { readFile } from 'node:fs/promises';

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
  console.error('Faltam YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN.');
  process.exit(1);
}
const cfg = JSON.parse(await readFile('conteudo-social/youtube-canal.json', 'utf8'));

const r = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, refresh_token: YOUTUBE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
});
const tk = await r.json();
if (!tk.access_token) throw new Error(`Não consegui renovar o acesso ao YouTube: ${tk.error ?? ''}`);

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(metodo, caminho, corpo) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${caminho}`, {
    method: metodo,
    headers: { authorization: `Bearer ${tk.access_token}`, 'content-type': 'application/json; charset=UTF-8' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`YouTube respondeu ${res.status} em ${metodo} ${caminho.split('?')[0]}: ${JSON.stringify(j).slice(0, 400)}`);
  return j;
}

// 1. Descrição e palavras-chave do canal (o resto do brandingSettings é mantido).
const canal = (await api('GET', 'channels?part=brandingSettings&mine=true')).items[0];
const atual = canal.brandingSettings.channel ?? {};
if (atual.description !== cfg.descricaoCanal || atual.keywords !== cfg.palavrasChave) {
  await api('PUT', 'channels?part=brandingSettings', {
    id: canal.id,
    brandingSettings: { ...canal.brandingSettings, channel: { ...atual, description: cfg.descricaoCanal, keywords: cfg.palavrasChave } },
  });
  console.log('Canal: descrição e palavras-chave atualizadas.');
} else console.log('Canal: descrição e palavras-chave já estavam certas.');

// 2. Títulos.
for (const [id, titulo] of Object.entries(cfg.titulos ?? {})) {
  const v = (await api('GET', `videos?part=snippet&id=${id}`)).items?.[0];
  if (!v) {
    console.log(`::warning::Vídeo ${id} não encontrado.`);
    continue;
  }
  if (v.snippet.title === titulo) {
    console.log(`${id}: título já está certo.`);
    continue;
  }
  const { categoryId, description, tags, defaultLanguage, defaultAudioLanguage } = v.snippet;
  await api('PUT', 'videos?part=snippet', { id, snippet: { title: titulo, categoryId, description, tags, defaultLanguage, defaultAudioLanguage } });
  console.log(`${id}: título "${v.snippet.title}" -> "${titulo}".`);
}

// 3. Playlists.
const existentes = [];
let pagina = '';
do {
  const j = await api('GET', `playlists?part=snippet&mine=true&maxResults=50${pagina ? `&pageToken=${pagina}` : ''}`);
  existentes.push(...j.items);
  pagina = j.nextPageToken ?? '';
} while (pagina);

for (const p of cfg.playlists ?? []) {
  let lista = existentes.find((e) => e.snippet.title === p.titulo);
  const nova = !lista;
  if (nova) {
    lista = await api('POST', 'playlists?part=snippet,status', {
      snippet: { title: p.titulo, description: p.descricao, defaultLanguage: 'pt-BR' },
      status: { privacyStatus: 'public' },
    });
    console.log(`Playlist criada: ${p.titulo} (${lista.id})`);
  } else if (lista.snippet.description !== p.descricao) {
    await api('PUT', 'playlists?part=snippet', { id: lista.id, snippet: { title: p.titulo, description: p.descricao, defaultLanguage: 'pt-BR' } });
    console.log(`Playlist ${p.titulo}: descrição atualizada.`);
  }
  // Uma playlist recém-criada ainda não aparece na leitura (404): começa vazia.
  const ja = new Set();
  let pg = '';
  if (!nova) do {
    const j = await api('GET', `playlistItems?part=contentDetails&maxResults=50&playlistId=${lista.id}${pg ? `&pageToken=${pg}` : ''}`);
    for (const i of j.items) ja.add(i.contentDetails.videoId);
    pg = j.nextPageToken ?? '';
  } while (pg);
  for (const id of p.videos) {
    if (ja.has(id)) continue;
    await pausa(1500);
    await api('POST', 'playlistItems?part=snippet', { snippet: { playlistId: lista.id, resourceId: { kind: 'youtube#video', videoId: id } } });
    console.log(`  + ${id} em "${p.titulo}"`);
  }
}
console.log('Pronto.');

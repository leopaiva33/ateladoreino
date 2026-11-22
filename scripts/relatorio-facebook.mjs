// Relatório da Página do Facebook (API Graph da Meta, só leitura): seguidores, números dos
// últimos 28 dias e de cada post (reações, comentários, compartilhamentos e, quando a Meta
// libera, alcance e cliques). Imprime em Markdown no log e no resumo do GitHub Actions.
//
// Credenciais: IG_USER_ID e IG_ACCESS_TOKEN (as mesmas da publicação). A Página é a que tem
// o Instagram IG_USER_ID vinculado. Métricas de alcance exigem read_insights.
// Uso: node scripts/relatorio-facebook.mjs
import { appendFile, readdir, readFile, writeFile } from 'node:fs/promises';

const { IG_USER_ID, IG_ACCESS_TOKEN, GITHUB_STEP_SUMMARY } = process.env;
if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
  console.error('Faltam IG_USER_ID e IG_ACCESS_TOKEN.');
  process.exit(1);
}
const BASE = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v21.0'}`;

async function get(caminho, params = {}, token = IG_ACCESS_TOKEN) {
  const q = new URLSearchParams({ ...params, access_token: token });
  const j = await (await fetch(`${BASE}/${caminho}?${q}`)).json();
  if (j.error) throw new Error(j.error.message);
  return j;
}
const talvez = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    return { erro: e.message };
  }
};

const perms = await talvez(() => get('me/permissions'));
const concedidas = (perms.data ?? []).filter((p) => p.status === 'granted').map((p) => p.permission);
const contas = await get('me/accounts', { fields: 'id,name,access_token,instagram_business_account', limit: '100' });
const conta = (contas.data ?? []).find((c) => c.instagram_business_account?.id === IG_USER_ID);
if (!conta) throw new Error('Nenhuma Página acessível está vinculada a este Instagram.');
const tk = conta.access_token;

const pagina = await get(conta.id, { fields: 'name,username,link,fan_count,followers_count,about,category,website,description' }, tk);

// Conta: últimos 28 dias (métricas de Página que a Meta ainda mantém).
const ate = Math.floor(Date.now() / 1000);
const desde = ate - 28 * 86400;
const metricasPagina = [
  'page_impressions_unique',
  'page_post_engagements',
  'page_follows',
  'page_daily_follows_unique',
  'page_views_total',
  'page_video_views',
];
const resumoPagina = [];
for (const m of metricasPagina) {
  const r = await talvez(() => get(`${conta.id}/insights`, { metric: m, period: 'day', since: String(desde), until: String(ate) }, tk));
  if (r.erro) resumoPagina.push(`- ${m}: indisponível (${r.erro.slice(0, 90)})`);
  else {
    const vals = r.data?.[0]?.values ?? [];
    const soma = vals.reduce((s, v) => s + (typeof v.value === 'number' ? v.value : 0), 0);
    const ultimo = vals.at(-1)?.value;
    resumoPagina.push(`- ${m}: soma 28 dias = ${soma}${m === 'page_follows' ? ` (hoje: ${ultimo})` : ''}`);
  }
}

// Lista de posts: pelo feed da Página (exige pages_read_user_content) ou, sem essa permissão,
// pelos registros de publicação do repositório (facebook.json e facebook-reel.json).
const CAMPOS = 'id,created_time,message,permalink_url,status_type,shares,reactions.summary(total_count),comments.summary(total_count),attachments{media_type,type}';
let posts = [];
let origem = 'feed da Página';
const feed = await talvez(async () => {
  let depois = '';
  do {
    const j = await get(`${conta.id}/posts`, { fields: CAMPOS, limit: '50', ...(depois ? { after: depois } : {}) }, tk);
    posts.push(...j.data);
    depois = j.paging?.next ? j.paging.cursors?.after ?? '' : '';
  } while (depois && posts.length < 150);
});
if (feed?.erro) {
  origem = `registros do repositório (o feed pede pages_read_user_content: ${feed.erro.slice(0, 60)}…)`;
  posts = [];
  for (const slug of await readdir('conteudo-social')) {
    for (const [arq, tipo] of [['facebook.json', 'carrossel'], ['facebook-reel.json', 'reel']]) {
      const reg = await readFile(`conteudo-social/${slug}/${arq}`, 'utf8').then(JSON.parse, () => null);
      if (!reg?.id) continue;
      const dados = await talvez(() =>
        get(reg.id, { fields: tipo === 'reel' ? 'id,created_time,description,permalink_url,length,views' : CAMPOS }, tk),
      );
      posts.push({ id: reg.id, created_time: reg.publicadoEm, slug, tipo, ...(dados.erro ? { erroLeitura: dados.erro } : dados) });
    }
  }
  posts.sort((a, b) => (a.created_time < b.created_time ? 1 : -1));
}

let erroPost = '';
for (const p of posts.slice(0, 40)) {
  const metricas = p.tipo === 'reel' ? 'blue_reels_play_count,post_impressions_unique,post_video_avg_time_watched' : 'post_impressions_unique,post_clicks,post_reactions_by_type_total';
  const r = await talvez(() => get(`${p.id}/${p.tipo === 'reel' ? 'video_insights' : 'insights'}`, p.tipo === 'reel' ? {} : { metric: metricas }, tk));
  if (r.erro) {
    erroPost ||= r.erro;
    continue;
  }
  p.ins = Object.fromEntries(r.data.map((m) => [m.name, m.values?.[0]?.value]));
}

// Reels (vídeos) da Página.
const videos = await talvez(() => get(`${conta.id}/video_reels`, { fields: 'id,created_time,description,permalink_url,length,views', limit: '50' }, tk));

const n = (v) => (v === undefined || v === null ? '-' : v);
const L = [
  `## Facebook: ${pagina.name} (${pagina.link ?? ''})`,
  '',
  `- Curtidas da Página: ${n(pagina.fan_count)} · seguidores: ${n(pagina.followers_count)}`,
  `- Categoria: ${n(pagina.category)} · site: ${n(pagina.website)}`,
  `- Sobre: ${(pagina.about || pagina.description || '(vazio)').replace(/\n+/g, ' / ')}`,
  `- Permissões do token: ${concedidas.join(', ') || '(não listadas)'}`,
  `- Posts lidos de: ${origem}`,
  `- Métricas por post: ${erroPost ? `indisponíveis (${erroPost.slice(0, 120)})` : 'ok'}`,
  '',
  '### Página, últimos 28 dias',
  ...resumoPagina,
  '',
  '| Data (UTC) | Hora | Tipo | Alcance | Cliques/Plays | Reações | Coment. | Compart. | Texto ou slug |',
  '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
];
for (const p of posts) {
  const tipo = p.tipo ?? p.attachments?.data?.[0]?.media_type ?? p.status_type ?? '';
  const cliques = p.ins?.post_clicks ?? p.ins?.blue_reels_play_count ?? p.views;
  L.push(
    `| ${p.created_time.slice(0, 10)} | ${p.created_time.slice(11, 16)} | ${tipo} | ${n(p.ins?.post_impressions_unique)} | ${n(cliques)} | ${n(p.reactions?.summary?.total_count)} | ${n(p.comments?.summary?.total_count)} | ${n(p.shares?.count ?? 0)} | ${p.erroLeitura ? `(sem leitura: ${p.erroLeitura.slice(0, 50)})` : (p.slug ?? (p.message ?? '').split('\n')[0].slice(0, 60)).replace(/\|/g, '/')} |`,
  );
}
if (videos.erro) L.push('', `- Reels da Página: indisponível (${videos.erro.slice(0, 120)})`);
else {
  L.push('', '### Reels da Página', '', '| Data (UTC) | Duração | Views | Início da descrição |', '| --- | ---: | ---: | --- |');
  for (const v of videos.data ?? [])
    L.push(`| ${v.created_time.slice(0, 16).replace('T', ' ')} | ${n(Math.round(v.length ?? 0))} s | ${n(v.views)} | ${(v.description ?? '').split('\n')[0].slice(0, 60).replace(/\|/g, '/')} |`);
}
if (process.env.RESUMO_JSON) {
  const semana = Date.now() - 7 * 864e5;
  const reelsSemana = (videos.data ?? []).filter((v) => Date.parse(v.created_time) >= semana);
  await writeFile(
    process.env.RESUMO_JSON,
    JSON.stringify({
      seguidores: pagina.followers_count ?? null,
      curtidas: pagina.fan_count ?? null,
      reelsSemana: reelsSemana.length,
      viewsReelsSemana: reelsSemana.reduce((t, v) => t + Number(v.views ?? 0), 0),
    }),
  );
}
const md = L.join('\n') + '\n';
console.log(md);
if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, md);

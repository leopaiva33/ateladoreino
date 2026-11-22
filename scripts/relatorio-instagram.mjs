// Relatório do Instagram (API Graph da Meta, só leitura): perfil, seguidores e números de cada
// post (curtidas, comentários e, se o token tiver instagram_manage_insights, alcance,
// visualizações, salvamentos, compartilhamentos e seguidores ganhos). Também traz os números
// da conta nos últimos 28 dias e o público (cidade, idade e gênero), quando disponíveis.
// Imprime em Markdown no log e no resumo da execução do GitHub Actions.
//
// Credenciais: IG_USER_ID e IG_ACCESS_TOKEN (as mesmas da publicação).
// Uso: node scripts/relatorio-instagram.mjs
import { appendFile, writeFile } from 'node:fs/promises';

const { IG_USER_ID, IG_ACCESS_TOKEN, GITHUB_STEP_SUMMARY } = process.env;
if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
  console.error('Faltam IG_USER_ID e IG_ACCESS_TOKEN.');
  process.exit(1);
}
const BASE = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v21.0'}`;

async function api(caminho, params = {}) {
  const q = new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN });
  const res = await fetch(`${BASE}/${caminho}?${q}`);
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
  return j;
}
const talvez = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    return { erro: e.message };
  }
};

const perfil = await api(IG_USER_ID, {
  fields: 'username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url',
});

const posts = [];
let depois = '';
do {
  const j = await api(`${IG_USER_ID}/media`, {
    fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count',
    limit: '50',
    ...(depois ? { after: depois } : {}),
  });
  posts.push(...j.data);
  depois = j.paging?.next ? j.paging.cursors.after : '';
} while (depois && posts.length < 200);

// Métricas por post (dependem do tipo e da permissão instagram_manage_insights).
let semInsights = '';
for (const p of posts) {
  const reel = p.media_product_type === 'REELS';
  const metricas = reel
    ? 'reach,views,saved,shares,total_interactions,ig_reels_avg_watch_time'
    : 'reach,views,saved,shares,total_interactions,follows,profile_visits';
  const r = await talvez(() => api(`${p.id}/insights`, { metric: metricas }));
  if (r.erro) {
    // tenta o conjunto mínimo antes de desistir
    const r2 = await talvez(() => api(`${p.id}/insights`, { metric: 'reach,saved,shares' }));
    if (r2.erro) {
      semInsights ||= r2.erro;
      continue;
    }
    p.ins = Object.fromEntries(r2.data.map((m) => [m.name, m.values?.[0]?.value ?? m.total_value?.value]));
  } else p.ins = Object.fromEntries(r.data.map((m) => [m.name, m.values?.[0]?.value ?? m.total_value?.value]));
}

// Conta: últimos 28 dias.
const ate = Math.floor(Date.now() / 1000);
const desde = ate - 28 * 86400;
const conta = await talvez(() =>
  api(`${IG_USER_ID}/insights`, {
    metric: 'reach,views,accounts_engaged,total_interactions,profile_links_taps,follows_and_unfollows',
    period: 'day',
    metric_type: 'total_value',
    since: String(desde),
    until: String(ate),
  }),
);
const alcanceDia = await talvez(() => api(`${IG_USER_ID}/insights`, { metric: 'reach', period: 'day', since: String(desde), until: String(ate) }));
const publico = {};
for (const quebra of ['city', 'age', 'gender']) {
  publico[quebra] = await talvez(() =>
    api(`${IG_USER_ID}/insights`, { metric: 'follower_demographics', period: 'lifetime', metric_type: 'total_value', breakdown: quebra }),
  );
}

const tipo = (p) => (p.media_product_type === 'REELS' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : p.media_type === 'VIDEO' ? 'Vídeo' : 'Foto');
const n = (v) => (v === undefined || v === null ? '-' : v);
const L = [
  `## Instagram: @${perfil.username} (${perfil.name ?? ''})`,
  '',
  `- Seguidores: ${perfil.followers_count} · seguindo: ${perfil.follows_count} · posts: ${perfil.media_count}`,
  `- Bio: ${(perfil.biography || '(vazia)').replace(/\n+/g, ' / ')}`,
  `- Link: ${perfil.website || '(nenhum)'}`,
  `- Métricas por post: ${semInsights ? `indisponíveis (${semInsights})` : 'ok'}`,
  '',
];
if (!conta.erro) {
  L.push('### Conta, últimos 28 dias', '');
  for (const m of conta.data) {
    const tv = m.total_value;
    const val = tv?.breakdowns?.length ? JSON.stringify(tv.breakdowns[0].results.map((r) => [r.dimension_values.join('/'), r.value])) : tv?.value;
    L.push(`- ${m.name}: ${val}`);
  }
  L.push('');
} else L.push(`- Conta (28 dias): indisponível (${conta.erro})`, '');
if (!alcanceDia.erro) {
  L.push(`- Alcance por dia: ${alcanceDia.data[0].values.map((v) => `${v.end_time.slice(5, 10)}=${v.value}`).join(' ')}`, '');
}
for (const [k, v] of Object.entries(publico)) {
  if (v.erro) {
    L.push(`- Público por ${k}: indisponível (${v.erro})`);
    continue;
  }
  const res = v.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  const top = res.sort((a, b) => b.value - a.value).slice(0, 8).map((r) => `${r.dimension_values.join('/')}: ${r.value}`).join(' · ');
  L.push(`- Público por ${k}: ${top || '(sem dados: a Meta só mostra a partir de 100 seguidores)'}`);
}
L.push(
  '',
  '| Data (UTC) | Hora | Tipo | Alcance | Views | Curt. | Coment. | Salv. | Compart. | Seguiu | Visitas perfil | Início da legenda |',
  '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
);
for (const p of posts) {
  const i = p.ins ?? {};
  L.push(
    `| ${p.timestamp.slice(0, 10)} | ${p.timestamp.slice(11, 16)} | ${tipo(p)} | ${n(i.reach)} | ${n(i.views)} | ${n(p.like_count)} | ${n(p.comments_count)} | ${n(i.saved)} | ${n(i.shares)} | ${n(i.follows)} | ${n(i.profile_visits)} | ${(p.caption ?? '').split('\n')[0].slice(0, 70).replace(/\|/g, '/')} |`,
  );
}
L.push('', '### Legendas completas dos 5 posts mais recentes', '');
for (const p of posts.slice(0, 5)) L.push(`- ${p.permalink}`, `  ${(p.caption ?? '').replace(/\n+/g, ' / ').slice(0, 900)}`);
if (process.env.RESUMO_JSON) {
  const semana = Date.now() - 7 * 864e5;
  const daSemana = posts.filter((p) => Date.parse(p.timestamp) >= semana);
  const soma = (k) => daSemana.reduce((t, p) => t + Number(p.ins?.[k] ?? 0), 0);
  const melhor = [...daSemana].sort((a, b) => Number(b.ins?.reach ?? 0) - Number(a.ins?.reach ?? 0))[0];
  const valorConta = (nome) => (conta.erro ? null : conta.data.find((m) => m.name === nome)?.total_value?.value ?? null);
  await writeFile(
    process.env.RESUMO_JSON,
    JSON.stringify({
      seguidores: perfil.followers_count,
      seguindo: perfil.follows_count,
      alcance28: valorConta('reach'),
      toquesLink28: valorConta('profile_links_taps'),
      postsSemana: daSemana.length,
      alcanceSemana: soma('reach'),
      salvamentosSemana: soma('saved'),
      compartilhamentosSemana: soma('shares'),
      melhorPost: melhor ? { legenda: (melhor.caption ?? '').split('\n')[0].slice(0, 60), tipo: tipo(melhor), alcance: Number(melhor.ins?.reach ?? 0), link: melhor.permalink } : null,
    }),
  );
}
const md = L.join('\n') + '\n';
console.log(md);
if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, md);

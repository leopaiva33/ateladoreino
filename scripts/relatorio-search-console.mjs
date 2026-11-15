// Relatório do Google Search Console (desempenho na busca do Google) dos últimos N dias.
// Imprime tabelas em Markdown no log e no resumo da execução do GitHub Actions.
// Os dados do Search Console chegam com 2 a 3 dias de atraso.
//
// Credenciais: YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET (o mesmo cliente OAuth),
// GA_REFRESH_TOKEN com o escopo https://www.googleapis.com/auth/webmasters.readonly
// (o mesmo token pode ter também o escopo do Analytics). GSC_SITE (opcional): a propriedade,
// como "sc-domain:ateladoreino.com" ou "https://ateladoreino.com/"; sem ela, usa a que tiver
// "ateladoreino" na conta.
//
// Uso: node scripts/relatorio-search-console.mjs [dias]   (padrão: 28)
import { appendFile } from 'node:fs/promises';

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, GA_REFRESH_TOKEN, GSC_SITE } = process.env;
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !GA_REFRESH_TOKEN) {
  console.error('Faltam credenciais: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e GA_REFRESH_TOKEN.');
  process.exit(1);
}
const dias = Number(process.argv[2] ?? 28);
const iso = (d) => d.toISOString().slice(0, 10);
const fim = new Date(Date.now() - 2 * 86400000); // os últimos ~2 dias ainda não estão completos
const inicio = new Date(fim.getTime() - (dias - 1) * 86400000);

const tok = await (
  await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, refresh_token: GA_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  })
).json();
if (!tok.access_token) {
  console.error(`Não consegui renovar o acesso: ${tok.error} ${tok.error_description ?? ''}`);
  process.exit(1);
}
if (tok.scope && !tok.scope.includes('webmasters')) {
  console.log('::warning::O token não tem o escopo webmasters.readonly; o relatório do Search Console foi pulado.');
  process.exit(0);
}
const auth = { authorization: `Bearer ${tok.access_token}` };

let site = GSC_SITE;
if (!site) {
  const r = await fetch('https://www.googleapis.com/webmasters/v3/sites', { headers: auth });
  const j = await r.json();
  if (!r.ok) throw new Error(`Search Console respondeu ${r.status}: ${JSON.stringify(j.error ?? j).slice(0, 300)}`);
  const sites = (j.siteEntry ?? []).filter((s) => s.siteUrl.includes('ateladoreino') && s.permissionLevel !== 'siteUnverifiedUser');
  site = (sites.find((s) => s.siteUrl.startsWith('sc-domain:')) ?? sites.find((s) => !s.siteUrl.includes('www.')) ?? sites[0])?.siteUrl;
  if (!site) throw new Error(`Nenhuma propriedade do ateladoreino na conta. Encontradas: ${(j.siteEntry ?? []).map((s) => s.siteUrl).join(', ') || 'nenhuma'}`);
}

async function consulta(dimensoes, limite = 10) {
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: iso(inicio), endDate: iso(fim), dimensions: dimensoes, rowLimit: limite }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Search Console respondeu ${r.status}: ${JSON.stringify(j.error ?? j).slice(0, 300)}`);
  return j.rows ?? [];
}

const n = (v) => Math.round(v).toLocaleString('pt-BR');
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pos = (v) => v.toFixed(1);
const tabela = (cab, linhas) => [`| ${cab.join(' | ')} |`, `|${cab.map(() => '---').join('|')}|`, ...linhas.map((l) => `| ${l.join(' | ')} |`)].join('\n');
const curto = (url) => url.replace(/^https?:\/\/(www\.)?ateladoreino\.com/, '') || '/';

const saida = [`# Search Console: ${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')} (${site})`, ''];
const [tot] = await consulta([], 1);
if (!tot) saida.push('Nenhum dado de busca no período (o site pode ainda não aparecer nas buscas, ou os dados ainda não chegaram).');
else {
  saida.push(
    tabela(['Cliques', 'Impressões', 'CTR', 'Posição média'], [[n(tot.clicks), n(tot.impressions), pct(tot.ctr), pos(tot.position)]]),
    '',
    '## Buscas que mostraram o site',
    tabela(['Busca', 'Cliques', 'Impressões', 'CTR', 'Posição'], (await consulta(['query'], 20)).sort((a, b) => b.impressions - a.impressions).map((r) => [r.keys[0], n(r.clicks), n(r.impressions), pct(r.ctr), pos(r.position)])),
    '',
    '## Páginas',
    tabela(['Página', 'Cliques', 'Impressões', 'CTR', 'Posição'], (await consulta(['page'], 20)).sort((a, b) => b.impressions - a.impressions).map((r) => [curto(r.keys[0]), n(r.clicks), n(r.impressions), pct(r.ctr), pos(r.position)])),
    '',
    '## Dispositivo',
    tabela(['Dispositivo', 'Cliques', 'Impressões'], (await consulta(['device'], 5)).map((r) => [r.keys[0], n(r.clicks), n(r.impressions)])),
  );
}

const texto = saida.join('\n');
console.log(texto);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${texto}\n`);

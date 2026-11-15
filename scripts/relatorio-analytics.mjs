// Relatório do Google Analytics 4 (API Data v1) dos últimos N dias.
// Imprime tabelas em Markdown no log e no resumo da execução do GitHub Actions.
// Só números agregados (nenhum dado pessoal de visitante).
//
// Credenciais: YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET (o mesmo cliente OAuth do YouTube),
// GA_REFRESH_TOKEN (escopo https://www.googleapis.com/auth/analytics.readonly) e
// GA_PROPERTY_ID (número da propriedade, em Administrador > Detalhes da propriedade).
//
// Uso: node scripts/relatorio-analytics.mjs [dias]   (padrão: 7)
import { appendFile } from 'node:fs/promises';

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, GA_REFRESH_TOKEN, GA_PROPERTY_ID } = process.env;
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !GA_REFRESH_TOKEN || !GA_PROPERTY_ID) {
  console.error('Faltam credenciais: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, GA_REFRESH_TOKEN e GA_PROPERTY_ID.');
  process.exit(1);
}
const dias = Number(process.argv[2] ?? 7);
const periodo = { startDate: `${dias}daysAgo`, endDate: 'today' };

const tok = await (
  await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, refresh_token: GA_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  })
).json();
if (!tok.access_token) {
  console.error(`Não consegui renovar o acesso ao Google Analytics: ${tok.error} ${tok.error_description ?? ''}`);
  process.exit(1);
}

async function relatorio({ dimensoes = [], metricas, ordem, limite = 10 }) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tok.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [periodo],
      dimensions: dimensoes.map((name) => ({ name })),
      metrics: metricas.map((name) => ({ name })),
      orderBys: ordem ? [{ metric: { metricName: ordem }, desc: true }] : undefined,
      limit: limite,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Google Analytics respondeu ${r.status}: ${JSON.stringify(j.error ?? j).slice(0, 400)}`);
  return (j.rows ?? []).map((row) => [...(row.dimensionValues ?? []).map((v) => v.value), ...row.metricValues.map((v) => v.value)]);
}

const fmt = (v, tipo) => {
  const n = Number(v);
  if (tipo === 'pct') return `${(n * 100).toFixed(1)}%`;
  if (tipo === 'seg') return `${Math.floor(n / 60)}min${String(Math.round(n % 60)).padStart(2, '0')}s`;
  return Number.isInteger(n) ? n.toLocaleString('pt-BR') : n.toFixed(1);
};
const tabela = (cab, linhas) => [`| ${cab.join(' | ')} |`, `|${cab.map(() => '---').join('|')}|`, ...linhas.map((l) => `| ${l.join(' | ')} |`)].join('\n');

const saida = [`# Google Analytics: últimos ${dias} dias`, ''];

const [tot] = await relatorio({ metricas: ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration'] });
if (!tot) saida.push('Nenhum dado no período.');
else {
  saida.push(
    tabela(
      ['Usuários', 'Novos', 'Sessões', 'Visualizações', 'Engajamento', 'Duração média da sessão'],
      [[fmt(tot[0]), fmt(tot[1]), fmt(tot[2]), fmt(tot[3]), fmt(tot[4], 'pct'), fmt(tot[5], 'seg')]],
    ),
    '',
    '## Por dia',
    tabela(['Dia', 'Usuários', 'Visualizações'], (await relatorio({ dimensoes: ['date'], metricas: ['activeUsers', 'screenPageViews'], limite: 60 })).sort().map(([d, u, v]) => [`${d.slice(6)}/${d.slice(4, 6)}`, fmt(u), fmt(v)])),
    '',
    '## Páginas mais vistas',
    tabela(['Página', 'Visualizações', 'Usuários', 'Tempo de engajamento médio'], (await relatorio({ dimensoes: ['pagePath'], metricas: ['screenPageViews', 'activeUsers', 'userEngagementDuration'], ordem: 'screenPageViews', limite: 15 })).map(([p, v, u, e]) => [p, fmt(v), fmt(u), fmt(Number(e) / Math.max(1, Number(u)), 'seg')])),
    '',
    '## Origem das sessões',
    tabela(['Origem / meio', 'Sessões', 'Usuários'], (await relatorio({ dimensoes: ['sessionSourceMedium'], metricas: ['sessions', 'activeUsers'], ordem: 'sessions', limite: 12 })).map(([o, s, u]) => [o, fmt(s), fmt(u)])),
    '',
    '## Dispositivo',
    tabela(['Dispositivo', 'Usuários'], (await relatorio({ dimensoes: ['deviceCategory'], metricas: ['activeUsers'], ordem: 'activeUsers' })).map(([d, u]) => [d, fmt(u)])),
    '',
    '## Cidades',
    tabela(['Cidade', 'Usuários'], (await relatorio({ dimensoes: ['city'], metricas: ['activeUsers'], ordem: 'activeUsers', limite: 10 })).map(([c, u]) => [c, fmt(u)])),
  );
}
saida.push('', '_Conta apenas visitantes que aceitaram os cookies do Google Analytics._');

const texto = saida.join('\n');
console.log(texto);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, texto + '\n');

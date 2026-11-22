// Relatório semanal único: site (Google Analytics), Google (Search Console), YouTube, Instagram
// e Facebook, com um resumo no topo comparando com a semana anterior.
//
// Roda cada relatório (scripts/relatorio-*.mjs) e junta tudo:
// - no resumo da execução do GitHub Actions;
// - em relatorios/semanal/AAAA-MM-DD.md (fica no repositório, para consultar depois);
// - em relatorios/semanal/historico.json (os números-chave de cada semana, para comparar).
// Um relatório que falhar (credencial vencida, API fora do ar) não impede os outros.
//
// Uso: node scripts/relatorio-semanal.mjs   (credenciais nas variáveis de ambiente, como no workflow)
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);
const PASTA = 'relatorios/semanal';
const HIST = join(PASTA, 'historico.json');
const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD

const fontes = [
  { chave: 'site', nome: 'Site (Google Analytics, 7 dias)', script: 'relatorio-analytics.mjs', args: ['7'] },
  { chave: 'google', nome: 'Busca no Google (Search Console, 28 dias)', script: 'relatorio-search-console.mjs', args: ['28'] },
  { chave: 'youtube', nome: 'YouTube', script: 'relatorio-youtube.mjs', args: [] },
  { chave: 'instagram', nome: 'Instagram', script: 'relatorio-instagram.mjs', args: [] },
  { chave: 'facebook', nome: 'Facebook', script: 'relatorio-facebook.mjs', args: [] },
];

const tmp = await mkdtemp(join(tmpdir(), 'semanal-'));
const dados = {};
const secoes = [];
for (const f of fontes) {
  const md = join(tmp, `${f.chave}.md`);
  const js = join(tmp, `${f.chave}.json`);
  await writeFile(md, '');
  try {
    await run('node', [join('scripts', f.script), ...f.args], {
      env: { ...process.env, GITHUB_STEP_SUMMARY: md, RESUMO_JSON: js },
      maxBuffer: 20 * 1024 * 1024,
    });
    dados[f.chave] = JSON.parse(await readFile(js, 'utf8').catch(() => 'null'));
    const texto = (await readFile(md, 'utf8')).trim().replace(/^# /gm, '### ').replace(/^## /gm, '#### ');
    secoes.push(`<details><summary><strong>${f.nome}</strong></summary>\n\n${texto || '(sem dados)'}\n\n</details>`);
  } catch (e) {
    const erro = (e.stderr || e.message || '').toString().trim().split('\n').filter(Boolean).slice(-2).join(' ');
    dados[f.chave] = null;
    secoes.push(`<details><summary><strong>${f.nome}</strong>: não foi possível gerar</summary>\n\n${erro.slice(0, 400)}\n\n</details>`);
    console.log(`::warning::${f.nome}: ${erro.slice(0, 200)}`);
  }
}

// Semana anterior (a última entrada do histórico com data diferente de hoje).
const historico = await readFile(HIST, 'utf8').then(JSON.parse, () => []);
const anterior = historico.filter((h) => h.data !== hoje).at(-1);
const ant = (caminho) => caminho.split('.').reduce((o, k) => o?.[k], anterior?.dados);
const atual = (caminho) => caminho.split('.').reduce((o, k) => o?.[k], dados);

const num = (v, casas = 0) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '–' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas });
function variacao(a, b, menorMelhor = false) {
  if (a === null || a === undefined || b === null || b === undefined) return '–';
  const d = Number(a) - Number(b);
  if (!d) return '=';
  const bom = menorMelhor ? d < 0 : d > 0;
  const pct = Number(b) ? ` (${d > 0 ? '+' : ''}${Math.round((d / Number(b)) * 100)}%)` : '';
  return `${bom ? '▲' : '▼'} ${d > 0 ? '+' : ''}${num(d, 1)}${pct}`;
}

const linhasResumo = [
  ['Site: visitantes (7 dias)', 'site.usuarios'],
  ['Site: visualizações de página (7 dias)', 'site.visualizacoes'],
  ['Site: visitas vindas do Google (7 dias)', 'site.origem.google'],
  ['Site: visitas vindas do Instagram (7 dias)', 'site.origem.instagram'],
  ['Site: visitas vindas do YouTube (7 dias)', 'site.origem.youtube'],
  ['Site: visitas vindas do Facebook (7 dias)', 'site.origem.facebook'],
  ['Google: impressões (28 dias)', 'google.impressoes'],
  ['Google: cliques (28 dias)', 'google.cliques'],
  ['Google: posição média', 'google.posicao', true, 1],
  ['YouTube: inscritos', 'youtube.inscritos'],
  ['YouTube: visualizações (total do canal)', 'youtube.visualizacoes'],
  ['Instagram: seguidores', 'instagram.seguidores'],
  ['Instagram: alcance dos posts da semana', 'instagram.alcanceSemana'],
  ['Instagram: salvamentos da semana', 'instagram.salvamentosSemana'],
  ['Instagram: compartilhamentos da semana', 'instagram.compartilhamentosSemana'],
  ['Instagram: toques no link da bio (28 dias)', 'instagram.toquesLink28'],
  ['Facebook: seguidores da Página', 'facebook.seguidores'],
  ['Facebook: visualizações dos Reels da semana', 'facebook.viewsReelsSemana'],
];

const destaques = [];
if (dados.site?.paginaTopo) destaques.push(`Página mais vista no site: \`${dados.site.paginaTopo.pagina}\` (${num(dados.site.paginaTopo.visualizacoes)} visualizações).`);
if (dados.google?.buscaTopo) destaques.push(`Busca que mais trouxe o site no Google: "${dados.google.buscaTopo.busca}" (${num(dados.google.buscaTopo.cliques)} cliques, ${num(dados.google.buscaTopo.impressoes)} impressões).`);
if (dados.youtube?.melhorRecente) destaques.push(`Vídeo mais visto do último mês no YouTube: "${dados.youtube.melhorRecente.titulo}" (${num(dados.youtube.melhorRecente.views)} visualizações).`);
if (dados.instagram?.melhorPost) destaques.push(`Melhor post da semana no Instagram: ${dados.instagram.melhorPost.tipo} "${dados.instagram.melhorPost.legenda}" (alcance ${num(dados.instagram.melhorPost.alcance)}): ${dados.instagram.melhorPost.link}`);
const falhas = fontes.filter((f) => !dados[f.chave]).map((f) => f.nome);

const md = [
  `# Relatório semanal da A Tela do Reino: ${hoje.split('-').reverse().join('/')}`,
  '',
  anterior ? `Comparação com o relatório de ${anterior.data.split('-').reverse().join('/')}.` : 'Primeiro relatório: a comparação começa na próxima semana.',
  '',
  '## Resumo',
  '',
  '| Indicador | Agora | Semana anterior | Variação |',
  '| --- | ---: | ---: | --- |',
  ...linhasResumo.map(([rotulo, c, menorMelhor, casas]) => `| ${rotulo} | ${num(atual(c), casas)} | ${num(ant(c), casas)} | ${variacao(atual(c), ant(c), menorMelhor)} |`),
  '',
  ...(destaques.length ? ['## Destaques', '', ...destaques.map((d) => `- ${d}`), ''] : []),
  ...(falhas.length ? [`> Não foi possível gerar: ${falhas.join(', ')}. Veja o motivo no detalhe abaixo.`, ''] : []),
  '## Detalhes',
  '',
  ...secoes.flatMap((s) => [s, '']),
].join('\n');

await mkdir(PASTA, { recursive: true });
await writeFile(join(PASTA, `${hoje}.md`), md);
const novo = historico.filter((h) => h.data !== hoje);
novo.push({ data: hoje, dados });
await writeFile(HIST, JSON.stringify(novo, null, 2) + '\n');
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md + '\n');
console.log(md);

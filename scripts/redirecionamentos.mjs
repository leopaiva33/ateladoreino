// Gera os redirecionamentos 301 (vercel.json) dos endereços do site antigo para os artigos novos.
// Lê src/data/redirecionamentos.json e só inclui o redirecionamento quando o artigo de destino
// existe, não é rascunho e já passou da data de publicação (senão o leitor cairia num 404).
// Rodado pelo workflow de publicação agendada: quando um destino é publicado, o vercel.json
// muda e o commit dispara o deploy. Saída GITHUB_OUTPUT: mudou=true|false.
// Uso: node scripts/redirecionamentos.mjs   (AGORA_ISO simula outra data)
import { readFile, writeFile, access, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const existe = (p) => access(p).then(() => true, () => false);
const agora = process.env.AGORA_ISO ? Date.parse(process.env.AGORA_ISO) : Date.now();
const mapa = JSON.parse(await readFile('src/data/redirecionamentos.json', 'utf8'));

// O destino pode ser um slug ou uma lista de slugs em ordem de preferência: vale o primeiro já
// publicado (útil quando um artigo próprio vai substituir um destino provisório).
async function publicado(slug) {
  const arq = join('src', 'content', 'blog', `${slug}.md`);
  if (!(await existe(arq))) return false;
  const fm = (await readFile(arq, 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const data = Date.parse(fm.match(/^pubDate:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '') ?? '');
  return !(/^draft:\s*true\s*$/m.test(fm) || Number.isNaN(data) || data > agora);
}

const redirects = [];
for (const [origem, valor] of Object.entries(mapa)) {
  if (origem.startsWith('_')) continue;
  const opcoes = Array.isArray(valor) ? valor : [valor];
  let slug = null;
  for (const s of opcoes) if (await publicado(s)) { slug = s; break; }
  if (!slug) {
    console.log(`${origem}: "${opcoes.join('" / "')}" ainda não foi publicado; fica para depois.`);
    continue;
  }
  const destino = `/blog/${slug}/`;
  const base = origem.replace(/\/+$/, '');
  redirects.push({ source: base, destination: destino, permanent: true }, { source: `${base}/`, destination: destino, permanent: true });
}

const arqVercel = 'vercel.json';
const atual = (await existe(arqVercel)) ? JSON.parse(await readFile(arqVercel, 'utf8')) : {};
const novo = { ...atual, redirects };
const antes = JSON.stringify(atual);
const depois = JSON.stringify(novo);
if (antes !== depois) await writeFile(arqVercel, JSON.stringify(novo, null, 2) + '\n');
console.log(`${redirects.length / 2} redirecionamento(s) ativo(s)${antes !== depois ? ' (vercel.json atualizado)' : ''}.`);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `mudou=${antes !== depois}\n`);

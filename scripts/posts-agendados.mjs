// Verifica se há post com data de publicação vencida que ainda não está no site publicado.
// Usado por .github/workflows/publicacao-agendada.yml. Sem dependências (Node 22).
//   - publicar=true  -> o workflow cria um commit vazio e faz push (a Vercel faz o deploy).
//   - Compara com o sitemap do site no ar; se a consulta falhar, usa uma janela de 36 h.
import { readdir, readFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/content/blog';
const SITEMAP = process.env.SITEMAP_URL ?? 'https://www.ateladoreino.com/sitemap-0.xml';
const JANELA_MS = 36 * 60 * 60 * 1000;
// AGORA_ISO permite simular outra data em testes (ex.: AGORA_ISO=2026-11-09T12:00:00Z).
const agora = process.env.AGORA_ISO ? Date.parse(process.env.AGORA_ISO) : Date.now();

const vencidos = [];
for (const file of (await readdir(DIR)).filter((f) => f.endsWith('.md'))) {
  const texto = await readFile(join(DIR, file), 'utf8');
  const fm = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  if (/^draft:\s*true\s*$/m.test(fm)) continue;
  const raw = fm.match(/^pubDate:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '');
  const data = raw ? new Date(raw) : null;
  if (!data || Number.isNaN(data.valueOf())) continue;
  if (data.valueOf() <= agora) vencidos.push({ slug: file.replace(/\.md$/, ''), data });
}

let faltando = [];
try {
  const resp = await fetch(SITEMAP, { headers: { 'user-agent': 'publicacao-agendada' } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const xml = await resp.text();
  faltando = vencidos.filter((p) => !xml.includes(`/blog/${p.slug}/`));
  console.log(`Sitemap consultado: ${vencidos.length} post(s) vencidos, ${faltando.length} ausente(s) no site.`);
} catch (erro) {
  faltando = vencidos.filter((p) => agora - p.data.valueOf() < JANELA_MS);
  console.log(`Não foi possível consultar o sitemap (${erro.message}); usando janela de 36 h: ${faltando.length} post(s).`);
}

const slugs = faltando.map((p) => p.slug).join(', ');
console.log(faltando.length ? `Publicar: ${slugs}` : 'Nada a publicar agora.');

if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `publicar=${faltando.length > 0}\nslugs=${slugs}\n`);
}

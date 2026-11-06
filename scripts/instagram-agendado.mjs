// Escolhe o próximo carrossel a publicar no Instagram, acompanhando o calendário do blog.
// Usado por .github/workflows/instagram-agendado.yml. Sem dependências (Node 22).
//
// Um post entra na fila quando:
//   - o artigo não é rascunho e a data (pubDate) já chegou, a partir de INICIO;
//   - o artigo já aparece no sitemap do site no ar (o link da bio precisa funcionar);
//   - existe conteudo-social/<slug>/carrossel.json e os slides em public/social/<slug>/;
//   - ainda não existe conteudo-social/<slug>/instagram.json (registro de publicação).
// Publica um por execução, do mais antigo para o mais novo.
// Artigos vencidos sem carrossel geram um aviso no log do GitHub Actions.
import { readdir, readFile, appendFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/content/blog';
const SITEMAP = process.env.SITEMAP_URL ?? 'https://www.ateladoreino.com/sitemap-0.xml';
// Artigos anteriores a esta data não são publicados automaticamente (use o workflow manual).
const INICIO = Date.parse(process.env.INICIO_ISO ?? '2026-11-07T00:00:00-03:00');
const agora = process.env.AGORA_ISO ? Date.parse(process.env.AGORA_ISO) : Date.now();
const existe = (p) => access(p).then(() => true, () => false);

const vencidos = [];
for (const file of (await readdir(DIR)).filter((f) => f.endsWith('.md'))) {
  const fm = (await readFile(join(DIR, file), 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  if (/^draft:\s*true\s*$/m.test(fm)) continue;
  const raw = fm.match(/^pubDate:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '');
  const data = raw ? Date.parse(raw) : NaN;
  if (Number.isNaN(data) || data > agora || data < INICIO) continue;
  vencidos.push({ slug: file.replace(/\.md$/, ''), data });
}
vencidos.sort((a, b) => a.data - b.data);

let sitemap = '';
try {
  const r = await fetch(SITEMAP, { headers: { 'user-agent': 'instagram-agendado' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  sitemap = await r.text();
} catch (erro) {
  console.log(`Não foi possível consultar o sitemap (${erro.message}); nada será publicado agora.`);
}

let escolhido = '';
for (const { slug } of vencidos) {
  const pasta = join('conteudo-social', slug);
  if (await existe(join(pasta, 'instagram.json'))) continue;
  if (!(await existe(join(pasta, 'carrossel.json')))) {
    console.log(`::warning::"${slug}" já está no blog, mas não tem carrossel (conteudo-social/${slug}/carrossel.json).`);
    continue;
  }
  if (!(await existe(join('public', 'social', slug, 'slide-01.png')))) {
    console.log(`::warning::"${slug}" tem carrossel.json, mas os slides não foram gerados (npm run carrossel -- ${slug}).`);
    continue;
  }
  if (!sitemap.includes(`/blog/${slug}/`)) {
    console.log(`"${slug}" ainda não aparece no site; fica para a próxima execução.`);
    continue;
  }
  if (!escolhido) escolhido = slug;
}

console.log(escolhido ? `Publicar no Instagram: ${escolhido}` : 'Nada a publicar no Instagram agora.');
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `slug=${escolhido}\n`);

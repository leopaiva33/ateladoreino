// Busca fotos para os carrosséis: para cada slide de conteudo-social/<slug>/carrossel.json que tenha
// "busca" (termos em inglês), grava até 8 candidatas em conteudo-social/<slug>/fotos-carrossel.json.
// Depois, escolha uma e ponha no slide: "foto": "<src da candidata>" (veja a skill carrossel-instagram).
// Só busca o que ainda não tem candidatas ou cujo termo mudou.
//
// Usa o Pixabay (PIXABAY_API_KEY) ou o Pexels (PEXELS_API_KEY). Do Pixabay, guarda o endereço da
// foto no cdn.pixabay.com, que é permanente (o "largeImageURL" da API expira em 24 h).
// Uso: PIXABAY_API_KEY=... node scripts/buscar-fotos-carrossel.mjs [slug ...]   (sem slug: todos)
// Roda no GitHub Actions (buscar-fotos-carrossel.yml), com o segredo PIXABAY_API_KEY.
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const PIXABAY = process.env.PIXABAY_API_KEY;
const PEXELS = process.env.PEXELS_API_KEY;
if (!PIXABAY && !PEXELS) {
  console.error('Defina PIXABAY_API_KEY (chave grátis em https://pixabay.com/api/docs/) ou PEXELS_API_KEY.');
  process.exit(1);
}
const existe = (p) => access(p).then(() => true, () => false);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

let slugs = process.argv.slice(2);
if (!slugs.length) {
  slugs = [];
  for (const p of await readdir('conteudo-social', { withFileTypes: true }))
    if (p.isDirectory() && (await existe(join('conteudo-social', p.name, 'carrossel.json')))) slugs.push(p.name);
}

async function pixabay(q, orientacao) {
  const url = `https://pixabay.com/api/?key=${PIXABAY}&q=${encodeURIComponent(q)}&image_type=photo&orientation=${orientacao}&safesearch=true&min_width=1080&per_page=8&lang=en`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Pixabay respondeu ${r.status} para "${q}": ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.hits.map((p) => ({
    id: `pixabay-${p.id}`,
    banco: 'Pixabay',
    pagina: p.pageURL,
    fotografo: p.user,
    tags: p.tags,
    src: p.previewURL.replace(/_150\.(\w+)$/, '_1280.$1'),
    miniatura: p.previewURL.replace(/_150\.(\w+)$/, '_640.$1'),
  }));
}

async function pexels(q) {
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=portrait&per_page=8`, {
    headers: { Authorization: PEXELS },
  });
  if (!r.ok) throw new Error(`Pexels respondeu ${r.status} para "${q}": ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.photos.map((p) => ({
    id: `pexels-${p.id}`,
    banco: 'Pexels',
    pagina: p.url,
    fotografo: p.photographer,
    tags: p.alt,
    src: `pexels:${p.id}`,
    miniatura: p.src.medium,
  }));
}

/** Prefere fotos em pé (o carrossel é 4:5); completa com as outras se vierem poucas. */
async function buscar(q) {
  if (!PIXABAY) return pexels(q);
  const verticais = await pixabay(q, 'vertical');
  if (verticais.length >= 5) return verticais;
  await pausa(700);
  const todas = await pixabay(q, 'all');
  const ids = new Set(verticais.map((f) => f.id));
  return [...verticais, ...todas.filter((f) => !ids.has(f.id))].slice(0, 8);
}

for (const slug of slugs) {
  const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'));
  const arq = join('conteudo-social', slug, 'fotos-carrossel.json');
  const atual = (await existe(arq)) ? JSON.parse(await readFile(arq, 'utf8')) : {};
  let novas = 0;
  for (let i = 0; i < spec.slides.length; i++) {
    const { busca } = spec.slides[i];
    const chave = String(i + 1);
    if (!busca || atual[chave]?.busca === busca) continue;
    const candidatas = await buscar(busca);
    if (!candidatas.length) console.log(`::warning::${slug} slide ${chave}: nenhuma foto para "${busca}"`);
    atual[chave] = { busca, candidatas };
    novas++;
    await pausa(700);
  }
  if (!novas) continue;
  const ordenado = Object.fromEntries(Object.entries(atual).sort(([a], [b]) => Number(a) - Number(b)));
  await writeFile(arq, JSON.stringify(ordenado, null, 2) + '\n');
  console.log(`${slug}: ${novas} slide(s) com candidatas novas.`);
}

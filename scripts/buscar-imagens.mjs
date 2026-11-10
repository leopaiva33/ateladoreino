// Busca fotos grátis (uso comercial liberado, sem crédito obrigatório) para as cenas dos vídeos:
// Pixabay (PIXABAY_API_KEY) ou Pexels (PEXELS_API_KEY), o que estiver configurado.
// Para cada cena de conteudo-social/<slug>/video.json que tenha "busca", grava em
// conteudo-social/<slug>/imagens.json até 6 candidatas e a escolhida (sem repetir foto no vídeo).
// Só busca o que ainda não tem escolha ou cuja busca mudou; não mexe nas escolhas feitas à mão.
//
// Uso: PIXABAY_API_KEY=... node scripts/buscar-imagens.mjs [slug ...]   (sem slug: todos os vídeos)
// Roda no GitHub Actions (buscar-imagens.yml), com o segredo PIXABAY_API_KEY (ou PEXELS_API_KEY).
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const PIXABAY = process.env.PIXABAY_API_KEY;
const PEXELS = process.env.PEXELS_API_KEY;
if (!PIXABAY && !PEXELS) {
  console.error('Defina PIXABAY_API_KEY (chave grátis em https://pixabay.com/api/docs/) ou PEXELS_API_KEY.');
  process.exit(1);
}
const existe = (p) => access(p).then(() => true, () => false);

let slugs = process.argv.slice(2);
if (!slugs.length) {
  const pastas = await readdir('conteudo-social', { withFileTypes: true });
  slugs = [];
  for (const p of pastas) if (p.isDirectory() && (await existe(join('conteudo-social', p.name, 'video.json')))) slugs.push(p.name);
}

async function buscar(q) {
  if (PIXABAY) {
    const url = `https://pixabay.com/api/?key=${PIXABAY}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&min_width=1920&per_page=6&lang=en`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Pixabay respondeu ${r.status} para "${q}": ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return j.hits.map((p) => ({
      id: `pixabay-${p.id}`,
      banco: 'Pixabay',
      pagina: p.pageURL,
      fotografo: p.user,
      fotografo_url: `https://pixabay.com/users/${p.user}-${p.user_id}/`,
      alt: p.tags,
      src: p.largeImageURL,
      miniatura: p.webformatURL,
    }));
  }
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=landscape&size=large&per_page=6`;
  const r = await fetch(url, { headers: { Authorization: PEXELS } });
  if (!r.ok) throw new Error(`Pexels respondeu ${r.status} para "${q}": ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.photos.map((p) => ({
    id: `pexels-${p.id}`,
    banco: 'Pexels',
    pagina: p.url,
    fotografo: p.photographer,
    fotografo_url: p.photographer_url,
    alt: p.alt,
    src: `${p.src.original}?auto=compress&cs=tinysrgb&w=2400`,
    miniatura: p.src.medium,
  }));
}

for (const slug of slugs) {
  const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'video.json'), 'utf8'));
  const arq = join('conteudo-social', slug, 'imagens.json');
  const atual = (await existe(arq)) ? JSON.parse(await readFile(arq, 'utf8')) : {};
  const usadas = new Set(Object.values(atual).map((e) => e.escolhida?.id).filter(Boolean));
  let novas = 0;
  for (let s = 0; s < spec.secoes.length; s++) {
    for (let c = 0; c < spec.secoes[s].cenas.length; c++) {
      const cena = spec.secoes[s].cenas[c];
      const chave = `${s + 1}.${c + 1}`;
      if (!cena.busca) continue;
      if (atual[chave]?.busca === cena.busca && atual[chave]?.escolhida) continue;
      const candidatas = await buscar(cena.busca);
      if (!candidatas.length) {
        console.log(`::warning::${slug} ${chave}: nenhuma foto para "${cena.busca}"`);
        continue;
      }
      const escolhida = candidatas.find((f) => !usadas.has(f.id)) ?? candidatas[0];
      usadas.add(escolhida.id);
      atual[chave] = { busca: cena.busca, escolhida, candidatas };
      novas++;
    }
  }
  const ordenado = Object.fromEntries(Object.entries(atual).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })));
  await writeFile(arq, JSON.stringify(ordenado, null, 2) + '\n');
  console.log(`${slug}: ${novas} cena(s) com foto nova; ${Object.keys(ordenado).length} no total.`);
}

// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeHebraico from './src/utils/rehype-hebraico.mjs';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * Data da última mudança de cada artigo e estudo (updatedDate, ou pubDate), lida do frontmatter,
 * para o <lastmod> do sitemap: assim o Google sabe quando voltar a uma página atualizada.
 */
function datasDoConteudo() {
  const datas = new Map();
  for (const [pasta, rota] of [
    ['src/content/blog', '/blog/'],
    ['src/content/estudos', '/estudos/'],
  ]) {
    for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith('.md'))) {
      const frente = readFileSync(`${pasta}/${arquivo}`, 'utf8').split(/^---\s*$/m)[1] ?? '';
      const campo = (nome) => frente.match(new RegExp(`^${nome}:\\s*["']?([^"'\\n]+)`, 'm'))?.[1];
      const data = new Date(campo('updatedDate') ?? campo('pubDate') ?? '');
      if (!Number.isNaN(data.valueOf())) datas.set(`${rota}${arquivo.replace(/\.md$/, '')}/`, data);
    }
  }
  return datas;
}
const DATAS = datasDoConteudo();
/** Páginas que não devem ir para o Google (também têm noindex). */
const FORA_DO_SITEMAP = ['/newsletter/confirmada/'];

// https://astro.build/config
export default defineConfig({
  site: 'https://ateladoreino.com',
  markdown: {
    rehypePlugins: [rehypeHebraico],
  },
  integrations: [
    sitemap({
      // Páginas HTML avulsas em public/ não entram no sitemap automático.
      customPages: ['https://ateladoreino.com/plano-de-leitura-tora/'],
      filter: (pagina) => !FORA_DO_SITEMAP.some((c) => pagina.endsWith(c)),
      serialize(item) {
        const data = DATAS.get(new URL(item.url).pathname);
        return data ? { ...item, lastmod: data.toISOString() } : item;
      },
    }),
  ],
});

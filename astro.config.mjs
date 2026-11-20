// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeHebraico from './src/utils/rehype-hebraico.mjs';

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
    }),
  ],
});

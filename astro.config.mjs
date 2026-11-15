// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://ateladoreino.com',
  integrations: [
    sitemap({
      // Páginas HTML avulsas em public/ não entram no sitemap automático.
      customPages: ['https://ateladoreino.com/plano-de-leitura-tora/'],
    }),
  ],
});

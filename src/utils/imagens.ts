import { existsSync } from 'node:fs';

/**
 * Versão WebP de uma imagem de /public (ex.: "/images/posts/slug.png" -> "/images/posts/slug.webp"),
 * gerada por `npm run images`. Devolve undefined se o arquivo não existir, para o <picture> cair
 * só no PNG.
 */
export function versaoWebp(imagem?: string): string | undefined {
  if (!imagem || !/\.png$/.test(imagem)) return undefined;
  const webp = imagem.replace(/\.png$/, '.webp');
  return existsSync(`public${webp}`) ? webp : undefined;
}

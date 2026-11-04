import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Posts publicados: sem rascunho e com data de publicação já vencida (agendamento).
 * Um post com `pubDate` no futuro só entra no site no primeiro build feito depois da data.
 * Em `npm run dev` os posts agendados aparecem, para facilitar a revisão. Para conferir um build
 * completo antes da data: `SHOW_SCHEDULED=1 npm run build` (não use esse build em produção).
 * Os builds nas datas agendadas são disparados por .github/workflows/publicacao-agendada.yml.
 */
export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const agora = Date.now();
  const posts = await getCollection(
    'blog',
    ({ data }) =>
      !data.draft &&
      (import.meta.env.DEV || process.env.SHOW_SCHEDULED === '1' || data.pubDate.valueOf() <= agora),
  );
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Ex.: "31 de outubro de 2026" (sempre em UTC, para não mudar o dia). */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

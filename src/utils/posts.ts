import { getCollection, type CollectionEntry } from 'astro:content';

/** Posts publicados (sem rascunhos), do mais novo para o mais antigo. */
export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
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

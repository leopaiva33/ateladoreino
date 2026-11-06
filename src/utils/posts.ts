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

/**
 * Artigos relacionados ao post atual, só entre os publicados (mesma regra de data do agendamento).
 * Pontuação: mesma categoria vale 3; cada tag em comum vale 2. Empates: o mais recente primeiro.
 */
export async function getRelatedPosts(
  current: CollectionEntry<'blog'>,
  limit = 3,
): Promise<CollectionEntry<'blog'>[]> {
  const norm = (s: string) => s.trim().toLowerCase();
  const tagsAtuais = new Set(current.data.tags.map(norm));
  const outros = (await getPublishedPosts()).filter((p) => p.id !== current.id);
  const pontos = (p: CollectionEntry<'blog'>) =>
    (p.data.category === current.data.category ? 3 : 0) +
    2 * p.data.tags.filter((t) => tagsAtuais.has(norm(t))).length;
  return outros
    .map((p) => ({ p, pontos: pontos(p) }))
    .sort((a, b) => b.pontos - a.pontos || b.p.data.pubDate.valueOf() - a.p.data.pubDate.valueOf())
    .slice(0, limit)
    .map(({ p }) => p);
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

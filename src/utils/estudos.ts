import { getCollection, type CollectionEntry } from 'astro:content';

export const LIVROS_DA_TORA = ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio'] as const;

/**
 * Estudos publicados das porções da Torá, na ordem do ciclo anual (campo `numero`).
 * Mesma regra de data do blog: `draft: true` ou `pubDate` no futuro ficam fora do build
 * (aparecem em `npm run dev` e com `SHOW_SCHEDULED=1`).
 */
export async function getPublishedEstudos(): Promise<CollectionEntry<'estudos'>[]> {
  const agora = Date.now();
  const estudos = await getCollection(
    'estudos',
    ({ data }) =>
      !data.draft &&
      (import.meta.env.DEV || process.env.SHOW_SCHEDULED === '1' || data.pubDate.valueOf() <= agora),
  );
  return estudos.sort(
    (a, b) => a.data.numero - b.data.numero || b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

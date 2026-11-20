import { getCollection, type CollectionEntry } from 'astro:content';

export const LIVROS_DA_TORA = ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio'] as const;

/**
 * Estudos publicados: primeiro os das porções da Torá, na ordem do ciclo anual (campo `numero`),
 * depois os temáticos (sem `numero`), do mais recente para o mais antigo.
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
    (a, b) =>
      (a.data.numero ?? 99) - (b.data.numero ?? 99) ||
      b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/** Estudo de porção da Torá tem `numero`; sem ele, é estudo temático. */
export const ehEstudoDePorcao = (e: CollectionEntry<'estudos'>) => e.data.numero !== undefined;

/** Estudo de porção publicado mais recentemente: o "estudo da semana" sugerido nos artigos. */
export async function getEstudoMaisRecente(): Promise<CollectionEntry<'estudos'> | undefined> {
  const porcoes = (await getPublishedEstudos()).filter(ehEstudoDePorcao);
  return porcoes.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())[0];
}

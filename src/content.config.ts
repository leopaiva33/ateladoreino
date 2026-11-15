import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** Caminho em /public (ex.: "/images/posts/slug.png"). Usada no post e no Open Graph. */
    image: z.string().optional(),
    /** Texto alternativo descritivo. Obrigatório quando houver imagem. */
    imageAlt: z.string().optional(),
    /** Id do vídeo do YouTube (11 caracteres) que acompanha o artigo. Aparece no post, carregado só no clique. */
    video: z
      .string()
      .regex(/^[\w-]{11}$/)
      .optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/**
 * Estudos bíblicos, em /estudos. Dois tipos: estudo de uma porção semanal da Torá (com `parasha`,
 * `numero` e `livro`) e estudo temático (sem esses campos; aparece em "Temas bíblicos").
 */
const estudos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/estudos' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** Nome da porção (ex.: "Toldot"). Só em estudo de porção. */
    parasha: z.string().optional(),
    /** Tradução do nome (ex.: "Gerações"). */
    significado: z.string().optional(),
    /** Posição no ciclo anual, de 1 (Bereshit) a 54. Define a ordem na lista. */
    numero: z.number().int().min(1).max(54).optional(),
    livro: z.enum(['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio']).optional(),
    /** Assunto de um estudo temático, em poucas palavras (ex.: "Anjos e o mal"). */
    tema: z.string().optional(),
    /** Leituras estudadas: Torá, Haftará e escritos apostólicos; em estudo temático, os textos-base. */
    leituras: z
      .array(z.object({ rotulo: z.string(), texto: z.string(), tema: z.string().optional() }))
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, estudos };

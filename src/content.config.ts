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

export const collections = { blog };

import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    // A piece published elsewhere: the entry links there and gets no article page.
    link: z.string().url().optional(),
  }),
});

export const collections = { blog };

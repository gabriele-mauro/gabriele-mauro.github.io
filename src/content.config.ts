import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Strict objects: a missing or misspelt field fails the build.

const text = z.string().trim().min(1);
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');
const webUrl = z.url({ protocol: /^https?$/ });
const order = z.number().int();

const profile = defineCollection({
  loader: glob({ pattern: 'profile.md', base: './src/content' }),
  schema: z.strictObject({
    name: text,
    role: text,
    affiliation: text,
    description: text,
    interests: z.array(text).min(1),
    emails: z.array(z.strictObject({ label: text, address: z.email() })).min(1),
    links: z.array(z.strictObject({ label: text, url: webUrl })),
    cv: z.strictObject({
      file: z.string().regex(/^\/\S+\.pdf$/, 'expected a site path like /cv/Name.pdf'),
      updated: yearMonth,
    }),
  }),
});

const now = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/now' }),
  schema: z.strictObject({
    title: text,
    with: text,
    institution: text,
    start: yearMonth,
    end: yearMonth.optional(),
    order,
  }),
});

const papers = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/papers' }),
  schema: z
    .strictObject({
      title: text,
      authors: z.array(text).min(1),
      alphabetical: z.boolean(),
      year: z.number().int().min(2000).max(2100),
      status: z.enum(['under-review', 'preprint', 'to-appear', 'published']),
      venue: z.string().trim(),
      links: z
        .strictObject({
          arxiv: webUrl.optional(),
          pdf: z.union([webUrl, z.string().regex(/^\/\S+$/)]).optional(),
          code: webUrl.optional(),
          slides: z.union([webUrl, z.string().regex(/^\/\S+$/)]).optional(),
        })
        .default({}),
    })
    .refine((p) => !['to-appear', 'published'].includes(p.status) || p.venue.length > 0, {
      message: 'venue is required when status is to-appear or published',
      path: ['venue'],
    }),
});

const teaching = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/teaching' }),
  schema: z.strictObject({
    role: text,
    course: text,
    institution: text,
    start: yearMonth,
    end: yearMonth.optional(),
    order,
  }),
});

const earlier = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/earlier' }),
  schema: z.strictObject({
    title: text,
    years: text.optional(),
    order,
    items: z.array(z.strictObject({ name: text, text, url: webUrl })).optional(),
  }),
});

export const collections = { profile, now, papers, teaching, earlier };

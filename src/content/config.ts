import { defineCollection, z } from 'astro:content'

const garden = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    growthStage: z.enum(['seedling', 'budding', 'evergreen']).default('seedling'),
    topics: z.array(z.string()).default([]),
    planted: z.string(), // ISO date
    updated: z.string().optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { garden }

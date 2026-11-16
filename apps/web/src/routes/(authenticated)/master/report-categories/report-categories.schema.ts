import { reportCategoriesCreateSchema, reportCategoriesSelectSchema, reportCategoriesUpdateSchema } from '@southneuhof/api/src/routes/(authenticated)/report-categories/schema.ts'
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
export const recordSchema = reportCategoriesSelectSchema
export const createSchema = reportCategoriesCreateSchema
export const updateSchema = reportCategoriesUpdateSchema
export const querySchema = z.object({ ...collectionQueryFields, sort_by: z.enum(['name', 'createdAt']).optional() })

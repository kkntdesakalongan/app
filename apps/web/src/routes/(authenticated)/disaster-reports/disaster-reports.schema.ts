import { disasterReportsCreateSchema, disasterReportsSelectSchema, disasterReportsUpdateSchema } from '@southneuhof/api/src/routes/(authenticated)/disaster-reports/schema.ts'
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
export const recordSchema = disasterReportsSelectSchema
export const createSchema = disasterReportsCreateSchema
export const updateSchema = disasterReportsUpdateSchema
export const querySchema = z.object({ ...collectionQueryFields, sort_by: z.enum(['title', 'createdAt']).optional() })

import { mapPinsCreateSchema, mapPinsSelectSchema, mapPinsUpdateSchema } from '@southneuhof/api/src/routes/(authenticated)/map-pins/schema.ts'
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
export const recordSchema = mapPinsSelectSchema
export const createSchema = mapPinsCreateSchema
export const updateSchema = mapPinsUpdateSchema
export const querySchema = z.object({ ...collectionQueryFields, sort_by: z.enum(['name', 'createdAt']).optional() })

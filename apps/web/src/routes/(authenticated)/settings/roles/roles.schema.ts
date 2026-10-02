import { roleCreateSchema, roleSelectSchema, roleUpdateSchema } from '@southneuhof/api/src/routes/(authenticated)/roles/schema.ts'
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
import { rpc } from '@/framework/rpc'
import { checkedHonoCreateSchema, checkedHonoRecordSchema, checkedHonoUpdateSchema } from '@/framework/schema'

export const rolesRecordSchema = checkedHonoRecordSchema(rpc.roles, roleSelectSchema)
export const rolesCreateSchema = checkedHonoCreateSchema(rpc.roles, roleCreateSchema)
export const rolesUpdateSchema = checkedHonoUpdateSchema(rpc.roles, roleUpdateSchema)

export const rolesQuerySchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['roleCode', 'name']).optional(),
})

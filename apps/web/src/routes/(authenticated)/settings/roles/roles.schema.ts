import { role } from '@southneuhof/api/routes/(authenticated)/roles/roles.entity'
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
import { rpc } from '@/framework/rpc'
import { checkedHonoCreateSchema, checkedHonoRecordSchema, checkedHonoUpdateSchema } from '@/framework/schema'

export const rolesRecordSchema = checkedHonoRecordSchema(rpc.roles, role.schemas.select)
export const rolesCreateSchema = checkedHonoCreateSchema(rpc.roles, role.schemas.create)
export const rolesUpdateSchema = checkedHonoUpdateSchema(rpc.roles, role.schemas.update)

export const rolesQuerySchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['roleCode', 'name']).optional(),
})

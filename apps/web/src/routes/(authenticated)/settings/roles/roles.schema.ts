import { role } from '@southneuhof/api/routes/(authenticated)/roles/roles.entity'
import { z } from 'zod/v4'
import { rpc } from '@/framework/rpc'
import { checkedHonoCreateSchema, checkedHonoQuerySchema, checkedHonoRecordSchema, checkedHonoUpdateSchema } from '@/framework/schema'

export const rolesRecordSchema = checkedHonoRecordSchema(rpc.roles, role.schemas.select)
export const rolesCreateSchema = checkedHonoCreateSchema(rpc.roles, role.schemas.create)
export const rolesUpdateSchema = checkedHonoUpdateSchema(rpc.roles, role.schemas.update)

export const rolesQuerySchema = checkedHonoQuerySchema(
  rpc.roles,
  z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  })
)

export const rolesTableQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['roleCode', 'name']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
})

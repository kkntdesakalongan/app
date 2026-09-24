import { permission } from '@southneuhof/api/routes/(authenticated)/permissions/permissions.entity'
import { z } from 'zod/v4'
import { rpc } from '@/framework/rpc'
import { checkedHonoQuerySchema, checkedHonoRecordSchema } from '@/framework/schema'

export const permissionsRecordSchema = checkedHonoRecordSchema(rpc.permissions, permission.schemas.select)
export const permissionsQuerySchema = checkedHonoQuerySchema(
  rpc.permissions,
  z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  })
)

export const permissionsTableQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['permissionCode', 'name']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
})

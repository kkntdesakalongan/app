import { z } from 'zod/v4'
import { rpc } from '@/framework/rpc'
import { checkedHonoRecordSchema } from '@/framework/schema'

const endpoint = { list: { $get: rpc.roles[':roleId'].permissions.$get } }

export const rolePermissionRecordSchema = checkedHonoRecordSchema(
  endpoint,
  z.object({
    id: z.string(),
    permissionCode: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    assigned: z.boolean(),
  })
)

export const rolePermissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['permissionCode', 'name', 'description', 'assigned']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
})

export type RolePermission = z.output<typeof rolePermissionRecordSchema>

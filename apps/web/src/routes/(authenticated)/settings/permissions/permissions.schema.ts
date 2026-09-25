import { permission } from '@southneuhof/api/routes/(authenticated)/permissions/permissions.entity'
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
import { rpc } from '@/framework/rpc'
import { checkedHonoRecordSchema } from '@/framework/schema'

export const permissionsRecordSchema = checkedHonoRecordSchema(rpc.permissions, permission.schemas.select)
export const permissionsQuerySchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['permissionCode', 'name']).optional(),
})

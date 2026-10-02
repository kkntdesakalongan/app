import { permissionSelectSchema } from '@southneuhof/api/src/routes/(authenticated)/permissions/schema.ts'
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
import { rpc } from '@/framework/rpc'
import { checkedHonoRecordSchema } from '@/framework/schema'

export const permissionsRecordSchema = checkedHonoRecordSchema(rpc.permissions, permissionSelectSchema)
export const permissionsQuerySchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['permissionCode', 'name']).optional(),
})

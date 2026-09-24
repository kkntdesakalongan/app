import type { CollectionLoadContext } from '@southneuhof/loom'
import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { permissionsQuerySchema, permissionsTableQuerySchema } from './permissions.schema'

const api = createHonoResourceActions(rpc.permissions)

async function list(context: CollectionLoadContext) {
  const { sort_by, sort, ...query } = permissionsTableQuerySchema.parse(context.query)
  return api.list({ ...context, query: permissionsQuerySchema.parse({ ...query, sort: sort_by, order: sort }) })
}

export const permissionsActions = { ...api, list }

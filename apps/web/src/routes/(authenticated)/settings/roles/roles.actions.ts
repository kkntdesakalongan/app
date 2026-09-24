import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import type { CollectionLoadContext } from '@southneuhof/loom'
import { rolesQuerySchema, rolesTableQuerySchema } from './roles.schema'

const api = createHonoResourceActions(rpc.roles)

async function list(context: CollectionLoadContext) {
  const { sort_by, sort, ...query } = rolesTableQuerySchema.parse(context.query)
  return api.list({ ...context, query: rolesQuerySchema.parse({ ...query, sort: sort_by, order: sort }) })
}

export const rolesActions = {
  list,
  detail: api.detail,
  create: api.create,
  update: api.update,
  delete: api.delete,
}

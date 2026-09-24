import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import type { CollectionLoadContext } from '@southneuhof/loom'
import { usersQuerySchema, usersTableQuerySchema } from './users.schema'

const api = createHonoResourceActions(rpc.users)

async function list(context: CollectionLoadContext) {
  const { sort_by, sort, ...query } = usersTableQuerySchema.parse(context.query)
  return api.list({ ...context, query: usersQuerySchema.parse({ ...query, sort: sort_by, order: sort }) })
}

export const usersActions = {
  list,
  detail: api.detail,
  create: api.create,
  update: api.update,
}

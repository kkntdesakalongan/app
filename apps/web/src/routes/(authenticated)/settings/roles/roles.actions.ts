import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { rolesQuerySchema } from './roles.schema'

const api = createHonoResourceActions(rpc.roles, { querySchema: rolesQuerySchema })

export const rolesActions = {
  list: api.list,
  detail: api.detail,
  create: api.create,
  update: api.update,
  delete: api.delete,
}

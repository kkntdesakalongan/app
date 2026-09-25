import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { usersQuerySchema } from './users.schema'

const api = createHonoResourceActions(rpc.users, { querySchema: usersQuerySchema })

export const usersActions = {
  list: api.list,
  detail: api.detail,
  create: api.create,
  update: api.update,
}

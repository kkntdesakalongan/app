import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { permissionsQuerySchema } from './permissions.schema'

const api = createHonoResourceActions(rpc.permissions, { querySchema: permissionsQuerySchema })

export const permissionsActions = api

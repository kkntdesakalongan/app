import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { querySchema } from './disaster-reports.schema'
export const actions = createHonoResourceActions(rpc['disaster-reports'], { querySchema })

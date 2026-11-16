import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { querySchema } from './report-categories.schema'
export const actions = createHonoResourceActions(rpc['report-categories'], { querySchema })

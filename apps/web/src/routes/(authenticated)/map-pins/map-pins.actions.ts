import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { querySchema } from './map-pins.schema'
export const actions = createHonoResourceActions(rpc['map-pins'], { querySchema })

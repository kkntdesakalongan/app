import { z } from 'zod/v4'
import { createHonoResourceActions } from '@/framework/hono'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
import { rpc } from '@/framework/rpc'
export const actions = createHonoResourceActions(rpc['gis-data'], { querySchema: z.object(collectionQueryFields) })

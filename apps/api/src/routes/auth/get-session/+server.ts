import { defineRoute } from '@southneuhof/sprindle'
import { getAuth } from '../auth'

export const GET = defineRoute({ action: async ({ c }) => getAuth().handler(c.req.raw) })

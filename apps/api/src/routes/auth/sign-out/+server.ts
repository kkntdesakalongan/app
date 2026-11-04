import { defineRoute } from '@southneuhof/sprindle'
import { z } from 'zod/v4'
import { getAuth } from '../auth'

export const POST = defineRoute({ openapi: { requestBody: z.object({}) }, action: async ({ c }) => getAuth().handler(c.req.raw) })

import { defineRoute } from '@southneuhof/sprindle'
import type { TypedResponse } from 'hono'
import { z } from 'zod/v4'
import { getAuth } from '../../auth'

type SignInOutput = {
  redirect: boolean
  token: string
  user: { id: string; name: string; email: string; emailVerified: boolean; image?: string | null; createdAt: Date; updatedAt: Date }
}

const signInInput = z.object({ email: z.string(), password: z.string() })

export const POST = defineRoute({
  openapi: { requestBody: signInInput },
  action: async ({ c }): Promise<TypedResponse<SignInOutput, 200, 'json'>> => getAuth().handler(c.req.raw) as never,
})

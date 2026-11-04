import { defineRoute } from '@southneuhof/sprindle'
import { generateInstalledOpenApi } from '@southneuhof/sprindle/openapi'

export const GET = defineRoute({ action: ({ c }): Response => c.json({ ...generateInstalledOpenApi(c, { title: 'Carta API', version: '0.0.0' }), servers: [{ url: '/api' }] }) })

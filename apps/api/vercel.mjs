import { assertRouteEntitiesBound, bindRouteEntities } from '@southneuhof/sprindle/hono'
import manifest from './.sprindle-vercel/routes.mjs'
import { createApp } from './src/create-app.ts'
import { getDomainSchema } from './src/db.ts'

bindRouteEntities(manifest, getDomainSchema().entities)
assertRouteEntitiesBound(manifest)

export default createApp(manifest)

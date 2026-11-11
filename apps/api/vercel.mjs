import { createAdaptorServer } from '@hono/node-server'
import { installEwsSocket } from './src/ews/socket.ts'
import { assertRouteEntitiesBound, bindRouteEntities } from '@southneuhof/sprindle/hono'
import manifest from './.sprindle-vercel/routes.mjs'
import { createApp } from './src/create-app.ts'
import { getDomainSchema } from './src/db.ts'

bindRouteEntities(manifest, getDomainSchema().entities)
assertRouteEntitiesBound(manifest)

const app = createApp(manifest)
const server = createAdaptorServer({ fetch: app.fetch })
installEwsSocket(server)

export default server

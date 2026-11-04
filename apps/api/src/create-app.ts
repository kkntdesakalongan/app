import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { consoleLogger, installSprindle, requestContext, sprindleNotFound, type FileRouteManifest } from '@southneuhof/sprindle/hono'
import { getDb } from './db'
import { onError } from './unique-violation'
import { auditStamp } from './audit'
import { assetRequestContext, storedAssetResponse } from './storage/assets'

export function createApp(routeManifest: FileRouteManifest) {
  return installSprindle(
    new Hono().basePath('/api')
      .onError(onError)
      .notFound(sprindleNotFound)
      .use('*', requestContext())
      .use('*', assetRequestContext())
      .use('*', cors({
        origin: (origin) => origin,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        exposeHeaders: ['Set-Cookie', 'Content-Disposition'],
        credentials: true,
      }))
      .use('*', async (_c, next) => { getDb(); await next() })
      .use('*', async (c, next) => {
        await next()
        c.res = (await storedAssetResponse({ response: c.res } as Parameters<typeof storedAssetResponse>[0])) ?? c.res
      }),
    routeManifest,
    { logger: consoleLogger, dataWrite: auditStamp() },
  )
}

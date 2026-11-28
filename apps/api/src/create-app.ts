import { bodyLimit } from 'hono/body-limit'
import { compress } from 'hono/compress'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { consoleLogger, installSprindle, requestContext, sprindleNotFound, type FileRouteManifest } from '@southneuhof/sprindle/hono'
import { getDb } from './db'
import { onError } from './unique-violation'
import { auditStamp } from './audit'
import { assetRequestContext, storedAssetResponse } from './storage/assets'
import { gisMaxUploadBytes } from './routes/(authenticated)/gis-data/schema'

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
      .use('/gis-data/update/*', bodyLimit({ maxSize: gisMaxUploadBytes, onError: (c) => c.json({ message: 'GIS data exceeds 25 MiB.' }, 413) }))
      .use('/public/gis-data/:code', compress({ contentTypeFilter: (type) => type === 'application/geo+json' }))
      .use('*', async (_c, next) => { getDb(); await next() })
      .use('*', async (c, next) => {
        await next()
        c.res = (await storedAssetResponse({ response: c.res } as Parameters<typeof storedAssetResponse>[0])) ?? c.res
      }),
    routeManifest,
    { logger: consoleLogger, dataWrite: auditStamp() },
  )
}

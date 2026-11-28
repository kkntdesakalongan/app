import { z } from 'zod/v4'
import { createHonoResourceActions } from '@/framework/hono'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
import { rpc } from '@/framework/rpc'
import { gisFeatureCollectionSchema } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'
import type { RecordIdentity } from '@southneuhof/loom'
export const actions = createHonoResourceActions(rpc['gis-data'], { querySchema: z.object(collectionQueryFields) })

export async function uploadGisSource(id: RecordIdentity, source: File) {
  const filename = source.name
  if (source.size < 4_000_000) {
    const data = gisFeatureCollectionSchema.parse(JSON.parse(await source.text()))
    return actions.update(id, { filename, data })
  }
  const compressed = source.stream().pipeThrough(new CompressionStream('gzip'))
  const blob = await new Response(compressed).blob()
  const gzipBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const dataUrl = String(reader.result)
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
  return actions.update(id, { filename, gzipBase64 })
}

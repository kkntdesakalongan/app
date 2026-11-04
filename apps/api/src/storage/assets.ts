import { AsyncLocalStorage } from 'node:async_hooks'
import type { Context, MiddlewareHandler } from 'hono'
import type { RouteAfter } from '@southneuhof/sprindle/model'
import { z } from 'zod/v4'
import { uploadKey, storedAssetSchema, type StoredAsset } from '../schema'

export type StoredAssetMetadata = {
  size?: number
  updatedAt?: string | Date
  metadata?: Record<string, unknown>
}

const requestUrlStorage = new AsyncLocalStorage<string>()

export function assetRequestContext(): MiddlewareHandler {
  return async (c: Context, next: () => Promise<void>) => {
    await requestUrlStorage.run(c.req.url, next)
  }
}

export function runWithAssetRequestUrl<T>(url: string, callback: () => T | Promise<T>) {
  return requestUrlStorage.run(url, callback)
}

function currentRequestUrl() {
  const url = requestUrlStorage.getStore()
  if (!url) throw new Error('Stored asset projection requires an active request URL.')
  return url
}

export function storedAsset(key: string, metadata: StoredAssetMetadata = {}): StoredAsset {
  const id = uploadKey.parse(key)
  const name = id.split('/').pop() || id
  const extension = name.split('.').pop()?.toLowerCase()
  const mimeType = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    txt: 'text/plain',
  }[extension ?? '']
  const url = new URL('/api/files/object', currentRequestUrl())
  url.searchParams.set('key', id)
  return storedAssetSchema.parse({
    kind: 'file',
    id,
    url: url.toString(),
    name,
    ...(mimeType ? { mimeType } : {}),
    ...(metadata.size === undefined ? {} : { size: metadata.size }),
    ...(metadata.updatedAt === undefined ? {} : { updatedAt: metadata.updatedAt instanceof Date ? metadata.updatedAt.toISOString() : metadata.updatedAt }),
    ...(metadata.metadata === undefined ? {} : { metadata: metadata.metadata }),
  })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function projectStoredAssets(value: unknown): unknown {
  if (storedAssetSchema.safeParse(value).success) return value
  if (typeof value === 'string' && uploadKey.safeParse(value).success) return storedAsset(value)
  if (Array.isArray(value)) {
    const projected = value.map(projectStoredAssets)
    return projected.every((item, index) => item === value[index]) ? value : projected
  }
  if (isPlainObject(value)) {
    let changed = false
    const projected = Object.fromEntries(Object.entries(value).map(([key, item]) => {
      const next = projectStoredAssets(item)
      changed ||= next !== item
      return [key, next]
    }))
    return changed ? projected : value
  }
  return value
}

export function publicRecord<TSchema extends z.ZodType>(schema: TSchema, value: unknown): z.output<TSchema> {
  return schema.parse(projectStoredAssets(value))
}

export function publicRecords<TSchema extends z.ZodType>(schema: TSchema, values: unknown[]): z.output<TSchema>[] {
  return values.map((value) => publicRecord(schema, value))
}

export function storedAssetModel<TSchema extends z.ZodType>(schema: TSchema) {
  return {
    schema,
    run: (record: unknown) => publicRecord(schema, record),
  }
}

export const storedAssetResponse: RouteAfter = async ({ response }) => {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return
  let body: unknown
  try {
    body = await response.clone().json()
  } catch {
    return
  }
  const projected = projectStoredAssets(body)
  if (projected === body) return
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(JSON.stringify(projected), { status: response.status, statusText: response.statusText, headers })
}

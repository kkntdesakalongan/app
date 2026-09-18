import type { ClientRequestOptions } from 'hono/client'
import { dataAdapter } from '@/framework/adapters/data/normalize'
import type { CollectionResult, RecordIdentity } from '@southneuhof/loom'
import type { HonoResourceActions } from './contracts'

type RuntimeEndpoint = (input?: unknown, options?: ClientRequestOptions) => Promise<Response>
type RuntimeRoute = {
  list: { $get: RuntimeEndpoint }
  detail: { ':id': { $get: RuntimeEndpoint } }
  create: { $post: RuntimeEndpoint }
  update: { ':id': { $patch: RuntimeEndpoint } }
  delete: { ':id': { $delete: RuntimeEndpoint } }
}

function wireQuery(values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => [key, Array.isArray(value) || (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) ? JSON.stringify(value) : String(value)])
  )
}

function wireIdentity(id: RecordIdentity): string {
  return typeof id === 'object' ? Object.values(id).map(String).join('/') : String(id)
}

async function payload(response: Response): Promise<unknown> {
  const value = await response.json()
  if (!response.ok) throw value
  return value
}

export function createHonoResourceActions<const TRoute>(route: TRoute): HonoResourceActions<TRoute> {
  const source = route as TRoute & RuntimeRoute
  const shape = source as Partial<RuntimeRoute> | undefined
  const has = (node: unknown, method: string) =>
    !!node && typeof (node as Record<string, unknown>)[method] === 'function'
  if (
    !shape || !has(shape.list, '$get') || !has(shape.detail?.[':id'], '$get') ||
    !has(shape.create, '$post') || !has(shape.update?.[':id'], '$patch') ||
    !has(shape.delete?.[':id'], '$delete')
  ) throw new Error('Unknown resource route. Use the kebab-case route key: rpc[\'<route-dir>\'].')
  const actions = {
    list: async ({ query, searchParameters, signal }: { query: Record<string, unknown>; searchParameters: Record<string, unknown>; signal?: AbortSignal }) =>
      dataAdapter.normalizeCollection(await payload(await source.list.$get({ query: wireQuery({ ...searchParameters, ...query }) }, { init: { signal } }))) as CollectionResult<
        Record<string, unknown>
      >,
    detail: async ({ id, searchParameters, signal }: { id?: RecordIdentity; searchParameters: Record<string, unknown>; signal?: AbortSignal }) => {
      if (id === undefined) return undefined
      return dataAdapter.normalizeRecord(await payload(await source.detail[':id'].$get({ param: { id: wireIdentity(id) }, query: wireQuery(searchParameters) }, { init: { signal } })))
    },
    create: async (input: object) => dataAdapter.normalizeRecord(await payload(await source.create.$post({ json: input }))),
    update: async (id: RecordIdentity, input: object) => dataAdapter.normalizeRecord(await payload(await source.update[':id'].$patch({ param: { id: wireIdentity(id) }, json: input }))),
    delete: async (id: RecordIdentity) => payload(await source.delete[':id'].$delete({ param: { id: wireIdentity(id) } })),
  }
  return actions as HonoResourceActions<TRoute>
}

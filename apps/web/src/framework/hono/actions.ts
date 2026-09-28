import type { ClientRequestOptions } from 'hono/client'
import { dataAdapter } from '@/framework/adapters/data/normalize'
import type { CollectionLoadContext, CollectionResult, RecordIdentity } from '@southneuhof/loom'
import type { HonoQuerySchemaGuard, HonoResourceActions } from './contracts'
import { encodeCollectionQuery } from './collectionQuery'

type RuntimeEndpoint = (input?: unknown, options?: ClientRequestOptions) => Promise<Response>
type CollectionQuerySchema = {
  readonly _output: object
  parseAsync(input: unknown): Promise<object>
}

type RouteWithoutList<TRoute> = 'list' extends keyof HonoResourceActions<TRoute> ? never : unknown

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

async function requestFor(operation: string, request: () => Promise<Response>): Promise<Response> {
  try {
    return await request()
  } catch (error) {
    throw new Error(`Hono ${operation} operation could not be invoked.`, { cause: error })
  }
}

function routeEndpoint(route: unknown, path: readonly string[]): RuntimeEndpoint {
  let endpoint: unknown = route
  for (const part of path) endpoint = Reflect.get(endpoint as object, part)
  return endpoint as RuntimeEndpoint
}

export function createHonoResourceActions<const TRoute>(route: TRoute & RouteWithoutList<TRoute>, options?: never): HonoResourceActions<TRoute>
export function createHonoResourceActions<const TRoute, const TSchema extends CollectionQuerySchema>(
  route: TRoute,
  options: { querySchema: TSchema & HonoQuerySchemaGuard<TRoute, TSchema> }
): HonoResourceActions<TRoute, TSchema['_output']>
export function createHonoResourceActions(route: unknown, options?: { querySchema?: CollectionQuerySchema }): unknown {
  if (route === null || (typeof route !== 'object' && typeof route !== 'function')) throw new Error("Unknown resource route. Use the kebab-case route key: rpc['<route-dir>'].")

  const actions = {
    list: async ({ query, searchParameters, signal }: CollectionLoadContext<Record<string, unknown>>) => {
      const querySchema = options?.querySchema
      if (!querySchema || typeof querySchema.parseAsync !== 'function') throw new Error('Hono list operation requires a querySchema with parseAsync.')
      const parsedQuery = await querySchema.parseAsync(query)
      const values = encodeCollectionQuery({ ...searchParameters, ...parsedQuery })
      return dataAdapter.normalizeCollection(
        await payload(await requestFor('list', () => routeEndpoint(route, ['list', '$get'])({ query: wireQuery(values) }, { init: { signal } })))
      ) as CollectionResult<Record<string, unknown>>
    },
    detail: async ({ id, searchParameters, signal }: { id?: RecordIdentity; searchParameters: Record<string, unknown>; signal?: AbortSignal }) => {
      if (id === undefined) return undefined
      return dataAdapter.normalizeRecord(
        await payload(await requestFor('detail', () => routeEndpoint(route, ['detail', ':id', '$get'])({ param: { id: wireIdentity(id) }, query: wireQuery(searchParameters) }, { init: { signal } })))
      )
    },
    create: async (input: object) => dataAdapter.normalizeRecord(await payload(await requestFor('create', () => routeEndpoint(route, ['create', '$post'])({ json: input })))),
    update: async (id: RecordIdentity, input: object) =>
      dataAdapter.normalizeRecord(await payload(await requestFor('update', () => routeEndpoint(route, ['update', ':id', '$patch'])({ param: { id: wireIdentity(id) }, json: input })))),
    delete: async (id: RecordIdentity) => payload(await requestFor('delete', () => routeEndpoint(route, ['delete', ':id', '$delete'])({ param: { id: wireIdentity(id) } }))),
  }
  return actions
}

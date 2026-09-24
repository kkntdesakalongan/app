import type { CollectionResult } from '@southneuhof/loom'
import type { ClientResponse } from 'hono/client'
import type { HonoCreateOf, HonoQueryOf, HonoRecordOf, HonoResourceActions, HonoUpdateOf } from '../contracts'

type Row = { id: string; name: string; active: boolean }
type Endpoint<TRequest, TResponse, TStatus extends number> = (args: TRequest, options?: unknown) => Promise<ClientResponse<TResponse, TStatus, 'json'>>
type Route = {
  list: { $get: Endpoint<{ query: { page?: string; limit?: string; search?: string; active?: string } }, { data: Row[]; total: number }, 200> }
  detail: { ':id': { $get: Endpoint<{ param: { id: string } }, { data: Row }, 200> } }
  create: { $post: Endpoint<{ json: { name: string; active?: boolean } }, { data: Row }, 201> }
  update: { ':id': { $patch: Endpoint<{ param: { id: string }; json: { name?: string; active?: boolean } }, { data: Row }, 200> } }
  delete: { ':id': { $delete: Endpoint<{ param: { id: string } }, { data: Row }, 200> } }
}

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? ((<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2 ? true : false) : false
type Assert<TValue extends true> = TValue

type RouteRecordIsExact = Assert<Equal<HonoRecordOf<Route>, Row>>
type RouteQueryContainsFilters = Assert<Equal<HonoQueryOf<Route>['active'], string | undefined>>
const createPayload: HonoCreateOf<Route> = { name: 'One', active: true }
const updatePayload: HonoUpdateOf<Route> = { name: 'Updated' }

const actions = {
  list: async (): Promise<CollectionResult<Row>> => ({ data: [{ id: '1', name: 'One', active: true }] }),
  detail: async (): Promise<Row> => ({ id: '1', name: 'One', active: true }),
  create: async (input: HonoCreateOf<Route>): Promise<Row> => ({ id: '1', name: input.name, active: input.active ?? true }),
  update: async (id: string, input: HonoUpdateOf<Route>): Promise<Row> => ({ id, name: input.name ?? 'One', active: input.active ?? true }),
  delete: async () => ({ data: { id: '1', name: 'One', active: true } }),
} satisfies HonoResourceActions<Route>

const routeTypeProof: [RouteRecordIsExact, RouteQueryContainsFilters] = [true, true]

void [actions, createPayload, updatePayload, routeTypeProof]

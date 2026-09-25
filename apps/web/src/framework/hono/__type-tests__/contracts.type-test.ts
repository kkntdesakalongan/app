import type { CollectionLoadContext, CollectionResult, OptionLoad } from '@southneuhof/loom'
import type { ClientResponse } from 'hono/client'
import { z } from 'zod/v4'
import { createHonoResourceActions } from '../actions'
import { collectionQueryFields } from '../collectionQuery'
import { rpc } from '@/framework/rpc'
import type { HonoCreateOf, HonoRecordOf, HonoRequestOf, HonoResourceActions, HonoUpdateOf } from '../contracts'

type Row = { id: string; name: string; active: boolean }
type Endpoint<TRequest, TResponse, TStatus extends number> = (args: TRequest, options?: unknown) => Promise<ClientResponse<TResponse, TStatus, 'json'>>
type Route = {
  list: {
    $get: Endpoint<{ query: { page?: string; limit?: string; search?: string; sort?: 'name' | 'email'; order?: 'asc' | 'desc'; active?: 'true' | 'false' } }, { data: Row[]; total: number }, 200>
  }
  detail: { ':id': { $get: Endpoint<{ param: { id: string } }, { data: Row }, 200> } }
  create: { $post: Endpoint<{ json: { name: string; active?: boolean } }, { data: Row }, 201> }
  update: { ':id': { $patch: Endpoint<{ param: { id: string }; json: { name?: string; active?: boolean } }, { data: Row }, 200> } }
  delete: { ':id': { $delete: Endpoint<{ param: { id: string } }, { data: Row }, 200> } }
}
type OptionalUpdateRoute = {
  update: { ':id': { $patch: Endpoint<{ param: { id: string }; json: { name?: string } }, { data: Row | undefined }, 200> } }
}

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? ((<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2 ? true : false) : false
type Assert<TValue extends true> = TValue

type RouteRecordIsExact = Assert<Equal<HonoRecordOf<Route>, Row>>
type OptionalUpdateResultIsPreserved = Assert<Equal<ReturnType<HonoResourceActions<OptionalUpdateRoute>['update']>, Promise<Row | undefined>>>
const createPayload: HonoCreateOf<Route> = { name: 'One', active: true }
const updatePayload: HonoUpdateOf<Route> = { name: 'Updated' }
const querySchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['name', 'email']).optional(),
  active: z.boolean().optional(),
})
type ActualUsersQuery = HonoRequestOf<typeof rpc.users.list.$get>['query']
type ActualUsersQueryUsesOpenFilterMap = Assert<Equal<string extends keyof ActualUsersQuery ? true : false, true>>
type ActualUsersQueryUsesStringValues = Assert<Equal<Exclude<ActualUsersQuery[keyof ActualUsersQuery], undefined>, string>>
const actualUsersActions = createHonoResourceActions(rpc.users, { querySchema })
declare const route: Route
const typedActions = createHonoResourceActions(route, { querySchema })
const queryContext: CollectionLoadContext<z.output<typeof querySchema>> = {
  query: { sort_by: 'email', sort: 'desc', active: true },
  searchParameters: {},
}
const listResult: Promise<CollectionResult<Row>> = typedActions.list(queryContext)
const optionLoad: OptionLoad<Row> = typedActions.list
type ListQueryMatchesSchema = Assert<Equal<Parameters<typeof typedActions.list>[0]['query'], z.output<typeof querySchema>>>

// @ts-expect-error The component loader accepts only the declared sort values.
typedActions.list({ query: { sort_by: 'active' }, searchParameters: {} })
// @ts-expect-error The component loader accepts only the declared filters.
typedActions.list({ query: { statusCode: 'active' }, searchParameters: {} })

const invalidSortSchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['active']).optional(),
})
// @ts-expect-error Encoded sort values must fit the endpoint's accepted values.
createHonoResourceActions(route, { querySchema: invalidSortSchema })

const invalidFilterSchema = z.object({
  ...collectionQueryFields,
  statusCode: z.string().optional(),
})
// @ts-expect-error Encoded filter names must fit the endpoint request contract.
createHonoResourceActions(route, { querySchema: invalidFilterSchema })

type NumericIndexRoute = Omit<Route, 'list'> & {
  list: { $get: Endpoint<{ query: Record<string, number> }, { data: Row[]; total: number }, 200> }
}
declare const numericIndexRoute: NumericIndexRoute
const stringValueSchema = z.object({ statusCode: z.string().optional() })
// @ts-expect-error A broad query key map still checks encoded values against the endpoint.
createHonoResourceActions(numericIndexRoute, { querySchema: stringValueSchema })

const actions = {
  list: async (): Promise<CollectionResult<Row>> => ({ data: [{ id: '1', name: 'One', active: true }] }),
  detail: async (): Promise<Row> => ({ id: '1', name: 'One', active: true }),
  create: async (input: HonoCreateOf<Route>): Promise<Row> => ({ id: '1', name: input.name, active: input.active ?? true }),
  update: async (id: string, input: HonoUpdateOf<Route>): Promise<Row> => ({ id, name: input.name ?? 'One', active: input.active ?? true }),
  delete: async () => ({ data: { id: '1', name: 'One', active: true } }),
} satisfies HonoResourceActions<Route>

const routeTypeProof: [RouteRecordIsExact, OptionalUpdateResultIsPreserved, ListQueryMatchesSchema, ActualUsersQueryUsesOpenFilterMap, ActualUsersQueryUsesStringValues] = [
  true,
  true,
  true,
  true,
  true,
]

void [actions, actualUsersActions, createPayload, updatePayload, queryContext, listResult, optionLoad, routeTypeProof]

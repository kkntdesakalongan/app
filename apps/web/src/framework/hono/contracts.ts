import type { InferRequestType, InferResponseType } from 'hono/client'
import type { StatusCode } from 'hono/utils/http-status'
import type { CollectionLoadContext, CollectionResult, RecordIdentity } from '@southneuhof/loom'

export type HonoRequestOf<TEndpoint> = InferRequestType<TEndpoint>
export type HonoResponseOf<TEndpoint, TStatus extends StatusCode> = InferResponseType<TEndpoint, TStatus>
export type HonoResponseRecordOf<TEndpoint, TStatus extends StatusCode> =
  DataOf<HonoResponseOf<TEndpoint, TStatus>> extends readonly (infer TRecord)[] ? TRecord : DataOf<HonoResponseOf<TEndpoint, TStatus>>

type EndpointAt<TRoute, TKey extends string, TMethod extends string> = TKey extends keyof TRoute
  ? TRoute[TKey] extends infer TNode
    ? TMethod extends keyof TNode
      ? TNode[TMethod]
      : never
    : never
  : never
type DetailEndpoint<TRoute, TMethod extends string> = 'detail' extends keyof TRoute
  ? TRoute['detail'] extends infer TDetail
    ? ':id' extends keyof TDetail
      ? TDetail[':id'] extends infer TNode
        ? TMethod extends keyof TNode
          ? TNode[TMethod]
          : never
        : never
      : never
    : never
  : never
type ListEndpoint<TRoute> = EndpointAt<TRoute, 'list', '$get'>
type DetailGetEndpoint<TRoute> = DetailEndpoint<TRoute, '$get'>
type CreateEndpoint<TRoute> = EndpointAt<TRoute, 'create', '$post'>
type UpdateEndpoint<TRoute> = 'update' extends keyof TRoute
  ? TRoute['update'] extends infer TUpdate
    ? ':id' extends keyof TUpdate
      ? TUpdate[':id'] extends infer TNode
        ? '$patch' extends keyof TNode
          ? TNode['$patch']
          : never
        : never
      : never
    : never
  : never
type DeleteEndpoint<TRoute> = 'delete' extends keyof TRoute
  ? TRoute['delete'] extends infer TDelete
    ? ':id' extends keyof TDelete
      ? TDelete[':id'] extends infer TNode
        ? '$delete' extends keyof TNode
          ? TNode['$delete']
          : never
        : never
      : never
    : never
  : never
type DataOf<T> = T extends { data: infer TValue } ? TValue : never
type ListRecordOf<T> = DataOf<T> extends readonly (infer TValue)[] ? TValue : never
type JsonOf<TEndpoint> = HonoRequestOf<TEndpoint> extends { json: infer TValue } ? TValue : Record<string, never>
type QueryOfEndpoint<TEndpoint> = HonoRequestOf<TEndpoint> extends { query: infer TValue } ? TValue : Record<string, never>
type ObjectJsonOf<TEndpoint> = JsonOf<TEndpoint> extends object ? JsonOf<TEndpoint> : Record<string, never>
type IsExactlyUnknown<TValue> = unknown extends TValue ? ([keyof TValue] extends [never] ? true : false) : false
type UnknownKeys<TPayload extends object> = {
  [TKey in keyof TPayload]-?: IsExactlyUnknown<TPayload[TKey]> extends true ? TKey : never
}[keyof TPayload]
type AdaptedObject<TPayload extends object> = Omit<TPayload, UnknownKeys<TPayload>> & Partial<Pick<TPayload, UnknownKeys<TPayload>>>
type UnionKeys<TPayload> = TPayload extends unknown ? keyof TPayload : never
type UnionValue<TPayload, TKey extends PropertyKey> = TPayload extends unknown ? (TKey extends keyof TPayload ? TPayload[TKey] : never) : never
type RequiredUnionKeys<TPayload> = {
  [TKey in UnionKeys<TPayload>]: [TPayload] extends [Record<TKey, unknown>] ? TKey : never
}[UnionKeys<TPayload>]
type UnionObject<TPayload extends object> =
  string extends UnionKeys<TPayload>
    ? TPayload
    : { [TKey in RequiredUnionKeys<TPayload>]: UnionValue<TPayload, TKey> } & { [TKey in Exclude<UnionKeys<TPayload>, RequiredUnionKeys<TPayload>>]?: UnionValue<TPayload, TKey> }
type AdaptedUnionObject<TPayload> = TPayload extends object ? (TPayload extends readonly unknown[] ? TPayload : AdaptedObject<TPayload>) : never
type AdapterPayload<TPayload> = [TPayload] extends [object] ? ([TPayload] extends [readonly unknown[]] ? TPayload : UnionObject<AdaptedUnionObject<TPayload>>) : TPayload
type KnownKeys<T> = { [TKey in keyof T]-?: string extends TKey ? never : TKey }[keyof T]
type QueryValue<TWire, TKey extends PropertyKey, TFallback> = TKey extends keyof TWire ? TWire[TKey] : TFallback
type AdapterQuery<TWire extends object> = {
  page?: QueryValue<TWire, 'page', string> | number
  limit?: QueryValue<TWire, 'limit', string> | number
  search?: QueryValue<TWire, 'search', string>
  sort?: QueryValue<TWire, 'sort', string>
  order?: QueryValue<TWire, 'order', string>
} & {
  [TKey in Exclude<KnownKeys<TWire>, 'page' | 'limit' | 'search' | 'sort' | 'order'>]?: TWire[TKey]
}

export type HonoRecordOf<TRoute> = [ListEndpoint<TRoute>] extends [never]
  ? DataOf<HonoResponseOf<DetailGetEndpoint<TRoute>, 200>> extends object
    ? DataOf<HonoResponseOf<DetailGetEndpoint<TRoute>, 200>>
    : Record<string, unknown>
  : ListRecordOf<HonoResponseOf<ListEndpoint<TRoute>, 200>> extends object
    ? ListRecordOf<HonoResponseOf<ListEndpoint<TRoute>, 200>>
    : Record<string, unknown>
export type HonoQueryOf<TRoute> = [ListEndpoint<TRoute>] extends [never] ? Record<string, never> : AdapterQuery<QueryOfEndpoint<ListEndpoint<TRoute>> & object>
export type HonoCreateOf<TRoute> = AdapterPayload<ObjectJsonOf<CreateEndpoint<TRoute>>>
export type HonoUpdateOf<TRoute> = AdapterPayload<ObjectJsonOf<UpdateEndpoint<TRoute>>>

type MutationRecordOf<TEndpoint, TStatus extends StatusCode> = DataOf<HonoResponseOf<TEndpoint, TStatus>> extends object ? DataOf<HonoResponseOf<TEndpoint, TStatus>> : Record<string, unknown>

export type HonoResourceActions<TRoute> = ([ListEndpoint<TRoute>] extends [never]
  ? {}
  : {
      list: (context: CollectionLoadContext<HonoQueryOf<TRoute>>) => Promise<CollectionResult<HonoRecordOf<TRoute>>>
    }) &
  ([DetailGetEndpoint<TRoute>] extends [never]
    ? {}
    : {
        detail: (context: { id?: RecordIdentity; searchParameters: Record<string, unknown>; signal?: AbortSignal }) => Promise<HonoRecordOf<TRoute> | undefined>
      }) &
  ([CreateEndpoint<TRoute>] extends [never]
    ? {}
    : {
        create: (input: HonoCreateOf<TRoute>) => Promise<MutationRecordOf<CreateEndpoint<TRoute>, 201>>
      }) &
  ([UpdateEndpoint<TRoute>] extends [never]
    ? {}
    : {
        update: (id: RecordIdentity, input: HonoUpdateOf<TRoute>) => Promise<MutationRecordOf<UpdateEndpoint<TRoute>, 200>>
      }) &
  ([DeleteEndpoint<TRoute>] extends [never]
    ? {}
    : {
        delete: (id: RecordIdentity) => Promise<HonoResponseOf<DeleteEndpoint<TRoute>, 200>>
      })

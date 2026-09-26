# Query and mutation contract

Read for custom reads, submit overrides, or writes that affect other resources.
Loom owns the query client and resource cache keys.

## Reads and queries

Standard Views and extracted primitive bags own loading. Bind `resource.list`
and `resource.create` directly; bind `resource.detail({ id })` and
`resource.update({ id })` for record pages. Their loaders remain in the nested
`table`, `detail`, or `form` bag. An update-only page needs no display operation.

For standard Hono lists, pass the module's raw query schema to
`createHonoResourceActions(endpoint, { querySchema })`, then bind `api.list`
directly. The adapter validates and encodes the collection query once. Do not
also assign that schema to the resource table. Standalone tables may own query
validation when their loader does not. Use frontend `sort_by` and `sort`;
the transport owns wire names. Preserve endpoint-specific sort keys, filters,
search parameters, and cancellation.

Use `collectionKey` or `recordKey` with `useLoader` only when no existing surface
owns the custom data set. Include every result-changing query and parent input
in both key and request context. Use a distinct namespace for another logical
collection. Keep changing inputs reactive and use `enabled` until required inputs
exist. Choose either `data` or `load`.

Current owners: [Hono actions](../../../../apps/web/src/framework/hono/actions.ts),
[query contract examples](../../../../apps/web/src/framework/__type-tests__/plan068-query-ownership.type-test.ts),
and [Loom query API](../../../../packages/loom/src/query/index.ts).

## Writes and commands

Resource-bound form submit owns access and mutation invalidation. Create/update
results must contain the declared identity; an update result must identify the
bound target. Use the resource identity shape for routes, writes, and keyed
invalidation. Use `invalidate()` for the whole resource.

Custom commands live under `resource.actions`. `run` and `can` receive exactly
the business arguments. Attach row policy with `withContext({ record })`;
it does not change that tuple. Explicit `permission: null` still permits row
policy checks. The server remains responsible for current authorization.

The binder invalidates its own resource after a successful write. Refresh other
affected resources after success, awaiting their `invalidate({ id })` or
`invalidate()` as needed. Keep later refresh work separate from the write, using
`submitted` or the supported page completion hook. Report refresh failure as
stale data; do not repeat the successful write.

## Submit overrides and failures

`<Form v-bind="bound.form" :submit="replacement" />` replaces the guarded
function. The replacement does not inherit its access checks or invalidation.
Prefer the bound submit. When an override is required, explicitly preserve the
required policy and refresh ownership in the replacement operation.

`RESOURCE_RESULT_INVALID` means the write may have completed but returned an
invalid identity. The binder invalidates affected caches and reports a
non-retryable error. Do not fabricate an identity, claim rollback, or submit
again automatically. Apply the same write/refresh distinction to post-write
invalidation failures.

# Query and mutation contract

Use this reference for transport, custom reads, submit overrides, or mutation
completion. Loom owns query execution and resource cache keys.

## Reads and queries

Standard Views and extracted primitive bags own loading. Use `useLoader` with
`collectionKey` or `recordKey` only when no existing surface owns the data set.
Include every result-changing input in both the key and request. Keep inputs
reactive and use `enabled` while required values are absent. A namespace
identifies a query instance; a resource key identifies its invalidation owner.

Use the [Hono adapter](../../../../apps/web/src/framework/hono/actions.ts) for
standard transport. Its returned type exposes the operations in the typed route:

- A route with list needs `createHonoResourceActions(endpoint, { querySchema })`.
  Bind `api.list` directly; the adapter validates and encodes queries, so the
  resource table needs no second `querySchema`.
- A route without list uses `createHonoResourceActions(endpoint)`. Add only the
  operations the module needs; no query schema or artificial list endpoint is
  required.

Use frontend `sort_by` and `sort`; the adapter owns wire names, serialization,
response normalization, and cancellation. Keep custom protocols in typed app
actions. A standalone table can own query validation when its loader does not.
For filter forms, follow [filter ownership](../../web-ui-surfaces/references/surfaces.md#filters-and-tabs).

## Writes and invalidation

Resource operations own access and invalidation. Use the declared identity for
routes, writes, and keyed invalidation. Create/update results must carry a valid
identity; an update result must identify its bound target.

After a successful write, the binder invalidates its own resource. Refresh other
affected resources with `invalidate({ id })` or `invalidate()`. Keep that later
work in `submitted` or the supported page completion hook. Report its failure
as stale data; repeating the write is not a refresh strategy.

Resource-backed option inputs need the source's resource key as well as its
loader. Follow [relation sources](../../build-resource-form/SKILL.md#configure-relation-sources)
so ordinary invalidation reaches them; use no private cache keys or manual
picker refresh path.

## Submit overrides and failures

Replacing a bound `submit` replaces its access and invalidation too. Prefer the
bound operation; a required replacement owns those policies explicitly.

Distinguish three outcomes in custom coordination:

| Outcome | Required behavior |
|---|---|
| Write rejected before completion | Preserve input and allow a deliberate retry |
| `postWrite: true` | Keep uncertainty visible; block another write to that target |
| Write succeeded, later page refresh/navigation failed | Preserve success and report the later failure separately |

Preserve `postWrite` and `retryable` when normalizing errors. Invalid returned
identity (`RESOURCE_RESULT_INVALID`) and binder invalidation failure can follow
a completed write. Do not turn them into ordinary validation failures, claim
rollback, or emit normal completion.

Form and its wrappers retain `postWriteError` for the mounted write target.
Editing, resetting, refreshing, or changing the query does not clear it.
ListView retains this outcome per resource/record identity and guards its
supplied delete callbacks; other records remain usable. Keep these built-in
owners when customizing controls, and keep close/leave available.

The guards are local to mounted surfaces. Remounting is not reconciliation or
server idempotency. Do not force a remount to make an uncertain write retryable.
Use the [Form](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#5-form-and-dialogform-runtime)
and [ListView](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#71-table-treetable-detail-and-page-views)
contracts when implementing custom recovery.

# Plan 111: Share List data and preserve Form sessions

## Decision and status

The user accepted this direction on 2026-10-27. Implementation and parent review are complete on
`feat/resource-authoring-simplification`. See the shared
[verification record](108-unify-resource-configuration-contracts.md#verification).
List follows the managed and custom composition principle from
[Plan 110](110-share-detail-record-state.md). Form retains its existing session
owner and does not gain a public helper merely for API symmetry.

The [current architecture](../docs/resource_system_overhaul/ARCHITECTURE.md)
describes the implementation in this branch. Examples in this plan record the
accepted target.

## Shared List runtime

Expose `useCollection` through the same framework-owned runtime used by managed
List components. Extract the existing Collection behavior. Do not create a
second cache or query lifecycle for custom pages.

The normal page uses the callable binding accepted in Plan 108:

```vue
<ListView v-bind="users.list()" />
```

A fully custom page uses the shared collection reader:

```vue
<script setup lang="ts">
const {
	records,
	meta,
	query,
	loading,
	error,
	refresh,
	updateQuery,
} = useCollection(() => users.list().table)
</script>

<template>
	<ErrorNotice v-if="error" :error="error" @retry="refresh" />
	<UserCardList :users="records" :loading="loading" />
	<Pagination :query="query" :meta="meta" @change="updateQuery" />
</template>
```

The UI components are illustrative. The application owns the layout. The
framework owns request identity, caching, cancellation, refresh, and query
state. URL query persistence follows the existing managed behavior. An
explicitly controlled query remains owned by its parent.

`records` contains the current page. Backend metadata supplies total counts.
Do not derive a collection-wide aggregate from one fetched page.

Keep the existing ListView `collection` slot for custom collection content
inside the standard page. Its records and operations come from the same shared
runtime as direct helper use. Do not add a second slot solely to make every
view use the same slot name.

Preserve query-schema validation when extracting the runtime. Table currently
performs that work before its loader. Custom composition must not bypass it.
Preserve pagination defaults, sorting parameters, query replacement and reset
semantics, controlled-query updates, and resource invalidation integration.

Framework types have one authoritative owner. Collection slots and the helper
derive their corresponding value and reactive state contracts from that owner.
Preserve query and record inference. A custom page must not construct cache keys
or maintain another copy of the query result to receive cached data.

## Form keeps its existing owner

The user's normal editors use Form or several Forms coordinated by a stepper.
A fully custom editor is not a current requirement. Do not introduce `useForm`
or publish the internal session API merely to match the read helpers.

FormView remains an optional page wrapper. Standalone Form remains usable
inside any application page layout:

```vue
<MyPageHeader />
<Form v-bind="users.update({ id: userId }).form" />
```

Each mounted Form owns its draft, validation, touched state, pending work,
submission, and reset behavior. A stepper owns step coordination and navigation.
Several forms that use the same record retain independent editable sessions.
Do not share their mutable drafts through the query cache.

When several forms use one detail record, obtain it through the shared managed
record state. The application maps that record into each form's initial values
as needed. Cached and fetched values must follow the same hydration path.
Do not combine another record observer with a Form loader for the same purpose
or add a cache-specific synchronization watcher.

Form already hydrates cached loader results and preserves edited fields when
background data changes. Keep that behavior. Loaded server values provide a
baseline; the live draft remains session state. Preserve the existing controlled
model contract as well.

Form currently caches its own loader result under a separate form query
variant. Thus the statement that the application caches only detail data is a
description of its use case, not a literal description of all current internal
query entries. That implementation detail does not require a new public API.

## Implementation and proof boundaries

Reuse the existing Collection and Form owners. The shared List helper must
retain identical query and cache behavior under managed and custom composition.
Refine exact helper signatures during implementation without adding new cache
vocabulary to application code.

Select focused List proof for fetched and cached results, query changes,
controlled queries, validation, cancellation, refresh, and active resource
invalidation. Form proof is required only if its implementation changes. Use
`test-audit` before test work.

The user later authorized Carta implementation and Git publication. External
application migrations, a new Form helper, and global freshness changes remain
outside this work. Cross-resource effects and custom shared
query designs remain separate proposals.

Laziness Protocol reuses the existing Collection runtime and keeps Form on its
current session. Minimize Reader Load gives List one data contract across page
layouts without making every framework concept share an identical API.

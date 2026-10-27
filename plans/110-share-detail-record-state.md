# Plan 110: Share Detail record state across page composition

## Decision and status

The user accepted this direction on 2026-10-27. Implementation has not started.
This plan records the accepted Detail data ownership and composition contract.
The later List and Form decisions are recorded in
[Plan 111](111-share-list-data-and-preserve-form-sessions.md).

Loom owns one record-reading contract. `DetailView` uses it internally and
exposes its result through scoped slots. Fully custom pages use the same
contract through `useRecord`. Caching, cancellation, and refresh remain
framework responsibilities in both cases.

This extends [Plan 108](108-unify-resource-configuration-contracts.md) and uses
the loader identity direction from
[Plan 109](109-carry-resource-loader-identity.md). Current authoring guides
continue to describe shipped behavior.

## SWA Report case study

The HK Shield SWA detail page used two ways to obtain the same record. Loom's
main `Detail` consumed query state. Sibling cards consumed a local `record` ref
that the route assigned inside its wrapped loader.

On a fresh fetch, the loader assigned the local ref and returned the result to
Loom. Both consumers received data. On a fresh cache hit, Loom displayed the
cached record without executing the loader. The local ref stayed empty.
`Lampiran`, `Riwayat Laporan`, `Tindak Lanjut`, and `Keterangan Realisasi`
depended on that local state and did not appear when their data was available
only through the main Detail's query state.

Commit `8f3c80ef6627f22083a10144020d3e7e41e51218` in HK Shield, dated
2026-10-25, is titled `fix(swa-report): render cached detail side cards`. It
adds another `useLoader`, imports the internal `recordCacheKey` helper, and
watches the query data immediately to fill the local ref. It also removes the
unconditional local-record clear at the start of a load.

The current [SWA detail route](../../hk-shield-ads/produksi/website/src/routes/%28authenticated%29/work-unit-inputs/swa-reports/%5BswaReportId%5D/detail.route.vue)
contains that extra wiring. The installed Detail view exposes record context
to individual field slots, but not to a whole custom page body or controls.
The framework improvement makes that state accessible without another query
observer or a local copy maintained by the application.

The investigation ran the existing focused integration file on 2026-10-27.
All 20 tests passed. That file has no cache-hit revisit case. The historical
code change was inspected, but the old failure was not reproduced at runtime.
No HK Shield source changed during this investigation.

## One record state

Given the same available record and context, application behavior must be the
same whether the record comes from the API or cache. A required application
state update must not depend on the loader executing.

`useRecord` accepts the same detail configuration used by standalone `Detail`.
It exposes reactive `record`, `loading`, and `error` state, plus `refresh`.
Accept reactive configuration so a route ID or request parameter change updates
the read without requiring application cache keys or synchronization watchers.

Resource ownership, source identity, effective request arguments, cancellation,
retry, error normalization, and invalidation integration remain in Loom. Keep
TanStack Query and generated keys out of the normal page authoring contract.

The framework owns the authoritative configuration, read state, and slot types.
`Detail`, `DetailView`, and custom composition use those shared types and the
same reader. Preserve record inference through resource bindings.

## Managed DetailView composition

An ordinary page remains short:

```vue
<DetailView v-bind="users.detail({ id: userId })" />
```

Loom reads the record and renders its standard header and detail card. Custom
content uses the same record through slots:

```vue
<DetailView v-bind="swaReportResource.detail({ id: reportId })">
	<template #controls="{ record }">
		<Button
			v-if="record && canFollowUp(record)"
			@click="openFollowUp(record)"
		>
			Tindak Lanjut
		</Button>
	</template>

	<template #body="{ record, detail }">
		<div class="grid gap-4 lg:grid-cols-4">
			<div class="grid gap-4 lg:col-span-3">
				<Card>
					<Detail v-bind="detail" />
				</Card>
				<SwaAttachments :record="record" />
				<SwaFollowUp :record="record" />
				<SwaRealization :record="record" />
			</div>
			<SwaHistory :record="record" />
		</div>
	</template>
</DetailView>
```

The `Swa*` components are illustrative. Existing card markup can remain inline.
They do not require loaders or cache keys.

The `body` slot receives a ready record. Its `detail` value is a framework-made
data-only prop bag containing the configured schema, fields, labels, and
`data: record`. It contains no loader. The inner Detail displays that same
record without another fetch. Authors do not rebuild this bag or remove `load`
themselves.

The custom body replaces the normal detail card and its contents. Without a
body slot, the standard rendering remains. The controls slot can receive an
undefined record while the page loads, so static header content remains usable.
Expose the same reader's refresh action where custom content needs it.

Loom owns the initial loading, empty, and error displays. Background refresh
keeps the available page visible and updates all consumers through the same
record state. A refresh failure remains distinguishable from an initial load
failure. It does not require application code to copy cached data into a ref.

## Fully custom composition

A custom page does not require DetailView, its header, cards, or slots:

```vue
<script setup lang="ts">
const { record, loading, error, refresh } = useRecord(() =>
	swaReportResource.detail({ id: reportId.value }).detail,
)
</script>

<template>
	<main v-if="record">
		<MyReportHeader :report="record" />
		<MyReportLayout :report="record" />
		<RefreshWarning v-if="error" :error="error" @retry="refresh" />
	</main>
	<Spinner v-else-if="loading" />
	<ErrorPanel v-else-if="error" :error="error" @retry="refresh" />
	<EmptyState v-else />
</template>
```

These UI components are illustrative. The custom page owns its markup and
state presentation. `useRecord` still owns all read mechanics. Direct use does
not require separate cache-hit handling.

DetailView consumes this same reader internally. Standalone Detail uses the
shared reader when supplied with a loader. A Detail supplied with data renders
that data without starting another fetch.

## Lifecycle and application ownership

Preserve the configured access policy and record identity through managed and
custom reads. A changed ID or context must not allow an old response to replace
the current record. Preserve the existing actor-change rules when integrating
the reader into an application. Background retention of data does not authorize
retaining a previous actor's record.

The application retains business permissions, workflow conditions, navigation,
and pinned dialog snapshots or versions. A pinned workflow snapshot is distinct
from a second local copy of the current loaded record.

Cached data and fresh data enter the same read state. Do not add a network-only
completion callback as the mechanism that makes the rest of the page work.

## Implementation and proof boundaries

Refine the exact generic signatures and slot contracts during implementation.
Keep ready body record types distinct from optional loading-time control state.
Share the existing reader and display runtime instead of building a second
query system for DetailView.

Select focused proof for cold reads, fresh cache hits, cache-hit revisits,
background refresh, refresh errors, ID changes, and late responses. The SWA
scenario must prove that the main detail and sibling content use the same
record for both cached and fetched results. Use `test-audit` before test work.

This document does not authorize framework implementation, HK Shield migration,
Git publication, or changes to global freshness settings. Cross-resource write
effects and reusable custom-query designs from the earlier discussion remain
proposals. This Detail decision does not define a List helper or Form helper;
Plan 111 records their separate disposition.

Minimize Reader Load gives managed and custom pages one record contract.
Fix Root Causes removes the dependency on loader execution. Laziness Protocol
preserves ordinary DetailView usage and reuses the existing Detail renderer.

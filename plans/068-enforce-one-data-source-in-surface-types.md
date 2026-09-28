# Plan 068: Enforce one data source in surface types

## Status and intent

- Status: DONE. Priority: P2. Effort: M. Risk: MED. Confidence: HIGH.
- Category: contract / unfinished migration. Depends on root Plan 064 for the Vue-aware negative diagnostic gate. Execute before root Plan 069.
- Planned at: `1246387`, 2026-09-26.

Collection, Table, TreeTable, and Detail require exactly one source at runtime. Their public types permit both sources or no source. Complete the typed boundary so an agent gets an error while it writes a page. Keep runtime validation for JavaScript callers and dynamic prop changes.

## Current state and constraints

`packages/loom/src/contracts/components.ts:24` declares:

```ts
data?: TRecord[]
load?: Load<CollectionLoadContext<TQuery>, CollectionResult<TRecord>>
```

`DetailProps` has the same optional pair for records. Table and TreeTable inherit the permissive shape. `TableContentProps` omits source properties because it presents already-loaded records.

`packages/loom/src/components/core/useCoreData.ts:15` checks vnode prop presence as well as values and throws `SURFACE_DATA_SOURCE_INVALID` when both or neither are supplied. Collection data must be an array. Detail data must be a non-null object. Architecture section 7.1 explicitly promises typed and runtime enforcement.

An in-memory TypeScript probe accepted four invalid Table/Detail bags: both and neither sources. A wrong-row-type control failed as expected. This confirms a public type gap; it does not prove Vue template behavior. That is a required implementation gate.

## Scope

- `packages/loom/src/contracts/components.ts`.
- Direct source forwarding in `packages/loom/src/components/core/{Collection,Table,TreeTable,Detail,TableContent}.vue`.
- Source composition types in `packages/loom/src/resources/operations.ts` and `packages/loom/src/components/composites/form-inputs/lookupInput.types.ts` and `packages/loom/src/components/composites/form-inputs/tableInput.types.ts`.
- Existing core source behavior tests under `packages/loom/src/components/core/__tests__/`, including `surface-data-source.spec.ts`; existing resource and composite type fixtures.
- New `packages/loom/src/contracts/__type-tests__/surface-data-source.type-test.ts` and `.vue` fixtures.
- Extend `packages/loom/scripts/check-contract-diagnostics.mjs` supplied by root Plan 064 with bounded surface-source fixtures. Do not create a second diagnostic runner.
- Architecture section 7.1 only if clarification is needed; this plan and its index row.

Do not change loader execution, cache identity, pagination, slot ownership, missing-record UI, or Form load/model behavior. Direct app callers found by the inventory can be migrated only when they violate this existing runtime rule; record their exact paths first. Do not edit routes merely to modernize syntax.

## Target type structure

Separate source-free options from the union. For a collection, combine options with `{ data: TRecord[]; load?: never } | { load: Load<CollectionLoadContext<TQuery>, CollectionResult<TRecord>>; data?: never }`. Use the analogous record union for Detail. Keep existing public type names; changing an interface to a type alias is allowed. Add no mode flag and no public constructor.

Table combines the collection source union with table definition/options. TreeTable adds hierarchy controls while preserving both source branches. TableContent combines source-free presentation options with its required `records`, query, loading, and empty state. Do not apply a non-distributive `Omit` to a union and assume that its branch requirements survived.

Resource list/detail bags keep a required bound loader and `data?: never`. LookupInput and TableInput must retain their actual ownership rules when they omit source props; they do not become independently loaded components. Table's computed Collection props must construct a complete branch, rather than create an incomplete typed object and assign `data` or `load` later.

Preserve existing values: `data: []` is valid for collections; a record object is valid for Detail. Do not add null or undefined as a controlled Detail value in this plan. Loaded `RecordResult` can still report no record. With the current TypeScript optional-property settings, `load?: never` may accept explicit undefined; runtime own-property validation remains authoritative for that case. Record this limit instead of changing repository-wide compiler settings.

## Commands and steps

Read root AGENTS, resource architecture, and `test-audit`. Preserve initial dirty work. No new comments or type suppressions. No installs, commits, or pushes.

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/contracts packages/loom/src/components/core packages/loom/src/components/composites packages/loom/src/resources/operations.ts packages/loom/scripts` | Compare affected owners; reconcile completed 064 |
| Inventory | `rg -n 'CollectionProps|TableProps|TreeTableProps|TableContentProps|DetailProps' packages/loom/src apps/web/src` | Record construction and omission sites |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0; invalid cases rejected for source ownership |
| Runtime | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/core/__tests__/collection.spec.ts src/components/core/__tests__/table-collection.spec.ts src/components/core/__tests__/detail.spec.ts src/components/core/__tests__/TreeTable.spec.ts src/components/core/__tests__/table.spec.ts src/components/core/__tests__/surface-data-source.spec.ts` | All pass, including dynamic source changes |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |

1. Run Drift, Inventory, Types, and Runtime. Record existing failures. Confirm that Plan 064's diagnostic command exists and passes. Inventory each `extends`, `Omit`, and partially built source bag before changing the contract.
2. Add the source-free options and source unions. Update the core forwarders, resource bags, and composite omissions in one bounded change. Run Types; all valid existing uses must compile without broad casts, `any`, optional loaders, or a weaker exported substitute.
3. Add positive TS and actual Vue fixtures for controlled empty collections, loaded collections, record Detail, loaded Detail, TreeTable, extracted resource bags, and object spreads. Add negative compiler cases for both and neither sources for all four source-owning components. Run Types and Diagnostics. Each negative fixture needs an otherwise-valid paired control so a wrong schema/row type cannot make it pass by accident.
4. Run Runtime. Extend a boundary test only if the existing tests do not cover both/neither and source presence changes; do not add tests that inspect union helper names. Run App and Architecture. Run `git diff --check`, inspect scope, record results, and update the index after review.

## Done, stops, and maintenance

- [x] Required sources survive named bags, spreads, resource extraction, and real Vue component calls.
- [x] Diagnostic cases reject both/neither for the intended reason; positive controls compile.
- [x] Runtime presence and data-shape checks remain active during setup and after prop updates.
- [x] TableContent has no source requirement; resource-bound loaders remain required.
- [x] All commands pass and no suppression or permissive fallback bypasses the union.

Stop if Vue macros erase or reject the public source union, if generic inference loses row/query types, or if enforcing the union requires a new component wrapper. Report the smallest failing fixture; do not ship a TS-only claim when templates remain permissive. Stop after two failed bounded corrections. Future source-related props must be added to their actual owner, not to every bag through a broad common interface.

The baseline audit passed Loom types and 450 tests in 61 files before these changes. That is not evidence for the proposed repairs. The test skill references OpenClaw-specific tools that are not available here; report them as unavailable, not passed. Apply its independent-contract and no-duplicate-test rules to the actual Carta gates above. App type checks can generate route artifacts; preserve unrelated work.

## Execution evidence

STATUS: COMPLETE

The contracts now combine source-free options with one required source branch for Collection, Table, TreeTable, and Detail. TableContent uses source-free options and remains a loaded-row presentation. Resource list and detail bags remove both primitive source keys before adding a required bound loader and `data?: never`. LookupInput and TableInput keep their existing source-free table definition ownership; no change was needed there.

Table and TreeTable now build complete source branches when they forward props. Each source-owning component also repeats the runtime source check before updates. A mounted regression changes each component from a valid data source to competing data and load props and verifies that the owning component rejects the update. Before the update checks, all four mounted cases captured no errors and failed at the assertion for the rejected update. The diagnostic harness from Plan 064 includes eight TypeScript negatives and eight real Vue template negatives for both/neither sources. Each source case has a valid typed counterpart. New positive fixtures cover empty and loaded collections, controlled and loaded Detail, both TreeTable branches, resource extraction, object spreads, query inference, real Vue calls, and source-free TableContent.

`load?: never` and `data?: never` can accept an explicit undefined with the current optional-property settings. The runtime own-property check remains authoritative. Table's existing runtime test now also checks the neither-source case, alongside both-source calls and an explicit undefined property.

| Gate | Result |
|---|---|
| Drift | `05ebfa3`; no committed in-scope drift from `1246387`. Existing working-tree changes from completed Plans 064 and 065 were preserved. |
| Inventory | Reviewed source unions, resource bag `Omit` sites, Table and TreeTable forwarding, ListView bags, and LookupInput/TableInput table ownership. App consumers remain resource-bound. |
| Types | Pass: `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json`. |
| Diagnostics | Pass: 11 resource, 8 TypeScript surface, and 8 Vue surface cases. |
| Runtime | Pass: 6 core files, 57 tests, including the four planned files, `table.spec.ts`, and four mounted valid-to-invalid source transitions. |
| App | Pass: `pnpm --filter @southneuhof/framework-web type-check`; route contract and generation completed. |
| Architecture | Pass: 18 checker tests and `pnpm test:surface-architecture`. |
| Whitespace | Pass: `git diff --check`. |

The OpenClaw test runner, crabbox, and autoreview tools were unavailable in this environment. They were not counted as passed. No install, commit, push, or external write was performed.

# Plan 067: Make filter query ownership explicit

## Status and intent

- Status: TODO. Priority: P1. Effort: M. Risk: MED. Confidence: HIGH.
- Category: correctness / unfinished migration. Depends on: none. Execute before root Plan 069.
- Planned at: `1246387`, 2026-09-26.

An editor draft and its parsed query can have different keys. Loom already accepts this, but ListView assumes that their keys match when it restores a draft or removes a filter. Give the filter declaration explicit ownership of query keys and the mapping back to a draft. Do not attempt to invert a schema transform.

This plan is a deliberate small breaking change: all filter declarations supply the same explicit contract, including identity mappings. There is no inferred legacy path. Applications without filters need no change. Keep Collection as the query owner and Form as the validation owner.

## Current state and evidence

`packages/loom/src/contracts/views.ts:38` defines `ListFilters` as a submit-free `FormDefinition<TInput, Partial<TQuery>>` plus defaults and labels. It has no reverse mapping or query ownership list.

`packages/loom/src/components/views/ListView.vue:122` derives draft keys this way:

```ts
const keys = new Set([
  ...Object.keys(props.filters?.fields ?? {}),
  ...Object.keys(props.filters?.defaults ?? {}),
]);
```

The same component discovers output keys only after a successful parse through `lastFilterOutputKeys`. A filter with draft `selection` and output `status` cannot restore `selection` from an initial or replaced query. A first successful parse of `{}` cannot remove an existing `status` key. An in-memory execution of the actual hydration function reproduced the mismatch; no browser reproduction was run.

`packages/loom/src/resources/operations.ts:490` has a separate `ResourceListFilterOptions` pick and reconstructs the bound filter contract. Both must carry the new properties. `components/views/__tests__/views.spec.ts:471` already tests an asynchronous selection-to-status transform; extend that behavior test. Architecture section 7.2 promises authoritative query synchronization, stale validation cancellation, and removal of cleared owned keys.

## Scope

Change only the following owners and their direct filter declarations:

- `packages/loom/src/contracts/views.ts`, `components/views/ListView.vue`, and `resources/operations.ts` under `packages/loom/src/`.
- `packages/loom/src/components/views/__tests__/views.spec.ts`, `components/views/__type-tests__/list-view.type-test.ts`, and `resources/__type-tests__/bound-resource.type-test.ts`.
- Filter examples in `docs/resource_system_overhaul/ARCHITECTURE.md` and `docs/ui/collections.md`.
- This plan and its root index row.

Search first for additional actual declarations. If there are callers outside this list, report their paths and add only direct migrations to the scope before implementation. Do not rewrite routes, resource binding, schemas, Form reset policy, cache keys, or URL serialization. Do not edit the user's skill changes.

## Target contract

1. Require `queryKeys: readonly Extract<keyof TQuery, string>[]` and `toDraft: (query: Readonly<QueryValues>) => FormDraft<TInput>` on `ListFilters`. The author supplies a synchronous, pure mapping. Bound resource filters preserve both properties and their types.
2. On initial hydration and authoritative query replacement, use `{ ...defaults, ...toDraft(query) }`. An explicit `undefined` from the mapper overrides a default. Do not emit a query change during hydration. A mapper receives authoritative query state, not the previous draft. This state can contain URL strings, arrays, absent values, and malformed values; it is not guaranteed to be parsed `TQuery`. Import the existing `QueryValues` contract. The mapper checks and normalizes only its own inputs, returning defaults/unset draft values for unsupported input. Keep transport schema parsing at the loader boundary; do not parse the full query twice or cast URL state to `TQuery`.
3. On successful validation, reject parsed output keys outside `queryKeys` with a clear Loom configuration error before any query commit. No silent dropping, inferred ownership, or generic field mapping registry. Validate duplicate/reserved ownership consistently: duplicate keys may be normalized; `page` cannot be owned because ListView resets it. Search/sort keys are allowed only if explicitly declared.
4. For a valid latest result, copy the authoritative base query, delete every declared owned key, merge defined parsed values, and set `page` to 1 once. An empty result must clear all owned keys on the first edit. Keep unowned search, sort, and limit values.
5. Keep the existing validation generation guard and pending self-echo handling. A parent replacement while validation is pending cancels that work. A self-echo must not erase raw draft text. Reset keeps Form's existing reset behavior; it validates the reset draft and uses the same commit path.
6. Delete `filterValues` and `lastFilterOutputKeys` once callers use the explicit contract. The replacement hydration function may compose defaults and `toDraft`; it must not infer keys from fields.

## Commands and ordered steps

Run from repository root. Read root AGENTS, the resource architecture, and `test-audit` before implementation. No new implementation comments, compatibility aliases, installs, commits, or pushes. Save initial `git status --short` and preserve unrelated edits.

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/contracts/views.ts packages/loom/src/components/views packages/loom/src/resources/operations.ts docs/ui/collections.md docs/resource_system_overhaul/ARCHITECTURE.md` | Review each changed owner against this plan |
| Callers | `rg -n 'filters:|ListFilters|lastFilterOutputKeys|filterValues' packages/loom/src apps/web/src docs/ui/collections.md docs/resource_system_overhaul/ARCHITECTURE.md` | Inventory every live declaration; search is not a test |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Behavior | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/views/__tests__/views.spec.ts` | All tests pass |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |

1. Run Drift, Callers, Types, and Behavior as a baseline. Record failures separately. Write an inventory of draft keys, output keys, defaults, and reverse mapping for each filter. Do not choose a reverse transform from a field name.
2. Add the contract and migrate all scoped declarations in one change. Identity examples still declare their keys and mapper. Preserve the compact resource return type. Run Types: valid plain and resource-bound filter bags must pass. Add public type cases for wrong query keys and wrong draft values, using the existing type fixture style without new suppression comments.
3. Change hydration and commit ownership in ListView. Extend the existing mounted behavior tests with the matrix below. Run Behavior after each coherent change; all cases must pass. Do not test a private helper instead of the mounted query boundary.
4. Update architecture section 7.2 and the collection example with the exact new API and a transformed example. Run Types, Behavior, Architecture, and App. Run `git diff --check`; inspect status against the initial record. Record results here and update the index only after review.

## Required behavior matrix

- Initial `{ status: 'active' }` restores draft `{ selection: 'active' }`; an authoritative replacement restores the new selection without a query echo.
- A first valid empty parsed output removes initial `status`, keeps unowned sort/search/limit, and resets page once.
- An invalid parse and a late valid result after external replacement do not commit or load stale values.
- A normal successful edit keeps raw draft text across its own query echo. Reset applies the declared defaults through validation.
- Output containing an undeclared key reports the configuration error and leaves the query unchanged.
- URL hydration with a numeric string, absent key, and malformed value is handled by the mapper without a query echo or false parsed-type assumption.
- An existing same-key filter still works through its explicit identity mapping. A resource-bound filter retains `queryKeys` and `toDraft` without a cast.

## Done, stops, and maintenance

- [ ] All listed gates pass, including the new mounted regressions.
- [ ] `rg -n 'lastFilterOutputKeys|function filterValues' packages/loom/src/components/views/ListView.vue` returns no matches.
- [ ] No query ownership is inferred from schema input, fields, or a previous parse.
- [ ] Every active filter example has the explicit mapping and key list.

Stop if implementing the contract needs another query owner, or if a gate fails twice after a bounded correction. Report drift before adapting an incompatible owner. Future filter schema changes must update both the key list and reverse mapping. This duplication is intentional: a forward transform does not define its inverse or all keys it can clear.

The baseline audit passed Loom types and 450 tests in 61 files before these changes. That is not evidence for the proposed repairs. The test skill references OpenClaw-specific tools that are not available here; report them as unavailable, not passed. Apply its independent-contract and no-duplicate-test rules to the actual Carta gates above. App type checks can generate route artifacts; preserve unrelated work.

## Execution evidence

Not implemented. Source review and an in-memory hydration probe confirm the bug. New runtime, type, and application gates remain unrun.

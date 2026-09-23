# Plan 053: Use one display pipeline for Table, TreeTable, Detail, and export

> Read architecture §§2.5-2.6, 3.2-3.3, 7.1, and 10. Run the drift check first. Update the 053 row after review. Do not commit or push unless asked.
>
> **Drift check:** `git diff --stat 40afee2..HEAD -- packages/loom/src/display packages/loom/src/components/core packages/loom/src/services packages/loom/src/renderers`. Compare the current-state excerpts; stop if their ownership changed.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** HIGH; **Depends on:** 051; **Category:** migration; **Planned at:** `40afee2`, 2026-09-23.

## Why this matters

Table and Detail currently resolve universal fields and invoke separate renderer registries. Export consumes a resolved universal-field type. The target requires a pure read/format pipeline shared by all read-only surfaces and workbook values.

## Current state

- `packages/loom/src/components/core/Table.vue:82-85` passes `props.fields` to TableContent.
- `packages/loom/src/components/core/Detail.vue:21-29,40-45,74-83` resolves fields, reads values, and renders with the `detail` registry.
- `packages/loom/src/services/export.ts:1-13,60-70` accepts `ResolvedSurfaceField[]` for workbook export.
- `packages/loom/src/renderers/registry.ts:36-40` has separate `table` and `detail` registries. Existing browser pattern: `components/core/__tests__/Table.browser.spec.ts`.
- `DESIGN.md:59-63,90-93` calls for readable collection columns, relation names, status chips, dates, and asset previews. Use explicit definitions, not property-name defaults.

Current export type (`services/export.ts:1-13`):

```ts
import type { ResolvedSurfaceField } from '../fields/resolve'
export interface ExportRequest<TRecord extends object, TQuery extends object> {
  fields: ResolvedSurfaceField[]
}
```

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Loom types | `pnpm --filter @southneuhof/loom type-check` | exit 0 or logged dependent callers |
| Unit tests | `pnpm --filter @southneuhof/loom test` | affected display/export suites pass |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | table/tree/detail parity passes |

## Scope

**In:** `packages/loom/src/display/{resolveDisplay,DisplayValue,requirements}.*`, `components/core/{Table,TableContent,TreeTable,Detail,Collection,useCoreData,useTablePreferences}.vue` or `.ts` as applicable, `services/{export,excel}.ts`, display renderer files, their tests and type fixtures, browser config if a new spec is added.

**Out:** Form sessions, resources, app defaults, transport/backend, unrelated provider operations. Keep current collection query, slot, pagination, reorder, preference, and resize behavior.

## Git workflow

Continue on `advisor/resource-surface-overhaul` after Plan 051. Do not ship an intermediate state. Do not commit or push unless asked.

## Steps

1. Resolve ordered columns/detail entries from their own definitions and labels. Implement one pure `record -> read/property -> format -> renderer` path in `display/resolveDisplay.ts` and `DisplayValue.vue`. A missing renderer renders scalar/nullish text; reject structured fallback, unknown renderer/format, and invalid `sortKey` with §10.2 diagnostics. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/display/__tests__/resolveDisplay.spec.ts --environment jsdom` exits 0; tests cover keys, computed entries, status/date/asset formatting, no mutation, and diagnostics.
2. Bind Table, TreeTable, TableContent, and Detail to `columns` or detail `fields`. Keep `Collection` as the data/query owner and preserve `data` versus `load` guard. Use one display registry. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/table.spec.ts src/components/core/__tests__/TreeTable.spec.ts src/components/core/__tests__/detail.spec.ts --environment jsdom` exits 0; included type negatives reject old/cross-surface props.
3. Make export use resolved visible columns and their accessor/format, without mounting a Vue component. Keep `mapValue`, exclusions, filenames, paging, and query ownership. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/services/__tests__/export.spec.ts --environment jsdom` exits 0; tests compare rendered and workbook values, visible columns, and paging.
4. Add the architecture §2.6 joined-role fixture: a single pure `roleIds` accessor reads joined names for Table and Detail. Count network calls at zero and show that mutation output need not carry the display join. **Verify:** `pnpm --filter @southneuhof/loom test:browser` exits 0 and the joined-role spec runs; `pnpm --filter @southneuhof/loom type-check` checks its typed fixture.

## Test plan and done criteria

- Follow `components/core/__tests__/Table.browser.spec.ts` and existing `services` tests for setup.
- [ ] Table and Detail consume the same `DisplayValue` path.
- [ ] No new display source invokes a network loader from `read` or formatter.
- [ ] Export accepts resolved columns, not `ResolvedSurfaceField`.
- [ ] `git diff --check` exits 0; unmigrated app/resource callers are logged.

## STOP conditions

- A current export feature requires an implicit field-projection behavior with no explicit target equivalent.
- A needed read model lacks relation captions and no existing loader can batch them without changing the backend contract; report the screen and endpoint.
- A new renderer type needs a public `any` escape or silently coerces objects to text.

## Maintenance notes

When a new display renderer is added, register it once for both table and detail. Review export text against the same business catalog, while keeping `mapValue` as an export-specific override.

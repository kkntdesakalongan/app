# Plan 051: Define independent surface contracts and raw-schema compilation

> **Implementation instructions:** Read `docs/resource_system_overhaul/ARCHITECTURE.md` in full. Run the drift check first. Complete each step and its gate. Update the 051 row in `plans/README.md` after review. Do not commit, push, or publish unless asked.
>
> **Drift check:** `git diff --stat 40afee2..HEAD -- packages/loom/src/contracts packages/loom/src/validation packages/loom/src/renderers packages/loom/src/forms packages/loom/src/tables packages/loom/src/details packages/loom/src/labels packages/loom/src/schemas packages/loom/tsconfig.json`. Compare the excerpts below with live code when it reports changes. Stop if the contract assumptions no longer hold.

## Status

- **Priority:** P1
- **Effort:** L
- **Risk:** HIGH
- **Depends on:** none
- **Category:** migration
- **Planned at:** `40afee2`, 2026-09-23

## Why this matters

All later work needs one typed meaning for a form input, table column, detail entry, label, and raw schema. The present `Field*` catalog combines them and the public schema bridge wraps Zod before a surface receives it. This plan builds the new owners without making the old implementation a hidden dependency.

## Current state

- `packages/loom/src/contracts/fields.ts:97-125` makes table, detail, and form projections extend one renderer selection; form entries still have `validate` and `write`.
- `packages/loom/src/validation/zod.ts:66-90` exposes `ZodValidationSchema` and `fromZod`.
- `packages/loom/src/renderers/registry.ts:13,36-40` has `table`, `detail`, and `form` registries.
- `packages/loom/tsconfig.json:43-56` includes `src/**/*`, excludes ordinary `__tests__`, retains `strictTemplates`, and has `checkUnknownProps: false`.
- The existing exemplar for structural cross-dialect Zod handling is `validation/zod.ts:19-42`. Keep the two installed Zod dialects; do not change dependencies. The target vocabulary and contracts are in architecture sections 2-4 and 10.

Current coupling (`contracts/fields.ts:114-125`):

```ts
export interface FieldFormProjection<TDraft = Record<string, unknown>, TValue = unknown> extends FieldRendererSelection {
  source?: unknown
  behavior?: FieldBehavior<TDraft, TValue>
  validate?: FieldValidate<TValue>
  write?: FieldWrite<TValue>
}
```

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Loom types | `pnpm --filter @southneuhof/loom type-check` | exit 0 after caller migration; during this plan, record any old-caller errors exactly |
| Focused tests | `pnpm --filter @southneuhof/loom test` | exit 0 after integration; during this plan, report old-caller failures |
| Cold checker | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json --extendedDiagnostics` | log exit status, time, types, instantiations, checker memory |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | record baseline exit status and diagnostics |
| Web unit | `pnpm --filter @southneuhof/framework-web test` | record baseline exit status and failing tests |
| Cold web checker | `pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false -p tsconfig.vitest.json --extendedDiagnostics` | after route-contract setup, log the same metrics as Loom |

## Scope

**In:** `packages/loom/src/contracts/{forms,tables,details,display,labels,schema}.ts`, `contracts/index.ts`, `forms/{defineForm,compileForm,behavior,props}.ts`, `tables/defineTable.ts`, `details/defineDetail.ts`, `labels/resolveLabel.ts`, `schemas/compileSchema.ts`, `renderers/{registry,displayContracts}.ts`, focused tests and included `__type-tests__`, `packages/loom/tsconfig.json`, `plans/resource-system-overhaul-inventory.md`.

**Out:** mounted components, resource implementation, app modules, dependency versions, backend contracts. Plan 058 deletes the old paths after all callers move; do not add a compatibility wrapper or make a new constructor delegate to `defineFields`.

## Git workflow

Keep all eight plans on one integration branch, `advisor/resource-surface-overhaul`. Do not ship an intermediate state. Do not commit or push unless asked.

## Steps

1. Inventory every group in architecture §9.1 in `plans/resource-system-overhaul-inventory.md`. Record paths, current owner, target plan, and proof. Record current `git status`, installed tool versions, full Loom/web test and type-check exit codes, and a cold Loom/web `vue-tsc --noEmit --incremental false --extendedDiagnostics` baseline. Use the web's `tsconfig.vitest.json`; run its route-contract prerequisite if required. **Verify:** `rg -n '^\| (Public|Field|Primitive|Wrappers|Nested|Resource|Plugin|Export|App|Settings|Adjacent|Generators|Agent|Skills|Tooling)' plans/resource-system-overhaul-inventory.md` lists every §9.1 group; baseline log names each command and exit status.
2. Add compact raw-schema input/output types and one internal compiler for object-input discovery, async parse, metadata, required hints, and normalized nested issues. It must inspect supported Zod v3/v4 wrappers without executing defaults or transforms to infer controls. Reject undiscoverable input objects with `FORM_SCHEMA_INPUT_UNSUPPORTED`. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/schemas/__tests__/compileSchema.spec.ts --environment jsdom` exits 0; tests cover both dialects, defaults, async refinement, transformed input/output, nested paths, and unsupported shapes.
3. Add `FormDefinition`, `FormInput`, validator descriptors, `TableDefinition`, `TableColumn`, `DetailDefinition`, `DetailField`, and shared `DisplayField` as separate contracts. Implement `defineForm`, `defineTable`, and `defineDetail` as transparent snapshots with context-free checks. Preserve submit presence and awaited result type. Check named fragments and spreads, cross-surface keys, renderer props, accessors, sortable `sortKey`, and unsafe keys. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/forms/__tests__/defineForm.spec.ts src/tables/__tests__/defineTable.spec.ts src/details/__tests__/defineDetail.spec.ts --environment jsdom` exits 0; included positive/expected-error `__type-tests__` compile through pinned `vue-tsc` with no new errors in new files.
4. Add explicit label resolution and `form`/`display` registries. Keep built-in form renderers. A display component must register against the augmentable display map. Reject unknown renderer keys in production. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/labels/__tests__/resolveLabel.spec.ts src/renderers/__tests__/registry.spec.ts --environment jsdom` exits 0; tests cover an empty label, reactive getter, shared display registry, and unknown key.
5. Enable `checkUnknownProps` for Loom while retaining `strictTemplates`; resolve only errors in this plan's scope or record dependent errors for later plans. **Verify:** `pnpm --filter @southneuhof/loom type-check` has no new errors in the new files and expected-error fixtures remain active.

## Test plan and done criteria

- Model the new type fixtures on `packages/loom/src/resources/__type-tests__/schema.type-test.ts` and runtime tests on `packages/loom/src/fields/__tests__/defineFields.spec.ts` only for test structure, not implementation.
- [ ] The three constructors and raw compiler have positive and negative type/runtime coverage.
- [ ] New source files do not import `../fields`, `fromZod`, or `actionResource`.
- [ ] The inventory and cold baseline are recorded, including unavailable metrics.
- [ ] `git diff --check` exits 0. Any whole-package failure caused by unmigrated callers is listed, not called a pass.

## STOP conditions

- A Zod dialect cannot expose a discoverable finite object input without running user code.
- The new public types need `any`, bivariance, type suppression, or a TS2590 suppression.
- Current source no longer matches the cited legacy owner, or a needed change crosses into backend/dependency scope.

## Maintenance notes

Review type inference with `NoInfer` at callback boundaries. Keep SFC prop types compact; constructors own expensive authoring checks. Plan 058 removes the old public contracts once all consumers are migrated.

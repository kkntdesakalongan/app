# Plan 058: Remove all replaced paths and prove the complete migration

> Read architecture §§9-11 and the inventory created in Plan 051. Run drift check first. Execute every listed gate, record failures, and update row 058 after review. Do not commit or push unless asked.
>
> **Drift check:** `git diff --stat 40afee2..HEAD -- packages/loom apps/web scripts .agents/skills AGENTS.md DESIGN.md docs .github`. This will be nonempty after Plans 051-057; compare their delivered contracts against architecture §§1-10 and stop if an assumed target differs.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** HIGH; **Depends on:** 051-057; **Category:** migration; **Planned at:** `40afee2`, 2026-09-23.

## Why this matters

The architecture is complete only when no executable path, public export, template, or active instruction can author the removed universal-field resource model. This gate also checks runtime parity, type boundaries, and all configured product flows before declaring the clean break.

## Current state

- `packages/loom/src/index.ts:1-8` exports `./fields` and `./validation` alongside resources and primitives.
- `packages/loom/src/resources/defineResource.ts:25-44` still exposes the old two-argument signature at planning time.
- `packages/loom/src/components/views/FormView.vue:41-82` still has dual prop shapes and type suppression at planning time.
- `scripts/scaffold-bounded-module.mjs:610-628` and active docs/skills still generate or teach old code at planning time.
- `docs/resource_system_overhaul/ARCHITECTURE.md:601-620` lists every removed API and forbids aliases, overloads, dual shapes, fallback resolvers, dead implementations, and parallel legacy/v2 directories.

Current exports (`packages/loom/src/index.ts:1-8`):

```ts
export type * from './contracts'
export * from './query'
export * from './fields'
export * from './validation'
export { Table, TreeTable, Detail, Form } from './components/core'
export { DialogForm } from './components/composites'
export * from './components/views'
export * from './resources'
```

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Architecture gate | `node scripts/check-surface-architecture.mjs` | exit 0, zero executable legacy matches |
| Loom types/tests | `pnpm --filter @southneuhof/loom type-check && pnpm --filter @southneuhof/loom test && pnpm --filter @southneuhof/loom test:browser` | exit 0 |
| Web types/tests | `pnpm --filter @southneuhof/framework-web type-check && pnpm --filter @southneuhof/framework-web test` | exit 0 |
| Module tooling | `pnpm test:module-tooling` | exit 0 |
| Workspace | `pnpm type-check && pnpm test && pnpm lint && pnpm build` | exit 0 |
| E2E | `pnpm --filter @southneuhof/framework-web test:e2e` | exit 0 in configured environment; otherwise blocked with evidence |

## Scope

**In:** legacy deletion and final exports in `packages/loom/src/{fields,validation,contracts,resources,renderers,components,adapters,services,index.ts}`, all remaining consumers in `apps/web/src`, `scripts`, active docs/skills, `.github` and package validation scripts for the architecture gate, `scripts/check-surface-architecture.mjs` and tests, `plans/resource-system-overhaul-inventory.md` and this plan's evidence/status.

**Out:** backend contract/authorization changes, dependency upgrades, unrelated product features or redesign. Preserve the existing API transport and server validation.

## Git workflow

Finish on `advisor/resource-surface-overhaul`; do not merge or ship until all gates pass. Do not commit or push unless asked.

## Steps

1. Reconcile the §9.1 inventory with actual imports, re-exports, generated templates, fixtures, aliases, dependent prop types, agent pointers, and all new paths. Move retained validation/display behavior to its new owner, then delete `packages/loom/src/fields/`, `resources/actionResource.ts`, app `framework/fields/`, public `fromZod`, aggregate schema types, and other §9.2 replaced code. **Verify:** `rg -n 'defineFields|fromZod|FieldReference|FieldOverride|ResolvedSurfaceField|WebResourceSchema|appFieldDefaults' packages/loom/src apps/web/src scripts` finds only permitted negative-test literals; `pnpm --filter @southneuhof/loom type-check && pnpm --filter @southneuhof/framework-web type-check` exits 0.
2. Add `scripts/check-surface-architecture.mjs` with syntax-aware import/prop checks and tests. Register it in normal validation/CI. Allow removed names only in negative-test literals/history; allow legitimate command `run`, new form/detail `fields`, and unrelated provider `.list()`. **Verify:** `node --test scripts/check-surface-architecture.test.mjs && node scripts/check-surface-architecture.mjs` exits 0; tests reject aliased old imports, `Form :form`, `Table.fields`, and old resource signatures.
3. Complete architecture §10.3 parity suites: form/session, display, extraction, composite ownership, existing UI, generator, and type fixtures. Ensure `checkUnknownProps` and `strictTemplates` are active in effective Loom/web configs. **Verify:** `pnpm --filter @southneuhof/loom type-check && pnpm --filter @southneuhof/loom test && pnpm --filter @southneuhof/loom test:browser && pnpm --filter @southneuhof/framework-web type-check && pnpm --filter @southneuhof/framework-web test && pnpm test:module-tooling` exits 0 with no new suppression or OOM.
4. Run the full architecture §11 command list in order, including workspace lint/build and web E2E in a configured environment. Measure one cold candidate Loom/web checker run with the same pinned toolchain, disabled incremental reuse, scope, and metrics as Plan 051. Record command, exit status, failure baseline comparison, elapsed time, types/instantiations, checker memory, peak process memory or unavailable metric. **Verify:** evidence table in `plans/resource-system-overhaul-inventory.md` names every gate and result; all available required commands exit 0.
5. Review the final diff hunk by hunk against the architecture; reject unrelated changes and stale compatibility code. Update `plans/README.md` only after the final review. **Verify:** `git diff --check` exits 0; `git status --short` shows only requested migration and plans.

## Test plan and done criteria

- Follow the existing Loom unit/browser, web acceptance, and scaffold tests; add one architecture-checker suite and the §10.3 parity fixture.
- [ ] All §9.2 removed APIs, exports, implementations, and active templates are absent.
- [ ] Every §9.1 group has a completed inventory row and proof.
- [ ] Every §11 gate passes; unavailable environmental gates are reported as blocked, never as passes.
- [ ] Cold baseline/candidate metrics and final diff review are recorded.

## STOP conditions

- Any required gate fails twice after a reasonable fix; record the exact command and error.
- A deleted API still has an active caller outside the inventory; add that caller and migrate it before deletion.
- Completing the migration requires a backend/dependency change outside the user-approved scope.
- A clean type-check requires suppression, public `any`, unsafe casts, or a second legacy path.

## Maintenance notes

Keep the architecture checker in normal validation so old APIs cannot return. Review public exports and generated code whenever a surface contract changes. Do not call the overhaul complete while an E2E or other required gate is blocked.

# Plan 062: Give common display checks one owner

## Status and intent

- Status: TODO. Priority: P2. Effort: S. Risk: LOW. Confidence: HIGH.
- Category: architecture. Dependencies: none.
- Planned at: `1246387`, 2026-09-26.

Table and Detail must remain separate public definitions. Their common display configuration must obey the same rules before and during rendering. Remove copied checks where their meaning is identical. Keep checks that require an installed formatter, record keys, or query context at runtime. This is a private extraction, not a generic validation library or a return to universal fields.

Read root `AGENTS.md`, resource architecture sections 2.5, 3.2, and 4, and `test-audit`. Add no implementation comments. Implement only when selected for execution; no commit, push, install, backend write, or dependency update is part of the plan.

## Current state

`packages/loom/src/tables/defineTable.ts:82`, `details/defineDetail.ts:53`, and `display/resolveDisplay.ts:62` independently check allowed display members, prop shape, accessor, renderer, format, and surface-specific options.

The constructors contain this shorter reserved-member list:

```ts
for (const member of ['value', 'modelValue', 'record', 'draft', 'field', 'key', 'index', 'setValue']) {
```

The runtime at `display/resolveDisplay.ts:37` also reserves `model-value`, `onUpdate:modelValue`, `onUpdate:model-value`, `onValidation:touch`, and `validation:touch`. A JavaScript configuration can therefore construct successfully but fail when rendered. The runtime enumerates field members with `Reflect.ownKeys`; constructors use `Object.keys`, which misses symbols.

`tables/__tests__/defineTable.spec.ts` explicitly allows an application formatter key before application configuration exists. Preserve that behavior. `display/__tests__/resolveDisplay.spec.ts` checks installed formatters, sort keys, relation accessors, and actual display values. Preserve those separate runtime obligations.

Match the current constructor style: context-free assertions followed by a shallow snapshot, retained schema/function references, ordered maps, single quotes, and no semicolons. `FormInput` remains independent from `DisplayField`.

## Scope

Only these paths may change:

- `packages/loom/src/display/assertDisplayDefinition.ts` (new private helper)
- `packages/loom/src/display/resolveDisplay.ts`
- `packages/loom/src/tables/defineTable.ts`
- `packages/loom/src/details/defineDetail.ts`
- `packages/loom/src/display/__tests__/resolveDisplay.spec.ts`
- `packages/loom/src/tables/__tests__/defineTable.spec.ts`
- `packages/loom/src/details/__tests__/defineDetail.spec.ts`
- This plan and its `plans/README.md` row.

Do not change public types, exports, labels, renderer registration, schema discovery, display-value formatting, export behavior, app declarations, or dependency versions. Keep constructor snapshots local unless removing them is necessary for this exact extraction; generic clone helpers and broad cleanup are out of scope.

## Target split

The private helper owns safe entry-key checks, entry-object shape, allowed member names by surface, common member value types, reserved renderer props, and surface-local option shapes. It may export a small function for entry validation and a small key assertion. Take a surface and diagnostic location so messages still identify Table/Detail and the field/member. Avoid a rule DSL, plugins, a schema compiler, or class hierarchy.

Constructors call the helper before snapshotting. `resolveDisplayFields` calls the same helper for plain objects that bypass constructors. Keep runtime checks for record-key existence, query `sort_by` support, finite query sort options, and configured formatter lookup in `resolveDisplay.ts`. Keep `readDisplayValue`, `formatDisplayValue`, and `resolveDisplayValue` unchanged.

Choose the existing runtime reserved-member set as the authoritative set. Use `Reflect.ownKeys` for closed member maps. Preserve acceptance of context-free custom renderer/formatter names at construction. Keep constructor schema presence and top-level map/label checks with the constructors. Do not make the helper depend on application injection or the renderer registry.

## Commands

Run from the repo root; positive checks must exit 0.

| Gate | Command |
|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/display packages/loom/src/tables packages/loom/src/details` |
| Local work | `git status --short` and `git diff -- packages/loom/src/display packages/loom/src/tables packages/loom/src/details` |
| Focused unit | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/tables/__tests__/defineTable.spec.ts src/details/__tests__/defineDetail.spec.ts src/display/__tests__/resolveDisplay.spec.ts` |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` |
| Regression | `pnpm --filter @southneuhof/loom test` |
| Display browser | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/DisplayParity.browser.spec.ts` |
| Architecture | `pnpm test:surface-architecture` |
| Whitespace | `git diff --check` |

Loom Types and 450 unit tests passed during audit. Other gates must be run during execution. There is no Loom lint script. The local test skill names unavailable OpenClaw validation tools; disclose that limitation and use these existing Carta commands without claiming the unavailable checks ran.

## Steps

1. Record drift/local edits and compare the three validation blocks. Preserve unrelated work. Run Focused unit and Types. **Verify:** both pass before edits, or report the baseline failure.
2. Extend existing constructor rejection tests with reserved event/model aliases and a symbol-keyed extra member. Use `Reflect.apply` as existing tests do to exercise JavaScript inputs. Include a valid ordinary prop/accessor control. Do not add tests that inspect helper names or source imports. **Verify:** Focused unit fails on constructor acceptance of the new invalid cases before the extraction; record the expected-red output.
3. Extract context-free checks and switch all three production callers to them. Delete the replaced blocks. Preserve existing diagnostic code and field/member identification; exact prose can differ only where necessary to share the owner. Avoid broad test string rewrites. **Verify:** Focused unit and Types pass.
4. Confirm the existing runtime tests still reject unknown configured formatters and invalid query sort keys while constructors still accept a custom formatter name. Add one runtime case only if the current suite lacks proof for the newly shared reserved-member boundary. **Verify:** Focused unit and Display browser pass. No private-helper-only tests are needed.
5. Run Regression, Architecture, and Whitespace. Review each changed hunk for this extraction. Record evidence here and update the index. **Verify:** all gates pass and task changes remain within Scope.

## Test ownership and done criteria

Constructor tests own early JavaScript configuration rejection. Runtime tests independently own valid plain-object consumption and context-dependent checks. Existing display browser tests own rendering parity. Do not repeat the full reserved-name matrix in all three suites: table-drive the two constructors in one existing test owner if that is clearer, with one runtime integration case for the bypass path.

- [ ] The pre-fix regression fails for the intended reason and passes after extraction.
- [ ] One internal owner contains common entry/member rules; all three entry points use it.
- [ ] Custom formatter construction, map order, snapshots, and function references still work.
- [ ] Runtime formatter/query/record checks and plain-object consumption remain enforced.
- [ ] All commands pass; no new public abstraction or out-of-scope task changes.

Stop for a conflicting live contract, a required application registry at construction, an out-of-scope repair, or two failed attempts at a verification gate. Report unverified browser work as blocked, not passed. Future display-member changes should update this private owner and the corresponding public type; they must not recreate separate reserved-member lists.

## Execution evidence

Not executed. Source drift between the constructor and runtime checks is confirmed; the proposed regression is not yet written or run.

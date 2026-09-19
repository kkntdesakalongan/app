# Plan 045: Require explicit display for non-string visible fields

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat b44b82b..HEAD -- packages/loom/src/fields packages/loom/src/validation packages/loom/src/contracts/fields.ts packages/utilities/src/parse.ts scripts/module-ui-check.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: correctness, dx
- **Planned at**: commit `b44b82b`, 2026-09-19

## Why this matters

POS forward-test showed raw `true` and unformatted IDR in tables because fields declared only `form`. The display seam falls back to the raw value with no signal. Plain strings can keep the default. Numbers, booleans, enums, relations, and objects cannot. This plan makes the seam require an explicit display choice for non-string kinds only, so agents do not write `renderer: 'text'` everywhere and users never see raw storage values.

POS module files are out of scope. They serve only as test fixtures for the check. This plan changes the framework seam plus its gate.

## Current state

Relevant files and roles:

- `packages/loom/src/fields/display.ts` — reads one field value and applies `format`. Falls back to raw value.
- `packages/loom/src/validation/zod.ts` — infers renderer and schema kind from Zod tags. Source of kind truth.
- `packages/loom/src/fields/schemaMetadata.ts` — stores and reads `InternalSchemaKind`.
- `packages/loom/src/fields/resolve.ts` — merges defaults, schema inference, shared entry, surface projection.
- `packages/utilities/src/parse.ts` plus `packages/utilities/src/format.ts` — `currency`, `number`, `date`, `datetime` formatters.
- `scripts/module-ui-check.mjs` — template binding check. Does not evaluate display today.
- `DESIGN.md` — requires an explicit display choice for each visible field, shared via `defineFields`.

Excerpts as of `b44b82b`:

```ts
// packages/loom/src/fields/display.ts:5
export function displayValue(record, field): unknown {
  const value = field.read ? field.read(record, {}) : record[field.key]
  return field.format ? parse(field.format, value) : value
}
```

```ts
// packages/loom/src/validation/zod.ts:178
export function inferFieldLayers(schema: ZodSchemaLike): Record<string, FieldLayer> {
```

```ts
// packages/loom/src/fields/schemaMetadata.ts:1
type InternalSchemaKind = 'unknown' | 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'string[]' | 'number[]' | 'boolean[]' | 'object[]' | 'selection[]'
```

```ts
// packages/utilities/src/parse.ts:10
const defaultFormatters = { number, largeNumber, currency, month, date, time, datetime, hour, delta }
```

Conventions to match:

- Field layers merge in `resolve.ts`. Surface `false` excludes. `undefined` inherits. Props shallow-merge.
- Display renderers live in app `renderers.ts` (`chip`, `html`, `image`, `file`). Formats live in utilities `parse`/`format`. Do not move renderers into Loom in this plan.
- Forward-test evidence: `menu.price` with `form.renderer: currency` and no `display.format` rendered raw; `isAvailable` with `form.renderer: switch` and no display rendered `true`. POS files are fixtures only.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Loom type-check | `pnpm --filter @southneuhof/loom type-check` | exit 0 |
| Loom focused tests | `pnpm --filter @southneuhof/loom test -- src/fields/__tests__/display.spec.ts src/fields/__tests__/resolve.spec.ts` | all pass |
| Loom full tests | `pnpm --filter @southneuhof/loom test` | all pass |
| UI check | `node scripts/module-ui-check.mjs --sources 'apps/web/src/routes/(authenticated)/pos'` | reports new display warnings for fixture, exit code per tool contract |
| Lint | `pnpm --filter @southneuhof/loom lint` or repo lint for touched packages | exit 0 |

## Scope

**In scope:**

- `packages/loom/src/fields/*` (kind-aware display requirement helper plus resolve integration)
- `packages/loom/src/fields/__tests__/*` (new specs)
- `packages/loom/src/validation/zod.ts` (only if kind export is needed; prefer existing exports)
- `scripts/module-ui-check.mjs` plus its test (extend to report risky fields)
- `docs/ui/*` or skill reference update for the rule, if the repo owns it in this tree

**Out of scope (do NOT touch):**

- `apps/web/src/routes/(authenticated)/pos/**/*` — forward-test fixture. Read it for cases. Do not fix POS display here.
- `apps/web/src/configs/defaults.ts` — app defaults. No new defaults in this plan.
- `apps/web/src/framework/fields/renderers.ts` — no new renderer components.
- Any API package. No entity or service change.
- Mandatory `renderer: 'text'` for plain strings. Explicitly rejected.

## Git workflow

- Branch: `advisor/045-display-pit`
- Commit per step. Match repo style (imperative subject, e.g. `Require display for non-string fields`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add kind-aware display requirement helper with tests

Add one pure helper, e.g. `requiresExplicitDisplay(kind, field)` in `packages/loom/src/fields/`, that returns true when table or detail display needs an explicit `format`, `renderer`, or `read`.

Rules to implement:

- Kind `string` with no `source` returns false.
- Kind `number`, `boolean`, `date` returns true unless `format` or `renderer` or `read` exists.
- Enum kinds and `selection[]` return true unless `renderer` or `read` or `format` exists.
- Kind `object`, `array`, `object[]`, and any field with `form.source` (lookup, select) returns true unless `read` or `renderer` exists.
- Kind `unknown` returns false. Never block unknown schema metadata.

Write specs in `packages/loom/src/fields/__tests__/display-requirement.spec.ts` modeled after `display.spec.ts` and `resolve.spec.ts`. Cover: plain string passes; number without display fails; currency format passes; boolean without display fails; chip passes; lookup source without read fails; read passes; unknown passes.

**Verify**: `pnpm --filter @southneuhof/loom test -- src/fields/__tests__/display-requirement.spec.ts` → all new tests pass.

### Step 2: Wire helper into resolve path as dev warning plus check input

Expose the helper result on resolved table and detail fields in a non-breaking way (e.g. exported function taking resolved field plus kind, not a change to rendered output). Do not change rendered values in this plan. Rendering stays identical; only the new helper and the UI check consume it.

Add a dev-only console warning or `orphan`-style diagnostic only if the codebase already has that pattern for fields; otherwise skip runtime warning and rely on the static check in step 3. Do not add user-facing logs.

**Verify**: `pnpm --filter @southneuhof/loom type-check` → exit 0.

### Step 3: Extend module-ui-check to report risky visible fields

Extend `scripts/module-ui-check.mjs` to resolve list, detail, and table-row field sets for each route directory and report fields where the helper returns true and no explicit display exists. Report `file:line`, field key, kind, and surface. Keep exit-code contract: warnings for fixtures, error only where the tool already errors. Do not change POS fixtures to green in this plan; the POS run should demonstrate the new warnings.

Add or extend the tool test following the existing `module-ui-check.test.mjs` pattern with a minimal fixture (string passes, number without format warns, lookup without read warns).

**Verify**: `node scripts/module-ui-check.mjs --sources 'apps/web/src/routes/(authenticated)/pos'` → lists price, amounts, booleans, and menu line column as risky; `pnpm test:module-tooling` or the tool test command → pass.

## Test plan

- New `display-requirement.spec.ts`: 8–10 cases listed in step 1.
- Extended tool test: fixture with string, number, boolean, lookup.
- Existing `display.spec.ts`, `resolve.spec.ts` must pass unmodified behavior for rendering.
- Full Loom suite must pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm --filter @southneuhof/loom type-check` exits 0
- [ ] `pnpm --filter @southneuhof/loom test` exits 0, including new requirement spec
- [ ] UI check reports risky POS fixture fields and tool test passes
- [ ] No files outside scope modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Current-state excerpts do not match live code.
- Schema kind is unavailable at the check site without a large refactor. Do not invent a parallel type system.
- The team prefers mandatory `renderer: 'text'` for strings. That contradicts this plan's intent; stop and confirm.
- Fix requires touching POS module routes or app defaults to pass. Those are out of scope by design.

## Maintenance notes

- Future renderers must update the kind table once, not per module.
- Reviewers should check that plain strings were not forced into explicit renderers.
- Follow-up for table-row lookup display text belongs to the row-display plan family, not here. This plan only flags the column.

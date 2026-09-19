# Plan 048: Gate custom record actions by row through declared actions

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat b44b82b..HEAD -- packages/loom/src/resources/actionResource.ts packages/loom/src/contracts apps/web/src/framework/adapters/bundle.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: plans/047-derive-record-ops-from-actions.md
- **Category**: architecture, correctness
- **Planned at**: commit `b44b82b`, 2026-09-19

## Why this matters

This is part 2 of the missing-View track. `pay` and `cancel` exist as custom resource actions with permission checks only. Their row entries in `allowedOperations` do nothing for the UI unless each page hand-reads the array. That is why finished orders kept Pay and Cancel buttons in the forward-test. After plan 047 derives standard row ops, this plan extends the same derivation to custom actions so `actions.pay.can` and `actions.cancel.can` respect the row when the resource declares them. POS files stay fixtures.

## Current state

Files and roles:

- `packages/loom/src/resources/actionResource.ts:745,954` — `customAllows` checks permission strings only; custom `run` re-checks permission before the callback.
- `apps/web/src/framework/adapters/bundle.ts:18` — row-array path handles only the fixed triple. Custom names fall through to permission.
- POS fixture (read-only): `orders.resource.ts:71` declares `pay` and `cancel` with `run` plus `permission`; `detail.route.vue:36` renders both buttons unconditionally. Do not edit POS here.

Excerpts:

```ts
// packages/loom/src/resources/actionResource.ts:745
function customAllows(resourceKey, actionName, declaration, args): boolean {
  const required = resolveCustomPermission(resourceKey, actionName, declaration.permission, args)
  if (required === null) return true
  const access = useResourceRuntime().adapters.access
  return required.every((permission) => access.allows({ operation: actionName, permission }))
}
```

```ts
// packages/loom/src/resources/actionResource.ts:954
const run = (...args) => {
  if (!customAllows(definition.key, key, declaration, args)) throw new Error(...)
  return declaration.run(...args)
}
```

Conventions from plans 034 and 044:

- Custom declarations allow exactly `run` plus `permission`. Do not add per-action `fields` or `route` options here.
- `resource.actions.name.can` is the UI check; `run` enforces again before the callback. Keep that pairing.
- Collection-level custom actions exist. Row gating must apply only when a row record is identifiable from the call args or an explicit record context, never by guessing.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Loom type-check | `pnpm --filter @southneuhof/loom type-check` | exit 0 |
| Loom resource tests | `pnpm --filter @southneuhof/loom test -- src/resources/__tests__/resources.spec.ts` | all pass |
| Loom full tests | `pnpm --filter @southneuhof/loom test` | all pass |

## Scope

**In scope:**

- `packages/loom/src/resources/actionResource.ts` (record-aware `customAllows`/`run` for declared custom ops)
- `packages/loom/src/contracts/*` (only types needed to carry optional row context)
- `packages/loom/src/resources/__tests__/*` (new custom row-gating specs)
- `apps/web/src/framework/adapters/bundle.ts` (only the adapter branch needed for custom names; no app routes)

**Out of scope:**

- POS detail buttons and API enums. Fixtures only.
- New custom-action declaration options beyond what is needed to carry row identity. Prefer deriving from existing `run` args.
- Collection-level custom behavior change. Rows without an identifiable record must keep today's permission-only behavior.

## Git workflow

- Branch: `advisor/048-custom-record-actions`
- Commit per step. Match repo style.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Make custom can/run row-aware when the call identifies a row

Extend the custom path so when the caller supplies a row record or a row identity that resolves to a record with an `allowedOperations` array, the array must contain the custom action name in addition to permission passing. When no row is identifiable, keep permission-only behavior exactly.

Rules:

- Declared custom name not in array plus array present means deny for that row call.
- Array absent means permission-only, as today.
- Malformed array means deny for the row call, consistent with standard ops.
- `run` enforces the same check as `can` before invoking the callback.

Add specs modeled after `resources.spec.ts` with a `pay`-shaped custom action: permission passes but row without `'pay'` denies `can` and throws on `run`; row with `'pay'` allows; call with no row keeps permission behavior.

**Verify**: focused resource specs pass.

### Step 2: Align adapter for custom names without forking standard logic

Reuse the derived-action rule from plan 047. Custom names gate by row only when declared in the resource. Do not hard-code `pay` or `cancel` in Loom or the app adapter. Add adapter specs with a custom-named operation on a declared action versus an undeclared name.

**Verify**: Loom type-check plus full Loom tests pass; `grep -rn "'pay'" packages/loom/src` returns only specs and comments, no hard-coded product names.

## Test plan

- New specs: custom row allow, custom row deny by omission, custom run enforcement, no-row permission fallback, undeclared name ignored.
- Existing custom-action permission specs must pass unchanged.
- Full Loom suite must pass.

## Done criteria

- [ ] Type-check exits 0
- [ ] Full Loom tests pass with new custom row-gating cases
- [ ] No product-specific op names hard-coded outside specs
- [ ] No POS or API files modified
- [ ] `plans/README.md` row updated

## STOP conditions

- Excerpts do not match live code.
- Row identity cannot be derived from existing custom call args without a new required parameter that breaks all callers. Stop and propose the explicit record-context variant instead of improvising.
- Collection-level custom actions change behavior. They must not; stop and report.
- Fix needs POS page edits to prove. POS is fixture-only here.

## Maintenance notes

- Future custom workflow actions gain row gating automatically when declared. Reviewers should check that new custom actions declare the correct permission plus row entries, not manual page checks.
- Plan 049 adds the static gate and docs. Do not add docs here beyond code comments required for clarity.

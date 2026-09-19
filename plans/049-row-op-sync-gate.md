# Plan 049: Static gate and docs for row-op sync

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat b44b82b..HEAD -- scripts/module-ui-check.mjs packages/loom/src/resources docs/ui .agents/skills`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/047-derive-record-ops-from-actions.md, plans/048-custom-actions-row-gating.md
- **Category**: dx, tests, docs
- **Planned at**: commit `b44b82b`, 2026-09-19

## Why this matters

This is part 3 of the missing-View track. Plans 047 and 048 fix the runtime seam. Without a static gate, a future module can again declare a detail route while its row type omits `'detail'`, or declare `pay` while rows never carry it, and the UI will silently hide controls. This plan adds a build-time check plus short docs so the sync is proved without a browser. POS stays a fixture used to demonstrate the gate.

## Current state

Files and roles:

- `scripts/module-ui-check.mjs` — template binding check. Does not compare declared routes to row-op types.
- `docs/ui/surfaces.md` plus `.agents/skills/web-ui-surfaces/references/surfaces.md:124` — says to keep server row actions or `allowedOperations` as authority, without a checkable rule.
- Plans 031, 032, 042–044 — own route-name and parameter gates. Follow their pattern: fail builds on contract drift, not on style.
- POS fixture (read-only): resource declares `detail` plus `pay` plus `cancel`; row enum omits `'detail'`. The new gate should flag this fixture shape.

Conventions:

- Failing closed at runtime stays correct. This gate fails loudly at check time only for the declared-route versus row-type mismatch the author can decide explicitly.
- Intentional omission stays legal. The gate must offer an explicit opt-out such as a list-only declaration with no detail route, not an error for every missing entry.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tool tests | `pnpm test:module-tooling` or the tool test command for `module-ui-check` | all pass |
| Loom type-check | `pnpm --filter @southneuhof/loom type-check` | exit 0 |
| UI check demo | `node scripts/module-ui-check.mjs --sources 'apps/web/src/routes/(authenticated)/pos'` | flags fixture mismatch per new rule |

## Scope

**In scope:**

- `scripts/module-ui-check.mjs` plus its test (row-op sync rule)
- `docs/ui/*` and `.agents/skills/web-ui-surfaces/references/*` (short rule update only)
- One type-level or test-level assertion pattern for declared-route versus row-op coverage, placed where plans 031/032 place theirs

**Out of scope:**

- Runtime behavior change. Plans 047 and 048 own it.
- POS module fixes and API enum fixes. Fixtures only.
- New browser or E2E coverage.

## Git workflow

- Branch: `advisor/049-row-op-gate`
- Commit per step. Match repo style.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add row-op sync rule to the static check

Add one rule: when a resource declares a standard detail, update, or delete route, or a custom action consumed as a row control, its row type or fixture shape must be able to carry that op name, or the declaration must explicitly mark the surface as list-only or collection-only. Report `file:line`, resource key, declared route or action, and missing row op.

Cover: detail route without `'detail'` warns; update route without `'update'` warns; custom row control without its name warns; list-only resource with no detail declaration passes; collection-only custom action passes.

Add tool tests with minimal inline fixtures. Do not edit POS fixtures to green; the POS demo run should show the new flags.

**Verify**: tool tests pass; POS demo run flags the fixture as expected.

### Step 2: Document the authority rule in one place

Update `docs/ui/surfaces.md` or the surfaces skill reference with 5–8 lines: permission decides role access; row array decides this-row access when present; omission hides by design; `list` and `create` never gate by row; intentional omission needs an explicit list-only or collection-only declaration. Reference plans 047 and 048. No new vocabulary beyond `actions`, `allowedOperations`, and row versus collection.

**Verify**: skills validation or docs lint for touched paths passes, if the repo has it; otherwise type-check plus tool tests pass.

## Test plan

- Tool tests: five cases listed in step 1.
- Existing tool tests must pass.
- POS demo run is evidence of detection, not a fix.

## Done criteria

- [ ] Tool tests pass with new sync rule
- [ ] POS demo run flags the known fixture mismatch
- [ ] Docs updated in one place, no duplicate rule added elsewhere
- [ ] No runtime or POS files modified
- [ ] `plans/README.md` row updated

## STOP conditions

- Excerpts do not match live code.
- Rule cannot distinguish intentional list-only omission from accidental omission without large new declaration options. Stop and propose the smaller warning-only variant.
- Docs change requires skill-process changes beyond one reference. Stop and confirm scope.

## Maintenance notes

- Future resources with row controls must keep the row type in sync. Reviewers should check the gate output, not page code, for this property.
- If custom collection actions grow, keep their explicit collection-only marker. Do not gate them by row.

# Plan 047: Derive standard record ops from declared resource actions

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat b44b82b..HEAD -- packages/loom/src/resources/actionResource.ts packages/loom/src/contracts packages/loom/src/resources/__tests__/resources.spec.ts apps/web/src/framework/adapters/bundle.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: none (parallel with 045 and 046; required before 048 and 049)
- **Category**: architecture, correctness
- **Planned at**: commit `b44b82b`, 2026-09-19

## Why this matters

This is part 1 of the missing-View track. Today the web adapter hard-codes `RecordOperation = 'detail'|'update'|'delete'` while each resource declares its own action set. A valid workflow-shaped row such as `['update','pay','cancel']` silently removes View because `'detail'` is absent, even when the resource declares a detail route and permission. This plan removes the fixed triple as the authority and derives valid standard row ops from the declared resource actions. Omission stays legal for truly non-readable rows, but it becomes explicit per resource instead of accidental across layers. POS stays a fixture; no POS files change here.

## Current state

Files and roles:

- `apps/web/src/framework/adapters/bundle.ts:8,18` — app `RecordOperation` triple plus `allows` that short-circuits to the row array for those three ops.
- `packages/loom/src/resources/actionResource.ts:809,818` — `can` plus `detailTarget` and `updateTarget` that hide View or Edit when the check returns false.
- `packages/loom/src/components/views/ListView.vue:508` — renders View only when `detailRoute(record)` is defined.
- `apps/web/src/framework/adapters/bundle.spec.ts:12` — generic `['detail','delete']` example that sets the current expectation.
- POS fixture (read-only): `orders.entity.ts:73` enum lacks `'detail'`; `orders.service.ts:15` returns workflow-only arrays. Do not edit POS here.

Excerpts:

```ts
// apps/web/src/framework/adapters/bundle.ts:8
export type RecordOperation = 'detail' | 'update' | 'delete'
```

```ts
// apps/web/src/framework/adapters/bundle.ts:18
allows: ({ operation, permission, record }) => {
  const declared = record?.allowedOperations
  if ((recordOperation === 'detail' || recordOperation === 'update' || recordOperation === 'delete') && Array.isArray(declared)) {
    return recordAllows(record, recordOperation)
  }
  return allowsPermission(permission)
}
```

```ts
// packages/loom/src/resources/actionResource.ts:818
const detailTarget = detailDeclaration?.route ? (record) => can('detail', record, detailDeclaration) ? routeFor(...) : undefined : undefined
```

Conventions:

- Standard actions are `list`, `detail`, `create`, `update`, `delete`. Only `detail`, `update`, `delete` are ever row-scoped. `list` and `create` are collection ops and must never gate by row, even if a server array contains them.
- Missing detail route or denied permission already hides View by design. This plan preserves that. It changes only what counts as a valid row op name.
- Plans 034 and 035 already enforce action declarations and identities. Build on them; do not rework them.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Loom type-check | `pnpm --filter @southneuhof/loom type-check` | exit 0 |
| Loom resource tests | `pnpm --filter @southneuhof/loom test -- src/resources/__tests__/resources.spec.ts` | all pass |
| Loom full tests | `pnpm --filter @southneuhof/loom test` | all pass |
| Web adapter tests | `pnpm --filter @southneuhof/framework-web test -- src/framework/adapters/bundle.spec.ts` or repo equivalent | all pass |

## Scope

**In scope:**

- `packages/loom/src/resources/actionResource.ts` (derive valid standard row ops from declared actions; keep `list`/`create` out of row gating)
- `packages/loom/src/contracts/*` (only the operation-key types needed for derivation)
- `packages/loom/src/resources/__tests__/*` (new derivation specs)
- `apps/web/src/framework/adapters/bundle.ts` plus `bundle.spec.ts` (align app adapter to derived set; delete local triple as authority if replaced)

**Out of scope:**

- `apps/web/src/routes/(authenticated)/pos/**/*` and `apps/api/src/routes/(authenticated)/orders/**/*` — fixtures only.
- Custom `pay` and `cancel` row gating. That is plan 048.
- Cross-layer static check and docs. That is plan 049.
- New `delete` routes or permission strings. No product access change.

## Git workflow

- Branch: `advisor/047-record-ops-derived`
- Commit per step. Match repo style.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Derive standard row-op validity from declared actions

Change the validity test from a fixed triple to declared-action membership. A standard operation is row-gateable only when the resource declares that standard action. `list` and `create` are never row-gateable. When the row has no array, fall back to permission as today. When the row has a malformed non-array value, deny as today (`bundle.spec.ts:40`).

Keep behavior for existing callers with no array identical. Keep hiding semantics identical; only the set of names considered for row gating changes from fixed to derived.

Add Loom resource specs modeled after `resources.spec.ts`: resource with detail plus update shows `detailRoute` for a row whose array contains `'detail'`; row without `'detail'` yields undefined `detailRoute` while `updateRoute` still resolves when its own entry exists; resource without a detail declaration never yields `detailRoute` even when the array contains the string.

**Verify**: focused resource specs pass; existing resource specs pass.

### Step 2: Align app adapter and preserve collection-op fallback

Update `bundle.ts` to use the same derived rule. Delete the local triple as the authority if it is replaced by the derived check; otherwise narrow it to a deprecated alias with no new callers. Preserve `allowsPermission` fallback and malformed-array denial. Extend `bundle.spec.ts` with orders-shaped rows (`['update','pay','cancel']` without `'detail'` hides View by explicit omission, not by accident) plus collection ops ignoring row arrays.

**Verify**: web adapter specs pass; Loom type-check passes; `grep -rn "RecordOperation" apps/web/src/framework packages/loom/src` shows only the new derived source plus specs.

## Test plan

- New Loom specs: derived detail/update/delete validity, list/create never row-gated, undeclared op ignored even when present in array.
- Extended `bundle.spec.ts`: orders-shaped omission case, malformed array case preserved.
- Full Loom plus adapter suites must pass.

## Done criteria

- [ ] Type-check exits 0 for touched packages
- [ ] Full Loom tests plus adapter specs pass, including new derivation cases
- [ ] No POS or API files modified
- [ ] Old fixed-triple authority removed or isolated to one deprecated export with no new callers
- [ ] `plans/README.md` row updated

## STOP conditions

- Excerpts do not match live code.
- Derivation requires changing public `ListView` slot semantics or route shapes. Stop; that is out of scope.
- Existing modules without row arrays change behavior. They must not; stop and report.
- Fix needs API enum changes to prove. API work is out of scope here by design; record it for the API-side plan if one is later authorized.

## Maintenance notes

- Future standard actions automatically gain correct row semantics. Reviewers should check that no new fixed list of op names is reintroduced.
- Custom ops remain plan 048. Do not gate `pay` or `cancel` in this plan.

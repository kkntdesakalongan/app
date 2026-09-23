# Plan 054: Bind resource operations to complete primitive and View bags

> Read architecture §§1, 6, 7.2, and 10. Run drift check, follow the steps, and update row 054 after review. Do not commit or push unless asked.
>
> **Drift check:** `git diff --stat 40afee2..HEAD -- packages/loom/src/resources packages/loom/src/components/views packages/loom/src/query packages/loom/src/adapters`. Compare the excerpts. Stop if operation ownership changed.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** HIGH; **Depends on:** 052, 053; **Category:** migration; **Planned at:** `40afee2`, 2026-09-23.

## Why this matters

The current two-argument resource receives an aggregate schema and standard actions under `actions`. Its list/create members are factories, and FormView accepts two prop shapes. The target makes operation-local surfaces explicit and lets callers extract the exact primitive prop bag.

## Current state

- `packages/loom/src/resources/defineResource.ts:25-44` takes `(schema, definition)` and delegates to `defineActionResource`.
- `packages/loom/src/resources/actionResource.ts:429-459` exposes `actions` and list/create factories; `actionResource.ts:877-882` resolves field references at resource binding time.
- `packages/loom/src/components/views/FormView.vue:21-82` accepts both `formProps` and flat action props and converts `run` to `submit`.
- Route metadata and permission registration live in `resources/routeAccess.ts`; identity validation is in `resources/identity.ts`. Keep both behaviors. `DESIGN.md:29-39` assigns headers to Views, not primitives.

Current delegation (`resources/defineResource.ts:43-45`):

```ts
): ActionResource<TSchema, TActions> {
  return defineActionResource(schema, definition)
}
```

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Loom types | `pnpm --filter @southneuhof/loom type-check` | new resource/view files clean; dependent callers logged |
| Loom tests | `pnpm --filter @southneuhof/loom test` | resource, query, route, and View suites pass |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | resource extraction parity passes |

## Scope

**In:** `packages/loom/src/resources/{defineResource,bindResource,operations,runtime,identity,routeAccess,index}.ts`, `components/views/{FormView,ListView,DetailView}.vue` and their directly used helpers/types, query integration only where resource binding requires it, related tests/type fixtures.

**Out:** app declarations/routes, backend authorization/transport, core surface session/display implementations. Do not preserve the old `actionResource.ts` API in a new wrapper; Plan 058 deletes it after migration.

## Git workflow

Continue on `advisor/resource-surface-overhaul` after Plans 052-053. Do not ship an intermediate state. Do not commit or push unless asked.

## Steps

1. Implement one-object `defineResource({ key, identity, list, create, detail, update, delete, actions })`. Standard list/create return stable static page bags; detail/update bind identity and return page bags; every bag contains a complete `table`, `form`, or `detail` primitive bag. Keep custom commands in `actions`. **Verify:** `pnpm --filter @southneuhof/loom type-check` checks the new included fixture; expected errors cover two arguments, standard actions under `actions`, absent operations, and bad route/identity values. Log unrelated old caller errors.
2. Bind permission, identity, row policy, route metadata, guarded load/mutation, and cache invalidation to each extracted primitive function. Preserve query namespace/search parameters and record cache keys. A component-level submit override replaces the guarded function, so document that policy implication in tests. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/resources/__tests__/resources.spec.ts src/resources/__tests__/recordOperations.spec.ts src/resources/__tests__/customRecordOperations.spec.ts --environment jsdom` exits 0; denied calls dispatch zero, allowed calls once.
3. Change FormView, ListView, and DetailView to accept only nested complete primitive bags plus page metadata. Keep navigation, toasts, dirty-page guards, filters, collection slots, exports, and record controls in the shells. Remove runtime conversion from flat actions/`formProps`. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/components/views/__tests__/views.spec.ts src/components/views/__tests__/resource-cache.spec.ts --environment jsdom` exits 0; included type negatives reject old flat bags.
4. Test a resource with update but no visible detail operation: `update.form.load` owns the technical read mapping. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/resources/__tests__/resources.spec.ts --environment jsdom` exits 0 with a named update-only case and no registered detail page.

## Test plan and done criteria

- Use existing resource/route tests as setup patterns, and add extraction tests for direct `<Form>`, `<Table>`, `<Detail>` bags.
- [ ] No new resource code imports field defaults or input hydration.
- [ ] Every standard operation returns the target shape and enforces policy at extraction.
- [ ] Current route names, permissions, row policies, query keys, and invalidation are preserved.
- [ ] `git diff --check` exits 0; unmigrated app errors are listed.

## STOP conditions

- A declared action cannot be represented without changing its backend envelope or server authorization.
- A typed route/identity case needs a public `any` or unsafe cast.
- Preserving a View feature would require a second form session or a legacy flat prop path.

## Maintenance notes

Review guard placement on the extracted loader/function, not only the View. Route navigation remains the shell's job. Keep the bounded memoization behavior if identity-bound bags still need it.

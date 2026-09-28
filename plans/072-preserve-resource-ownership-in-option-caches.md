# Plan 072: Preserve resource ownership in option caches

## Status and intent

- Status: DONE. Priority: P1. Effort: M. Risk: MED. Confidence: HIGH.
- Category: correctness / ownership. Depends on: none. Run serially with input contract Plan 070; recommended after it.
- Planned at: `1246387`, 2026-09-26.

A relation picker that uses a resource loader must refresh when that resource changes. Authors should declare the source owner once, not know a private cache key or arrange manual picker refreshes. Keep query execution in Loom, selection behavior in each control, and resource invalidation in the resource layer.

## Baseline evidence

Before this change, `packages/loom/src/components/inputs/useOptionSource.ts:20` constructed `['option-source', namespace, stableValue(searchParameters)]`. `packages/loom/src/query/client.ts:44` invalidated resource-prefixed entries only. The users create form at `apps/web/src/routes/(authenticated)/settings/users/users.resource.ts:41` passed `roles.list.table.load` and its namespace into a checkbox group, but resource ownership could not be supplied. An in-memory probe using the actual invalidator marked the roles list invalid and left the roles option entry valid.

The baseline `components/inputs/__tests__/option-source.spec.ts` manually invalidated a private option key. That proved selection behavior during refresh, not resource-to-option invalidation. The final regression uses mounted inputs and resource invalidation.

## Scope and target contract

Change `packages/loom/src/components/inputs/useOptionSource.ts`, `SelectInput.vue`, `RadioGroupInput.vue`, `CheckboxGroupInput.vue`, their existing prop/model type owners if necessary, `query/keys.ts`, `query/client.ts`, and their focused tests. Migrate direct resource-backed option declarations under `apps/web/src/routes/`; inventory exact paths first. Update the option-source rule in the current architecture and the relevant existing form guidance. Do not change resource write logic, transport, option value conversion, or selection retention policy.

1. Add optional `resource: string` to option source props and expose it on all three controls. A resource-backed caller supplies `resource: roles.list.table.resource` beside the existing load and namespace. Independent loaders may omit it. No function introspection, loader marker, source registry, or adapter wrapper.
2. Use a distinct resource-owned option key family, structurally `['resource', resource, 'options', namespace, stableValue(searchParameters)]`. Keep this separate from collection result keys: option loaders also accept arrays, so sharing an exact list key can mix incompatible result shapes. Keep standalone option sources in their existing family.
3. Whole-resource invalidation includes option entries by prefix. Record invalidation must invalidate that resource's options as well as its collections and target record. Updating one record can change picker labels, membership, or sorting. Never invalidate another resource's options.
4. Carry resource through `externalContext` and each control's existing context comparison. A source-owner change uses the existing external-context change behavior. A refresh of the same owner must not be misclassified as a parent change or clear a valid remote selection. Preserve cancellation and dependent search parameters.
5. Use the declared namespace where supplied; retain instance isolation where absent. Resource and namespace have separate meanings: invalidation owner versus query instance. Do not infer the resource from a namespace string.

## Execution rules

This approved plan is implemented. The procedure below records its execution requirements. Read root AGENTS, the current resource architecture, and `test-audit` before source/test edits. Use the applicable web skill for app changes. Read this entire plan. Preserve existing local work; record `git status --short` before editing. Add no implementation comments, compatibility aliases, broad type suppressions, unrelated formatting, installs, commits, pushes, migrations, or seeds.

Run the drift command first. Compare changed owners with the excerpts below and reconcile approved predecessor changes. Stop on incompatible drift, an out-of-scope requirement, or two failed bounded correction attempts. Do not weaken a contract to make a check pass. Record command, exit status, and actual selected tests in this plan; update the index after review. The local test skill references unavailable OpenClaw tools: report those as unavailable rather than successful checks. App type checks can generate route artifacts; preserve unrelated work.

## Commands

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/components/inputs packages/loom/src/query apps/web/src/routes` | Reconcile owner changes |
| Inventory | `rg -n 'useOptionSource|load: .*list.table.load|namespace: .*list.table.namespace' packages/loom/src apps/web/src` | Record all direct source declarations |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Behavior | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/inputs/__tests__/option-source.spec.ts src/query/__tests__` | All pass |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |

## Ordered steps and proof

1. Run Drift, Inventory, Types, and Behavior. Record baseline failures and all affected declarations. Inspect the control context comparisons before editing. No inferred source ownership is allowed.
2. Add the explicit prop and distinct key family, then update resource invalidation. Run Types and Behavior. Keep primitive/cache interfaces independent of app resources.
3. Extend the mounted option test with actual resource invalidation and the actual query client. First demonstrate the regression with the old key owner. Cover whole-resource and keyed invalidation, another resource remaining untouched, same-owner selection retention, and an owner change with otherwise identical parameters. Pair controlled data and standalone-loader cases to ensure they keep their behavior. Run Behavior; no network or private-key invalidation may substitute for the resource call in the regression.
4. Migrate callers and document the one explicit ownership prop. Run Types, Behavior, App, Architecture, and `git diff --check`. Review the inventory against all migrated source declarations.

## Done and stop conditions

- [x] A resource invalidation refreshes active owned pickers; inactive entries refresh on their next use.
- [x] Other resources and controlled inputs are unaffected; selection policy is unchanged.
- [x] Resource ownership is represented in source context comparisons and actual component props.
- [x] All available gates pass and no app code authors private option keys.

Stop if a direct loader's resource owner cannot be established, if the fix needs model-shape conversion, or if shared result shapes would collide. Future option data sources must declare their owner when they participate in resource invalidation.

## Evidence

Before edits, Loom types exited 0 and the selected behavior command passed 42 tests in 4 files. The baseline drift command `git diff --stat 1246387..HEAD -- packages/loom/src/components/inputs packages/loom/src/query apps/web/src/routes` exited 0 with no committed changes in the scoped owners. Those owners also had no pre-existing worktree edits. The inventory command `rg -n 'useOptionSource|load: .*list.table.load|namespace: .*list.table.namespace' packages/loom/src apps/web/src` exited 0 and found one direct resource-backed option declaration in the users form; it now passes `roles.list.table.resource`. No other app declarations needed migration.

The two new mounted regressions failed before the implementation: resource invalidation did not reload owned options, and an owner change did not clear the three controls' remote selections. The final gates passed:

| Gate | Command | Result |
|---|---|---|
| Pre-fix regression | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/inputs/__tests__/option-source.spec.ts` | Exit 1 as expected; both new cases failed because resource invalidation did not reload options and owner changes did not change selection context |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Behavior | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/inputs/__tests__/option-source.spec.ts src/query/__tests__` | Exit 0; 45 tests in 4 files after the namespace-removal regression |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0; 18 checks passed |
| Whitespace | `git diff --check` | Exit 0 |

The mounted test uses the real query client and resource invalidator. It covers whole-resource and keyed invalidation, inactive option entries, a separate resource, a standalone loader, controlled data, same-owner selection retention, and owner changes in SelectInput, RadioGroupInput, and CheckboxGroupInput. The active form guidance and current architecture now describe the resource owner and namespace roles. The pending repair row for this plan is removed.

The test-audit skill refers to `$openclaw-testing`, `$crabbox`, `$autoreview`, `scripts/run-vitest.mjs`, and `scripts/check-changed.mjs`. These tools and scripts are unavailable in this checkout. Prettier is also unavailable, so its formatter check did not run. No autoreview ran. The plan's listed pnpm gates ran directly, and `git diff --check` passed.

The mounted namespace-removal regression exposed a fallback identity bug: after removing an authored namespace, the source reused that old shared namespace and did not load under its per-instance key. `useOptionSource` now always creates the instance fallback and selects the current authored namespace only when it builds the query key. The focused test failed before the fix and passed after it. The full behavior suite then passed 45 tests in 4 files; Loom types and web types passed again.

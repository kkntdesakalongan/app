# Plan 072: Preserve resource ownership in option caches

## Status and intent

- Status: TODO. Priority: P1. Effort: M. Risk: MED. Confidence: HIGH.
- Category: correctness / ownership. Depends on: none. Run serially with input contract Plan 070; recommended after it.
- Planned at: `1246387`, 2026-09-26.

A relation picker that uses a resource loader must refresh when that resource changes. Authors should declare the source owner once, not know a private cache key or arrange manual picker refreshes. Keep query execution in Loom, selection behavior in each control, and resource invalidation in the resource layer.

## Current evidence

`packages/loom/src/components/inputs/useOptionSource.ts:20` constructs `['option-source', namespace, stableValue(searchParameters)]`. `packages/loom/src/query/client.ts:44` invalidates resource-prefixed entries only. The users create form at `apps/web/src/routes/(authenticated)/settings/users/users.resource.ts:41` passes `roles.list.table.load` and its namespace into a checkbox group, but resource ownership cannot be supplied. An in-memory probe using the actual invalidator marked the roles list invalid and left the roles option entry valid.

Existing `components/inputs/__tests__/option-source.spec.ts` manually invalidates an option key. That proves selection behavior during refresh, not resource-to-option invalidation. Extend this test owner with the missing integration boundary.

## Scope and target contract

Change `packages/loom/src/components/inputs/useOptionSource.ts`, `SelectInput.vue`, `RadioGroupInput.vue`, `CheckboxGroupInput.vue`, their existing prop/model type owners if necessary, `query/keys.ts`, `query/client.ts`, and their focused tests. Migrate direct resource-backed option declarations under `apps/web/src/routes/`; inventory exact paths first. Update the option-source rule in the current architecture and the relevant existing form guidance. Do not change resource write logic, transport, option value conversion, or selection retention policy.

1. Add optional `resource: string` to option source props and expose it on all three controls. A resource-backed caller supplies `resource: roles.list.table.resource` beside the existing load and namespace. Independent loaders may omit it. No function introspection, loader marker, source registry, or adapter wrapper.
2. Use a distinct resource-owned option key family, structurally `['resource', resource, 'options', namespace, stableValue(searchParameters)]`. Keep this separate from collection result keys: option loaders also accept arrays, so sharing an exact list key can mix incompatible result shapes. Keep standalone option sources in their existing family.
3. Whole-resource invalidation includes option entries by prefix. Record invalidation must invalidate that resource's options as well as its collections and target record. Updating one record can change picker labels, membership, or sorting. Never invalidate another resource's options.
4. Carry resource through `externalContext` and each control's existing context comparison. A source-owner change uses the existing external-context change behavior. A refresh of the same owner must not be misclassified as a parent change or clear a valid remote selection. Preserve cancellation and dependent search parameters.
5. Use the declared namespace where supplied; retain instance isolation where absent. Resource and namespace have separate meanings: invalidation owner versus query instance. Do not infer the resource from a namespace string.

## Execution rules

This is an approved plan, not completed implementation. Read root AGENTS, the current resource architecture, and `test-audit` before source/test edits. Use the applicable web skill for app changes. Read this entire plan. Preserve existing local work; record `git status --short` before editing. Add no implementation comments, compatibility aliases, broad type suppressions, unrelated formatting, installs, commits, pushes, migrations, or seeds.

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

- [ ] A bound resource write/invalidation refreshes active owned pickers; inactive entries become stale for their next use.
- [ ] Other resources and controlled inputs are unaffected; selection policy is unchanged.
- [ ] Resource ownership is represented in source context comparisons and actual component props.
- [ ] All gates pass and no app code authors private option keys.

Stop if a direct loader's resource owner cannot be established, if the fix needs model-shape conversion, or if shared result shapes would collide. Future option data sources must declare their owner when they participate in resource invalidation.

## Evidence

Planning only. The cache-prefix mismatch was reproduced with the actual invalidator. Mounted repair tests and app checks remain unrun.

# Plan 074: Preserve resource policy at the route boundary

## Status and intent

- Status: DONE — implementation and repository gates pass; root review accepted. Priority: P1. Effort: M. Risk: MED. Confidence: HIGH.
- Category: correctness / policy ownership. Depends on root Plan 064 for public diagnostic cases if new declaration constraints need them.
- Planned at: `1246387`, 2026-09-26.

A route guard must preserve the access policy registered by its resource. Keep backend authorization final and operation execution independently guarded. Route entry has no business payload or loaded row; do not pretend that it can run argument-dependent command policy.

## Baseline evidence

At plan preparation, `packages/loom/src/resources/bindResource.ts:444` registered static permission arrays as `permissions` with singular `permission: null`. `apps/web/src/router/guards.ts:16` read only the singular value and sent `operation: 'detail'` for every resource action. The actual guard admitted an array-protected route with no permissions in an in-memory probe. `resources/routeAccess.ts` stored two overlapping permission fields and its duplicate check did not compare resource keys.

## Scope and target decisions

Change `packages/loom/src/resources/routeAccess.ts`, `bindResource.ts`, `operations.ts`, their public exports where necessary, `resources/__tests__/boundResource.spec.ts`, the existing resource action type fixtures, and `apps/web/src/router/guards.ts` plus `router/__tests__/guards.spec.ts`. Update only corresponding access rules/examples in the architecture and existing web guidance. Migrate direct registration callers/tests discovered by a repository search. No backend or navigation-manifest redesign, global runtime rewrite, new authorization service, or change to row execution rules.

1. Give a registered route one normalized static requirement: a readonly list of permission codes (empty means explicit public entry), plus the existing resource key and actual operation name. Remove the ambiguous singular/array pair. Validate nonempty codes; copy values so a declaration cannot mutate registration later.
2. Put route requirement evaluation beside the route registry. It calls the supplied access adapter for each required permission with the registered operation. For an empty list, still evaluate the operation with null permission. The app guard consumes this evaluation and keeps existing denied-route fallback behavior. Extraordinary route metadata keeps its current separate path.
3. Static command permissions derive route requirements automatically. Add `routePermission` only for routed commands whose execution `permission` is argument-dependent. Static routed commands derive entry requirements and must not accept an independent override. Non-routed commands must not accept route-only policy. It accepts string, readonly nonempty string array, or null. This is one necessary boundary distinction, not a second permission field for every action. A routed command with argument-dependent `permission` must supply it; reject the missing case at declaration/type and runtime boundaries. Do not invoke the business permission callback with missing/fabricated arguments. Non-routed dynamic commands need no new property. Strip this declaration metadata from runtime UI prop bags.
4. The explicit route rule governs only entry. `can` and `run` still evaluate current command arguments, row policy, and execution permissions. Do not weaken execution because the route was allowed. No row visibility claim is made before a row is available.
5. Duplicate route registration must compare resource key, operation, and normalized permission set. Identical registration is idempotent; conflicting ownership throws. Treat static arrays as sets for equivalent order, not different policy.

## Execution rules

This plan is approved and implemented. Keep its scope and evidence rules for review. Read root AGENTS, the current resource architecture, and `test-audit` before source/test edits. Use the applicable web skill for app changes. Read this entire plan. Preserve existing local work; record `git status --short` before editing. Add no implementation comments, compatibility aliases, broad type suppressions, unrelated formatting, installs, commits, pushes, migrations, or seeds.

Run the drift command first. Compare changed owners with the excerpts below and reconcile approved predecessor changes. Stop on incompatible drift, an out-of-scope requirement, or two failed bounded correction attempts. Do not weaken a contract to make a check pass. Record command, exit status, and actual selected tests in this plan; update the index after review. The local test skill references unavailable OpenClaw tools: report those as unavailable rather than successful checks. App type checks can generate route artifacts; preserve unrelated work.

## Commands and steps

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/resources apps/web/src/router docs/resource_system_overhaul/ARCHITECTURE.md` | Reconcile changes |
| Callers | `rg -n 'registerResourceAction|resourceActionForRoute|RegisteredResourceAction' packages/loom/src apps/web/src` | Inventory direct consumers |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Resource | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/resources/__tests__/boundResource.spec.ts` | All pass |
| Guard | `pnpm --filter @southneuhof/framework-web test:focused -- router/__tests__/guards.spec.ts` | All pass |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0 after 064 |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |

1. Run Drift, Callers, Types, Resource, and Guard. Record baseline failures. Inspect current registration before choosing the exact normalized type name. Locate all routed dynamic commands and specify their entry permission explicitly from existing policy; stop if this needs an unresolved business decision.
2. Change registry and binder together, then the app guard. Add the explicit dynamic-command entry rule and declaration checks. Run Types, Resource, and Guard. Keep public error messages specific to the resource, action, and missing route rule.
3. Extend the real guard test: deny when neither or only one array permission is granted; allow when both are granted; pass the actual custom/standard operation; evaluate explicit null; preserve extraordinary routes. Resource tests cover dynamic permission not called during registration/entry, unchanged execution enforcement, and duplicate registration ownership. Run Resource and Guard. Use valid paired controls; do not test only a private predicate.
4. Extend existing public diagnostic cases for a routed dynamic command missing its entry rule, with a valid paired declaration. Run Types and Diagnostics. Update active guidance with static-default and dynamic-explicit examples.
5. Run all gates, `pnpm test:surface-architecture`, and `git diff --check`. Record evidence and update the index after review.

## Done and stops

- [x] Route entry checks all declared static permissions and the actual operation.
- [x] Dynamic execution policy is never guessed at the route boundary.
- [x] Execution guards and backend authority are unchanged.
- [x] Conflicting resource ownership cannot overwrite a registration.
- [x] All plan gates pass and no consumer reconstructs the former singular/array rule.

Stop if the change requires loading a record before ordinary route entry or guessing permission from route names. Those are different product decisions. Future route consumers must use the canonical evaluator, not reinterpret its stored fields.

## Evidence

The permission-array omission was reproduced in the actual guard with a controlled adapter. This was not a backend authorization test.

Implementation completed on 2026-09-27. The registry now stores one immutable route requirement with a resource key, operation, and normalized permission set. The app guard uses its evaluator. Static commands derive entry policy from `permission`; routed commands with argument-dependent permission callbacks declare `routePermission`. The execution callback still receives only the declared command arguments. Current app resources have no routed dynamic command: the role-permission command uses a callback without a route, and the role-assignment command uses a static array without a route. No product entry policy needed to be inferred.

| Gate | Command | Result |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/resources apps/web/src/router docs/resource_system_overhaul/ARCHITECTURE.md` | Exit 0; no committed drift between the preparation base and `HEAD`. The recorded working tree had local changes in these owners, which were preserved. |
| Callers | `rg -n 'registerResourceAction|resourceActionForRoute|RegisteredResourceAction' packages/loom/src apps/web/src` | Exit 1; no obsolete registration API remains. Resource binding is the only route registration owner. |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0. |
| Resource | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/resources/__tests__/boundResource.spec.ts` | Exit 0; 1 file, 18 tests passed. |
| Guard | `pnpm --filter @southneuhof/framework-web test:focused -- router/__tests__/guards.spec.ts` | Exit 0; 1 file, 17 tests passed. |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0; 27 resource/form cases, 9 TypeScript surface cases, and 8 Vue surface cases passed. |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0. Route type generation did not change tracked route files. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; 18 tests passed and surface checks passed. |
| Whitespace | `git diff --check` | Exit 0. |
| Formatting | `pnpm --filter @southneuhof/framework-web exec oxfmt --check src/router/guards.ts src/router/__tests__/guards.spec.ts`<br>`pnpm --filter @southneuhof/framework-web exec oxfmt --check /Users/gamer/Documents/projects/carta/packages/loom/src/resources/routeAccess.ts /Users/gamer/Documents/projects/carta/packages/loom/src/resources/index.ts` | Exit 0 for both commands. |

The first resource test run failed on three existing invalidation assertions. Current Plan 072 behavior also invalidates the resource option namespace. The assertions now include that namespace and the final resource run passes; no cache behavior changed for Plan 074.

A broader optional `oxfmt --check` also reported formatting differences in files already changed by predecessor plans: the resource binder, operations types, resource tests, diagnostics harness, and type fixture. Applying its output would reformat unrelated local changes, so those files remain unchanged by formatting.

Post-review cleanup on 2026-09-27 removed the unused `registeredResourceActionNames()` function and export. The updated caller search returned exit 1 with no obsolete API matches. The Loom type check, focused resource test (18 tests), app guard test (17 tests), and `git diff --check` passed again.

The integrated Web suite exposed a nested-navigation fixture that registered the same routes under two resource keys. Both scoped instances now use one resource key while keeping distinct `userId` parameters, so the navigation test still checks parent scoping and the registry keeps its ownership check. A search of router tests found no other fixture registering these route names. Focused nested-navigation (4 tests), guard (17 tests), Web type check, and whitespace checks pass. The integrated Web run also reported three unrelated startup failures because `localStorage` is undefined under Node 26; those failures are outside this route-policy change.

The local test-audit references to `node scripts/run-vitest.mjs`, OpenClaw, crabbox, and autoreview tools were unavailable in this checkout and tool set. The plan commands above ran directly; these unavailable workflows are not marked as passed.

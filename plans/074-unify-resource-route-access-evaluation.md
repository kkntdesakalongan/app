# Plan 074: Preserve resource policy at the route boundary

## Status and intent

- Status: TODO. Priority: P1. Effort: M. Risk: MED. Confidence: HIGH.
- Category: correctness / policy ownership. Depends on root Plan 064 for public diagnostic cases if new declaration constraints need them.
- Planned at: `1246387`, 2026-09-26.

A route guard must preserve the access policy registered by its resource. Keep backend authorization final and operation execution independently guarded. Route entry has no business payload or loaded row; do not pretend that it can run argument-dependent command policy.

## Current evidence

`packages/loom/src/resources/bindResource.ts:444` registers static permission arrays as `permissions` with singular `permission: null`. `apps/web/src/router/guards.ts:16` reads only the singular value and sends `operation: 'detail'` for every resource action. The actual guard admitted an array-protected route with no permissions in an in-memory probe. `resources/routeAccess.ts` stores two overlapping permission fields and its duplicate check does not compare resource keys.

## Scope and target decisions

Change `packages/loom/src/resources/routeAccess.ts`, `bindResource.ts`, `operations.ts`, their public exports where necessary, `resources/__tests__/boundResource.spec.ts`, the existing resource action type fixtures, and `apps/web/src/router/guards.ts` plus `router/__tests__/guards.spec.ts`. Update only corresponding access rules/examples in the architecture and existing web guidance. Migrate direct registration callers/tests discovered by a repository search. No backend or navigation-manifest redesign, global runtime rewrite, new authorization service, or change to row execution rules.

1. Give a registered route one normalized static requirement: a readonly list of permission codes (empty means explicit public entry), plus the existing resource key and actual operation name. Remove the ambiguous singular/array pair. Validate nonempty codes; copy values so a declaration cannot mutate registration later.
2. Put route requirement evaluation beside the route registry. It calls the supplied access adapter for each required permission with the registered operation. For an empty list, still evaluate the operation with null permission. The app guard consumes this evaluation and keeps existing denied-route fallback behavior. Extraordinary route metadata keeps its current separate path.
3. Static command permissions derive route requirements automatically. Add `routePermission` only for routed commands whose execution `permission` is argument-dependent. Static routed commands derive entry requirements and must not accept an independent override. Non-routed commands must not accept route-only policy. It accepts string, readonly nonempty string array, or null. This is one necessary boundary distinction, not a second permission field for every action. A routed command with argument-dependent `permission` must supply it; reject the missing case at declaration/type and runtime boundaries. Do not invoke the business permission callback with missing/fabricated arguments. Non-routed dynamic commands need no new property. Strip this declaration metadata from runtime UI prop bags.
4. The explicit route rule governs only entry. `can` and `run` still evaluate current command arguments, row policy, and execution permissions. Do not weaken execution because the route was allowed. No row visibility claim is made before a row is available.
5. Duplicate route registration must compare resource key, operation, and normalized permission set. Identical registration is idempotent; conflicting ownership throws. Treat static arrays as sets for equivalent order, not different policy.

## Execution rules

This is an approved plan, not completed implementation. Read root AGENTS, the current resource architecture, and `test-audit` before source/test edits. Use the applicable web skill for app changes. Read this entire plan. Preserve existing local work; record `git status --short` before editing. Add no implementation comments, compatibility aliases, broad type suppressions, unrelated formatting, installs, commits, pushes, migrations, or seeds.

Run the drift command first. Compare changed owners with the excerpts below and reconcile approved predecessor changes. Stop on incompatible drift, an out-of-scope requirement, or two failed bounded correction attempts. Do not weaken a contract to make a check pass. Record command, exit status, and actual selected tests in this plan; update the index after review. The local test skill references unavailable OpenClaw tools: report those as unavailable rather than successful checks. App type checks can generate route artifacts; preserve unrelated work.

## Commands and steps

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/resources apps/web/src/router docs/resource_system_overhaul/ARCHITECTURE.md` | Reconcile changes |
| Callers | `rg -n 'registerResourceAction|resourceActionForRoute|RegisteredResourceAction|registeredResourceActionNames' packages/loom/src apps/web/src` | Inventory direct consumers |
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

- [ ] Route entry checks all declared static permissions and the actual operation.
- [ ] Dynamic execution policy is never guessed at the route boundary.
- [ ] Execution guards and backend authority are unchanged.
- [ ] Conflicting resource ownership cannot overwrite a registration.
- [ ] All checks pass and no consumer reconstructs the former singular/array rule.

Stop if the change requires loading a record before ordinary route entry or guessing permission from route names. Those are different product decisions. Future route consumers must use the canonical evaluator, not reinterpret its stored fields.

## Evidence

Planning only. The permission-array omission was reproduced in the actual guard with a controlled adapter. This was not a backend authorization test.

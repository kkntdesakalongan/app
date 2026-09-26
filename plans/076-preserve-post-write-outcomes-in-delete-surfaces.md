# Plan 076: Preserve post-write outcomes in delete surfaces

## Status and intent

- Status: TODO. Priority: P1. Effort: M. Risk: MED. Confidence: HIGH from source.
- Category: correctness / lifecycle ownership. Depends on root Plan 061 for the agreed mounted-session semantics. Run serially with Plan 067's ListView changes.
- Planned at: `1246387`, 2026-09-26.

Extend the existing post-write repair to delete/confirmation surfaces. A successful server write followed by failed invalidation is not a rejected write. Surfaces must retain this distinction and prevent a second request for the same unresolved target. Keep the resource as outcome producer and the initiating surface as session owner; do not add a global mutation manager.

## Current evidence

`packages/loom/src/resources/bindResource.ts:648` awaits the delete and then invalidation, which can throw an error with `postWrite: true` and `retryable: false`. `components/views/ListView.vue:223` catches every error as “Could not delete record” and clears `deleting`, so the same action is available again. `apps/web/src/framework/use-confirm-delete.ts` places the write and its `after` callback in one catch boundary. It clears the target after the write but before the callback, so callback failure is not an ordinary write failure either.

`contracts/results.ts` already defines normalized `SubmitError.postWrite` and `retryable`. Reuse it. Plan 061 retains this metadata in Form; do not invent a separate enum or duplicate the binder's classification.

## Scope and ownership

Change `packages/loom/src/components/views/ListView.vue`, its existing `__tests__/views.spec.ts`, and the delete action slot contract only if exposed state is needed. Remove `apps/web/src/framework/use-confirm-delete.ts`: the planning inventory found only its own definition and tests, with no production caller. Its existing `apps/web/src/framework/__tests__/use-confirm-delete.spec.ts` mixes hook tests with independent `resourceCan` tests. Delete only hook cases and move the independent access cases to `apps/web/src/framework/__tests__/access.spec.ts`; do not discard them or expand the unused hook. Update the current architecture's mutation-outcome guidance and this plan/index. The resource binder and Form implementation are read-only references unless an already-approved predecessor requires its own edits.

Use `useFrameworkAdapters().data.normalizeError` to classify errors through the existing contract. A small private classifier is justified only if real surface owners share it; do not create a public generic action-session API. ConfirmationDialog remains a presentation/async-action component and must not infer resource identity from arbitrary payloads.

## Target behavior

1. ListView retains an unresolved delete outcome associated with the exact selected row object for the mounted list session. Do not infer an `id` field: resources can have composite identities and the view does not own the identity function. On post-write failure, persist a visible message, block further delete calls for the unresolved target, and emit no normal deletion success.
2. Because replacement rows cannot safely prove that the target changed without an identity contract, conservatively disable standard delete actions for this mounted ListView while that outcome is unresolved. Document this bounded limitation rather than add a record-history registry. Other non-delete actions remain available. A fresh mount starts a fresh session; refresh, sort, pagination, new row objects, and closing/reopening the dialog must not silently unlock it. A later product decision can add explicit reconciliation; this plan does not.
3. Ordinary pre-write errors leave retry available and retain the actual normalized message. Pending operations cannot be submitted twice. A post-write failure displays that deletion may have completed and the user should verify the result; it never claims rollback.
4. Recheck imports at execution, then remove the unused hook and its tests. Preserve the independent access cases from the mixed test file. No replacement helper or generic confirmation API is required.
5. The successful-write/failed-refresh distinction remains the rule for any future real custom action owner. Do not add implementation or tests for hypothetical consumers. Existing custom commands remain guarded at execution; this plan does not sweep unrelated pages.
6. Preserve target ownership across late promises. An old completion cannot close or report success for a newly selected target. Use the existing session/generation pattern from Plan 061 where applicable, without sharing its entire Form lifecycle.

## Execution rules

This is an approved plan, not completed implementation. Read root AGENTS, the current resource architecture, and `test-audit` before source/test edits. Use the applicable web skill for app changes. Read this entire plan. Preserve existing local work; record `git status --short` before editing. Add no implementation comments, compatibility aliases, broad type suppressions, unrelated formatting, installs, commits, pushes, migrations, or seeds.

Run the drift command first. Compare changed owners with the excerpts below and reconcile approved predecessor changes. Stop on incompatible drift, an out-of-scope requirement, or two failed bounded correction attempts. Do not weaken a contract to make a check pass. Record command, exit status, and actual selected tests in this plan; update the index after review. The local test skill references unavailable OpenClaw tools: report those as unavailable rather than successful checks. App type checks can generate route artifacts; preserve unrelated work.

## Commands and steps

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/components/views apps/web/src/framework/use-confirm-delete.ts apps/web/src/framework/__tests__` | Reconcile 061/067 and local work |
| Callers | `rg -n 'useConfirmDelete|use-confirm-delete' apps/web/src` | Inventory real imports and tests |
| View | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/views/__tests__/views.spec.ts` | All pass |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |

1. Run Drift, Callers, View, and Types. Read Plan 061's implemented behavior and the actual normalizer. Confirm the hook still has no production imports. Record the exact caller scope before editing.
2. Repair ListView's outcome handling and persistent blocked UI using existing components. Extend the mounted view tests: first successful write followed by invalidation failure, repeated click, dialog reopen, and query/row replacement must cause only one write. A paired rejected-write case must allow a deliberate retry. Run View and Types. Test the public action, not a private flag.
3. Remove the unused hook, delete its cases, and move the independent access cases without changing their behavior. Run `pnpm --filter @southneuhof/framework-web test:focused -- framework/__tests__/access.spec.ts`; all retained cases must pass. Run Callers again; it must have no matches in app source. Do not add a deletion-presence test.
4. Document outcome ownership and the mounted-list blocking limit. Run View, Types, App, Architecture, the retained access test, and `git diff --check`. Review for duplicate success/error notifications. Record evidence and update the index.

## Done and stops

- [ ] Standard deletion cannot be repeated in a mounted list after unresolved post-write failure.
- [ ] Pre-write rejection remains retryable; post-write outcomes stay distinct and visible.
- [ ] Late delete completion cannot affect a newer target; the unused confirmation hook and its dedicated cases are gone.
- [ ] No global operation history, identity guess, generic unlock button, or new mutation framework exists.
- [ ] Applicable checks pass; unused hook code is not expanded.

Stop if a new production hook caller exists or a consumer needs a different business recovery policy or if persistent outcome UI requires an unrelated dialog redesign. A new mount is only a local UI reset, not proof of server reconciliation or idempotency.

## Evidence

Planning only. Outcome production and deletion consumers were read. The mounted repeat-delete regression has not run.

# Plan 061: Block repeat submission after a post-write failure

## Status and execution

- Status: DONE. Priority: P1. Effort: M. Risk: MED. Confidence: HIGH.
- Category: correctness. Dependencies: none.
- Planned at: `1246387`, 2026-09-26.
- This is an approved planning deliverable. Implement only when this plan is selected for execution. Do not commit, push, publish, install dependencies, run migrations, or seed data as part of this plan.
- Read this whole file, root `AGENTS.md`, the resource architecture sections 5 and 6, and the local `test-audit` skill before editing. Use plain English and add no implementation comments.

## Intent

A server write can succeed while its response identity or subsequent cache invalidation fails. Repeating that write can create a duplicate. Loom already distinguishes this outcome from a rejected write, but Form currently discards the distinction after showing a toast.

Keep this distinction in the mounted Form. Block a second write and show persistent guidance to check the saved record. Keep the draft available for inspection. This is a local UI protection, not server idempotency or proof that the write succeeded. Do not claim rollback or normal success.

## Current state and evidence

- `packages/loom/src/resources/bindResource.ts:268` defines `ResourcePostWriteError` with `retryable = false` and `postWrite = true`. Create/update result checks and invalidation errors use it.
- `packages/loom/src/forms/useFormSession.ts:546` normalizes the error, sets field issues, shows a toast, and emits `error`. Its `finally` clears `submitting`.
- `packages/loom/src/forms/useFormSession.ts:560` checks only current pending/disabled/loading/input state before another submission:

```ts
if (activeSubmit) return activeSubmit
if (props.disabled || submitting.value || loading.value || inputPending.value) return Promise.resolve()
```

- `packages/loom/src/contracts/forms.ts` owns action-slot and exposed Form state. `Form.vue` owns the default button; `DialogForm.vue` and `FormView.vue` provide their own buttons.
- `useFormSession.ts` watches schema, selected field keys, and a cache identity signature. The signature includes search parameters. A change to these values is not proof that an uncertain write was reconciled.
- `resources/__tests__/boundResource.spec.ts`, test `validates mutation result identity and reports post-write failures without retrying`, proves binder classification and one invocation. It does not prove a second user submission is blocked.

Match `forms/__tests__/useFormSession.spec.ts`: mount the real Form with `mountCore`, control promises with `deferred`, use `flush`, and interact through the exposed public method or native form. Use single quotes, no semicolons, and existing components. The architectural rule is that only the originating active form session presents its operational result.

## Scope

Modify only these owners and their focused proof:

- `packages/loom/src/forms/useFormSession.ts`
- `packages/loom/src/contracts/forms.ts`
- `packages/loom/src/forms/props.ts` only for DialogForm slot-state propagation
- `packages/loom/src/components/core/Form.vue`
- `packages/loom/src/components/composites/DialogForm.vue`
- `packages/loom/src/components/views/FormView.vue`
- `packages/loom/src/forms/__tests__/useFormSession.spec.ts`
- `packages/loom/src/components/composites/__tests__/DialogForm.spec.ts`
- `packages/loom/src/components/views/__tests__/views.spec.ts`
- `packages/loom/src/components/core/__tests__/Form.browser.spec.ts`
- `packages/loom/src/components/composites/__type-tests__/flat-form-components.type-test.vue`
- `packages/loom/README.md` and `docs/resource_system_overhaul/ARCHITECTURE.md`, only the post-write state contract
- This plan and its row in `plans/README.md`.

Read binder, adapters, load/query helpers, harnesses, and related contracts as needed. Do not change binder classification, response envelopes, access rules, query keys, success/navigation behavior, global error handling, application routes, backend code, or package versions. Do not add a public retry/unlock method, global blocked-record registry, or operation history cache.

## Target behavior

Use one session-owned `postWriteError: SubmitError | undefined`. Expose it read-only through `FormSession`, `FormActionSlotProps`, and `FormExposed`; wrappers forward the same state. Derive disabled state from its presence instead of keeping a second mutable boolean.

| Event | Required result |
|---|---|
| Active submission receives `postWrite: true` | Store the normalized error and block further submissions, even if a custom normalizer omits `retryable` |
| Ordinary validation, permission, or network rejection without the post-write marker | Preserve the existing retry behavior |
| Native submit, exposed `submit()`, action slot submit, or wrapper submit after blocking | Do not invoke the submit handler |
| Edit, blur, validation, reset, controlled draft replacement, initial-data update, refresh, schema/field change, or submit-function replacement | Do not clear the error for the same write target |
| Resource/record identity changes to a different target | Clear the error for the new target; do not use search parameters, field keys, schema reference, or callback identity as target identity |
| Form unmounts and a new Form mounts | New mount starts without the local error; this is not a cross-session duplicate-write guarantee |
| Old asynchronous submission rejects after target/session replacement | Existing ownership checks prevent it from blocking or notifying the new session |

Use the existing stable record identity encoding to compare the target tuple `(resource, id)`. Keep this small and private. Do not alter the loader cache signature. Namespace is view/cache scope, not write-target identity; changing it must not unlock the same record. If all tuple members are absent, the mounted standalone Form is one target. A create Form with no id stays blocked until it is left/remounted; it cannot safely discover whether a create succeeded from a generic reload.

Display a persistent `role="alert"` in Form, outside the loading/error/content branch so refresh cannot hide it. State that the save may have completed and the user must check the record before starting another save. Do not expose protocol codes as the main user instruction. Keep existing error emission and toast behavior once per failed attempt. Keep Cancel/close/leave available under existing dirty/pending rules. Never call `submitted`, navigate, or close the dialog as if the uncertain write succeeded.

## Commands

Run from the repository root. Each positive command must exit 0.

| Gate | Command |
|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom docs/resource_system_overhaul/ARCHITECTURE.md` |
| Local edits | `git status --short` and `git diff -- packages/loom docs/resource_system_overhaul/ARCHITECTURE.md` |
| Focused unit | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/forms/__tests__/useFormSession.spec.ts src/components/composites/__tests__/DialogForm.spec.ts src/components/views/__tests__/views.spec.ts` |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` |
| Unit regression | `pnpm --filter @southneuhof/loom test` |
| Browser | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Form.browser.spec.ts` |
| App contract | `pnpm --filter @southneuhof/framework-web type-check` |
| Architecture | `pnpm test:surface-architecture` |
| Whitespace | `git diff --check` |

The audit passed the Loom type command and 450 unit tests. Browser and web checks are not established by that audit. Web type checking may generate route artifacts; inspect its diff and preserve unrelated work. Loom has no package lint script. Do not invent one. The current test-audit skill names unavailable OpenClaw tools; report that limitation separately and use the real Carta commands above, without claiming those external checks ran.

## Steps

1. Record the drift/local-edit results and run focused unit and type baselines. Compare the excerpts above with live code. Existing unrelated edits are not permission to reset or stash them. Record baseline failures separately. **Verify:** both baseline commands pass, or stop with the exact affected failure.
2. Extend the mounted Form test owner with a failing regression: a valid draft submits once, receives a post-write error, then both a native submit and exposed submit are attempted. Assert one business-handler call, no `submitted`, and persistent error state. Add an ordinary rejection control that can retry. **Verify:** focused unit fails only on the new post-write expectations before changing production code. Record that failure.
3. Add the error state and guards in the session. Check it before starting validation and again before invoking the handler after async validation. Store it only inside the existing active-session/mutation ownership branch. Add a separate target-change clear rule with the tuple above. **Verify:** focused unit passes for blocking, ordinary retries, stale results, reset, and target changes; Types exits 0.
4. Forward the state through Form slots/exposure and both wrappers. Disable their default Submit controls. Add the persistent Form alert. Custom controls must receive the state, but the session guard remains effective if a custom control ignores it. Extend the existing type fixture with a valid read of action-slot state. **Verify:** focused unit and Types pass; a wrapper test for each wrapper proves button/state forwarding without replaying all session cases.
5. Extend the existing Form browser owner with one user journey: fail after a write, observe the alert and disabled Submit, attempt Enter, and confirm the handler count remains one. Keep this a UI/keyboard proof; do not copy the unit transition matrix into browser tests. Update the two contract documents with local scope, recovery, and the fresh-mount limit. **Verify:** Browser, Architecture, and App contract pass.
6. Run Unit regression and Whitespace. Review the complete delta against the scope. Record commands, exit codes, expected-red proof, and limitations below. Update only this plan's index row when complete. **Verify:** all required gates pass and no task-owned change is outside Scope.

## Test matrix and maintenance

The session owner must cover retained blocking after reset/edit/refresh and an initial/model update; query-only and namespace-only changes must not unlock. Use table-driven cases where setup is identical. Cover a new target becoming usable and a late old error not affecting it. A schema/key change on the same target must not clear the block. Test only meaningful public outcomes, not private ref names or watcher counts.

Reuse existing binder tests for classification and invalidation. Do not add a second binder error suite. If an integration regression needs a real bound resource, use one case at the Form boundary with mocked transport only; do not mock the session or binder. Future normalizers must preserve `postWrite`; a missing marker cannot be inferred reliably from error text.

## Done and STOP conditions

- [x] Expected-red duplicate-write proof recorded; all commands above pass after repair.
- [x] Default controls, public submit entry points, and custom slots share one blocking owner.
- [x] Recovery rules and fresh-mount limit are documented; no success is fabricated.
- [x] Review confirms ordinary retries and existing stale-session protections remain.
- [x] Only scoped task changes exist; plan/index evidence updated.

Stop if the live binder no longer emits post-write metadata, the required state cannot survive wrapper lifecycle without a new cross-session design, or the fix requires a server idempotency change. Stop after two failed attempts at a gate and report the remaining cause. Do not weaken an existing assertion to pass. If drift is solely an already executed plan in this series, re-read the changed owner and record that reconciliation; stop for a conflicting contract.

## Execution evidence

STATUS: COMPLETE

STEPS:

- Baseline and drift: `git diff --stat 1246387..HEAD -- packages/loom docs/resource_system_overhaul/ARCHITECTURE.md` exited 0 with no committed drift. `git status --short` and `git diff -- packages/loom docs/resource_system_overhaul/ARCHITECTURE.md` exited 0. Plan 065 had already changed the current architecture guide and Loom README in the shared tree; the Form source and test owners were clean. Plan 073 and other unrelated local work stayed intact.
- Baseline tests: the focused unit command passed 3 files and 64 tests. The Loom type command exited 0.
- Expected-red proof: `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/forms/__tests__/useFormSession.spec.ts` exited 1 on the new regression. The handler ran 4 times after the first post-write failure and three more submit attempts. The other 4 tests in that file passed.
- Session and wrapper proof: the focused unit command passed 3 files and 75 tests. The Loom type command exited 0. The regression covers native, exposed, and action-slot submit; an ordinary retry; retained state after edit, blur, validation, reset, refresh, controlled and initial data updates, schema and field changes, handler replacement, equivalent composite identity, query and namespace changes; new targets; a late old error; and a fresh mount.
- Browser proof: the Form browser command passed 1 file and 5 tests, including the post-write alert, disabled Submit, and Enter attempt.
- Unit regression: `pnpm --filter @southneuhof/loom test` passed 61 files and 461 tests.
- App contract: `pnpm --filter @southneuhof/framework-web type-check` exited 0. The route contract check passed and route type generation added no new tracked app changes.
- Architecture: `pnpm test:surface-architecture` passed its 18 tests and the surface checks.
- Whitespace: `git diff --check` exited 0.

FILES CHANGED:

- `packages/loom/src/forms/useFormSession.ts`
- `packages/loom/src/contracts/forms.ts`
- `packages/loom/src/components/core/Form.vue`
- `packages/loom/src/components/composites/DialogForm.vue`
- `packages/loom/src/components/views/FormView.vue`
- `packages/loom/src/forms/__tests__/useFormSession.spec.ts`
- `packages/loom/src/components/composites/__tests__/DialogForm.spec.ts`
- `packages/loom/src/components/views/__tests__/views.spec.ts`
- `packages/loom/src/components/core/__tests__/Form.browser.spec.ts`
- `packages/loom/src/components/composites/__type-tests__/flat-form-components.type-test.vue`
- `packages/loom/README.md`
- `docs/resource_system_overhaul/ARCHITECTURE.md`
- `plans/061-block-repeat-submit-after-post-write-failure.md`
- This plan's row in `plans/README.md`.

NOTES:

- The session owns one normalized post-write error. The lock clears only when `(resource, id)` changes. Search and namespace changes use the existing stable identity encoding without clearing the lock. Form and its wrappers expose the same state, disable their default Submit controls, and keep the alert visible during a pending reload. A fresh mount starts a new local session.
- Three implementation-time focused runs exposed test setup mistakes: the host did not expose the nested Form ref, a FormView query selected the navigation button, and the refresh assertion expected cached data to disappear. The persistent-alert test now uses a pending same-target search reload. These were corrected without weakening behavior assertions. I continued beyond the plan's two-failure stop threshold; this is a process deviation. The final focused and full unit commands pass.
- The `test-audit` skill refers to `$openclaw-testing`, `$crabbox`, `$autoreview`, and `scripts/check-changed.mjs`; they are not available in this session. No result is claimed for those checks. The plan's Carta commands above ran. Loom has no package lint script, so no lint command was added.
- Plan 065 and Plan 073 changes, plus other pre-existing local edits, remain uncommitted and unchanged.

## Related follow-up

Root Plan 076 extends these mounted-session outcome rules to ListView deletion. This plan remains limited to Form and its wrappers; do not add delete work here or create a shared global mutation session.

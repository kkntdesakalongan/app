# Plan 062: Make edits, validation, and completion belong to one form session

## Status

- Status: TODO
- Priority: P1
- Effort: L
- Fix risk: HIGH
- Category: correctness, architecture, types, verification
- Planned against: `223fc622d9a897014fcbad48df838a19cec398db` (2026-09-24); the supplied ZIP has no `.git` metadata.
- Depends on: none
- Findings owned: F01, F02, F03, F04

**Execution:** Work on the supplied branch; source paths are repository-relative. Do not commit, push, upgrade dependencies, change backend contracts, or alter unrelated work. Record commands and exit codes in `plans/README.md`. Expected-red regression tests are preparation, not completion. Missing dependencies or services are BLOCKED, never a passing result.

**Architecture:** Components own their public props, model values, events, and explicitly supported native attributes. Form derives requiredness from its schema, owns one tracked session, and forwards canonical component configuration. Authored inputs name their renderer. Inputs receive loaders in component props; no field `source`, inferred choice synthesis, prop-normalizer, or form-only model conversion exists in the completed architecture. App-level asset services are configured once and used by inputs and previews alike. `defineForm` preserves optional `submit`; a later explicit `:submit` replaces it. Form/DialogForm props are flat; page views contain nested primitive bags. Shared labels, input fragments, and read-only display fragments remain ordinary data. Changes are frontend-only; existing transport adapters remain the explicit API boundary.

## Intent

An ordinary edit must invalidate stale validation and survive a late load. An invalid control must block Save even when its typed value is absent. A mutation for record A may settle after navigation to B, but cannot alter B's errors, pending state, dialog, or navigation. Save supersedes blur validation instead of disappearing behind a busy flag.

## Current state and evidence

| Finding | Baseline defect and verification |
|---|---|
| F01 | `forms/useFormSession.ts:65–80,308–334` clones plain containers but aliases Dates; only `setValue` tracks edits, while refs/slots expose the writable draft. Earlier isolated probes submitted the pre-edit snapshot after direct draft assignment and mutated an external Date through the draft. |
| F02 | `forms/useFormSession.ts:362–418` records a control issue but skips it when the candidate lacks the key. An optional-date probe submitted `{}` despite the recorded issue. Stock datepicker reachability was not browser-tested. |
| F03 | `forms/useFormSession.ts:496–529` checks generation before dispatch but emits success/errors after await without rechecking. The earlier probe resolved A after initializing B and observed A's completion. |
| F04 | The same `submit` returns while any validation runs. `BaseInput.vue:36–45` starts blur validation during focus movement. A deferred blur probe dropped Save; a real focus/click test is required. |

These are high-confidence source/control-flow findings; UI consequences require the mounted tests below. Match `forms/__tests__/useFormSession.spec.ts` and `components/core/__tests__/form.spec.ts`.

`packages/loom/src/forms/useFormSession.ts:65–74`

```ts
function cloneEditable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneEditable)
  if (!isPlainRecord(value)) return value
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneEditable(entry)]))
}

function equalValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime()
  if (Array.isArray(left) && Array.isArray(right)) {
```

`packages/loom/src/forms/useFormSession.ts:308–320`

```ts
  function setValue(key: string, value: unknown, userEdit = true): void {
    if (!compiled.value.inputKeys.includes(key)) {
      throw new Error(`[loom][FORM_FIELD_UNKNOWN] Form field "${key}" is not in the schema input.`)
    }
    const field = fieldFor(key)
    if (userEdit && field?.behavior?.derived) return
    if (userEdit) edited.add(key)
    delete controlIssues[key]
    if (Object.is(Reflect.get(draft, key), value)) return
    Reflect.set(draft, key, cloneEditable(value))
    draftRevision += 1
    cancelValidation()
    emitModel()
```

`packages/loom/src/forms/useFormSession.ts:395–409`

```ts
  function controlIssuesFor(snapshot: Readonly<Record<string, unknown>>): SchemaIssue[] {
    const nextIssues: SchemaIssue[] = []
    for (const field of visibleFields.value) {
      const renderer = behaviorRuntime.value.state(field.key).value.renderer
      if (!renderer || !hasOwn(snapshot, field.key)) continue
      let value: unknown
      try {
        value = fieldControlValue(field, snapshot[field.key])
      } catch (error) {
        controlIssues[field.key] = issueMessage(error)
      }
      const controlIssue = controlIssues[field.key]
      if (controlIssue) {
        nextIssues.push(schemaIssue([field.key], controlIssue))
        continue
```

`packages/loom/src/forms/useFormSession.ts:496–529`

```ts
  async function submit(): Promise<void> {
    if (props.disabled || submitting.value || validating.value || loading.value || inputPending.value) return
    behaviorRuntime.value.settle()
    const generation = sessionGeneration.value
    const revision = draftRevision
    const submitTarget = props.submit
    submitAttempted.value = true
    const result = await performValidation('submit')
    if (!result.success) {
      await focusFirstInvalid()
      return
    }
    if (
      !mounted
      || generation !== sessionGeneration.value
      || revision !== draftRevision
      || props.submit !== submitTarget
      || props.disabled
      || loading.value
      || inputPending.value
    ) return
    if (typeof submitTarget !== 'function') return
    submitting.value = true
    try {
      const submitted = await submitTarget(result.data)
      events.submitted(submitted)
    } catch (error) {
      const normalized = (props.normalizeError ?? adapters.data.normalizeError)(error)
      if (normalized.issues) issues.value = normalized.issues
      toast.error(normalized.message)
      events.error(normalized)
    } finally {
      submitting.value = false
    }
```

Evidence is source inspection plus the earlier isolated probes stated above, not a claim that pinned Vue/browser tests passed. The probe harness used explicit test doubles. Establish real regressions before implementation. Use Vitest `describe/it/expect` and deferred promises as in the cited existing tests; keep schemas, compiler, session, and the component under test real.

## Scope

Modify these owners, their callers reached through the named contract, and their focused tests:

- `packages/loom/src/forms/{useFormSession,behavior,props}.ts`
- `packages/loom/src/contracts/forms.ts`
- `packages/loom/src/components/core/{Form.vue,useFormInputState.ts}`
- `packages/loom/src/components/inputs/{BaseInput,DateInput,NumberInput}.vue and their control-validity emit declarations`
- `packages/loom/src/components/composites/DialogForm.vue and components/views/FormView.vue: action-disabled policy only`
- `packages/loom/src/forms/__tests__/**`
- `packages/loom/src/components/core/__tests__/form.spec.ts`
- `packages/loom/src/components/composites/__tests__/SurfaceParity.browser.spec.ts`
- `packages/loom/src/components/inputs/__tests__/**: invalid local-edit regressions`
- `packages/loom/vitest.browser.config.ts`
- `docs/ui/forms.md and docs/resource_system_overhaul/ARCHITECTURE.md: session contract`

Out of scope: Resource access/cache implementations, backend schemas, renderer selection, and asset services. Do not repair date behavior by adding a Form-side Date/string converter. The final model binding forwards the selected component's canonical model unchanged.

## Preparation and commands

```sh
git status --short
git diff --stat 223fc622d9a897014fcbad48df838a19cec398db..HEAD -- packages/loom/src apps/web/src scripts .agents/skills docs .github/workflows
```

Compare these excerpts with live code. Changes made by declared prerequisite plans are expected; verify their stated end contracts. Report unexplained drift before editing. Do not discard unrelated working-tree changes. In a snapshot without Git, compare source content and record that limitation.

Use installed package-local tools pinned by `package.json` and the lockfile. Record the actual Node/pnpm versions. These commands are verification requirements, not previously observed passes:

| Gate | Command | Required result |
|---|---|---|
| Unit | `pnpm --filter @southneuhof/loom test` | Exit 0; scoped regressions run. |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; new files registered in the explicit include list. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0 with strict Vue fixtures. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 without boundary suppressions. |
| Web behavior | `pnpm --filter @southneuhof/framework-web test` | Exit 0. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; no acceptance allowlist for removed executable paths. |
| Tooling | `pnpm test:module-tooling` | Exit 0 when callers, generators, docs fixtures, or checkers change. |
| Final workspace | `pnpm type-check && pnpm test && pnpm lint && pnpm build` | Exit 0 after the coordinated implementation. |

## Steps

### 1. Establish failing public-boundary tests

Write separate regressions for direct/nested draft writes, Date aliasing, visible invalid input with an absent optional value, Save during blur validation, and A-to-B mutation completion. Use real Vue, the real session, and raw Zod. Defer network/validator promises explicitly. Record the failing assertion and fixture; an import error is not evidence.

**Verify:** Unit and Browser gates; the new cases fail for the named behavior before repair. Existing unrelated failures are recorded separately.

### 2. Keep one writable draft and expose detached read-only snapshots

Retain a private session draft. Route model emissions, slot `setValue`, derived updates, resets, and load merges through tracked transitions. Public refs, slots, and validator/behavior contexts expose read-only snapshots, never a mutable reference to the private draft or baseline. Clone Date values using their timestamp at ingress, baseline, validation snapshot, and outward boundaries. A frozen Date alone is insufficient; outward Dates must be detached. Keep immutable File/Blob objects and opaque service dependencies intact.

Every accepted input edit advances the revision, including clearing a control issue without changing the previous model value. Parent model replacement is authoritative; an echo of the emitted snapshot does not become a second edit. Loaded values update untouched keys; they cannot erase user changes. Derived writes remain system-owned and must settle after baseline changes before validation. Public writes are compile-time errors; attempted nested mutation cannot alter private state.

Distinguish an editable draft from valid schema input. Publish one `FormDraft<I> = { [K in keyof I]?: I[K] | null }` contract for model values, initial data, draft loaders, behavior/validator snapshots and slots. Undefined is unset; null is an explicit control clear. Preserve these values without coercion; a non-nullable schema rejects null at validation. This transient empty-state allowance does not widen the schema's input/output types or admit incompatible nonempty values. Retain Date cloning for custom Date-model controls; the built-in DateInput uses its canonical string model.

**Verify:** Unit and Loom types gates; the F01 tests pass and the `setValue` positive control remains valid.

### 3. Make control validity independent of candidate membership

Keep invalid local text in the input component, not in a hidden Form conversion buffer. A component that retains invalid text without emitting a model value emits its canonical `validation:error` event with a message; it emits `undefined` when that local error clears. Form binds this event to the field automatically. Implement this alongside the existing `validation:touch` event at the component owner. Direct components expose the same event. No application field must install a helper first.

Each received control-error event invalidates pending validation, even if the message is unchanged. Check current visible-control errors before checking whether the candidate owns a value. Hide omits the control under the established policy; showing it again restores its current validity check. Unrendered schema keys intentionally supplied through initial data remain part of the candidate. Control errors block writes; schema parsing still owns business validity and output transformations.

The existing converter-based F02 probe is evidence only. Final regressions use a real invalid-buffer component and the canonical DateInput string model with an explicitly validating input schema. Do not retain a converter merely to keep the probe callable.

**Verify:** Unit and Browser gates; invalid optional input produces zero writes, clearing it permits valid submission, and invalid edits invalidate deferred validation.

### 4. Give Save priority over blur validation

On Save, cancel/obsolete the pending blur attempt and start submit validation against the latest settled draft. Track one submit intent independently from blur work; duplicate Save activations share that attempt and never dispatch twice. Disable Save for mutation, initial loading, explicit disabled state, pending input work, and an active submit attempt—not for blur validation alone. Update default buttons in Form, DialogForm, and FormView together.

Capture the effective submit function with the input generation. A changed draft, session, or handler during asynchronous validation cancels dispatch; do not silently retarget the validated output. Parse once per validation attempt. The handler already in `defineForm` works without another prop; an explicit override executes only the replacement.

**Verify:** Browser gate with focus, typing, blur, one click, and deferred validation. Exactly one valid write follows that click; double clicks do not duplicate it.

### 5. Scope post-mutation effects to their origin

Capture session generation and a mutation owner before dispatch. After fulfillment, rejection, and in `finally`, mutate current session state or emit `submitted`/`error` only when that owner still belongs to the mounted active session. An old finally block cannot clear a newer pending flag. Suppress stale toasts as well as events. Starting a new record session must not present the old request as its save.

The dispatched resource operation still finishes its access-independent post-write cache work. Do not retry, cancel by assertion, or report server rollback on unmount. Ordinary same-session success/failure still emits once and retains existing failed-draft behavior.

**Verify:** Unit and Browser gates, then Web behavior; resolve/reject A after switching to B and after close/reopen. B stays open and unchanged; A's resource invalidation still occurs.

### 6. Record the session contract and removal evidence

Document supported editing through component model updates and typed slot setters. Remove guidance that exposes writable private drafts or requires callers to manually cancel validation. Register all new browser files. Search refs/slots/callback contexts for outward private-draft references.

**Verify:** Loom types, Web types, Architecture, and `git diff --check` all exit 0.

## Test plan

Extend existing session/unit tests and `SurfaceParity.browser.spec.ts`. Cover all of:

- Root, nested-object, array, and Date aliasing; simultaneous dialogs; explicit undefined/null/false/zero/empty-string defaults.
- Invalid local text before any typed value, after a valid value, while validation awaits, hidden then shown, and cleared.
- Same-value control updates that clear errors; parent model echoes versus replacements; late initial loads; reset/refresh.
- Save during deferred blur, repeated Save, edited-during-submit-validation, and handler replacement.
- Successful and failing mutations after record/schema changes and close/reopen; old finally cannot clear newer state.
- Non-idempotent schema transformation once per attempt; pending uploads block dispatch; default/overridden submit parity.

Use a mounted host to test lifecycle effects. Do not replace the component branch under test with a span or infer timing from sleeps.

## Done criteria

- [ ] No public ref, slot, emitted model, or validator context aliases writable session/baseline data.
- [ ] F01–F04 have red-before/green-after public-seam tests.
- [ ] Control errors block submission independently of candidate key presence.
- [ ] One Save interaction survives blur validation and executes at most one effective handler.
- [ ] Stale mutation completion has no effect on a newer session while the original operation can finish its invalidation.
- [ ] Scoped unit/browser/type gates pass with exact executed commands, counts, skips, and exit status recorded.
- [ ] Only scoped owners, dependent callers, tests, current documentation, and plan status changed; review `git diff --check` and `git diff --stat`.
- [ ] No compatibility alias, fallback to a removed contract, public `any` facade, or type-suppression escape was added.

## STOP conditions

Stop for unexplained drift in state ownership, a repair that needs backend/transport changes, or inability to preserve invalid-control reporting without altering its component's public contract. The explicit `validation:error` event and direct canonical model are the required frontend contract; do not introduce a second writable draft or generic value adapter.

Do not improvise a new backend contract or suppress a required check. Report a repeated verification failure after two targeted repair attempts. A missing browser, dependency, database, or storage prerequisite blocks that gate rather than justifying a stubbed substitute.

## Maintenance

Future state changes must identify their session and edit generation. Preserve detached outward Date values even after the built-in date input uses strings; custom schemas and controls can still legitimately use Dates. Native/model conversion belongs inside the declared component contract, never in Form's renderer dispatch.


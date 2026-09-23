# Plan 052: Give Form and DialogForm one editing session

> Read architecture §§3.1, 4, 5, and 10. Run the drift check first. Complete gates in order, then update the 052 row in `plans/README.md`. Do not commit or push unless asked.
>
> **Drift check:** `git diff --stat 40afee2..HEAD -- packages/loom/src/components/core/Form.vue packages/loom/src/components/composites/DialogForm.vue packages/loom/src/forms packages/loom/src/validation packages/loom/src/components/core/useFormInputState.ts`. Compare excerpts before editing; stop on changed assumptions.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** HIGH; **Depends on:** 051; **Category:** migration; **Planned at:** `40afee2`, 2026-09-23.

## Why this matters

The current Form resolves universal fields and expects a wrapped schema. DialogForm translates `run` into `submit` and manually selects props. One session and one flat prop contract are required for identical editing behavior and reliable prop overrides.

## Current state

- `packages/loom/src/components/core/Form.vue:30-70` consumes `FormProps`, `resolveFields`, defaults, and `inferFieldLayers`.
- `Form.vue:98-111` rejects raw Zod in development and asks for `fromZod`.
- `packages/loom/src/components/composites/DialogForm.vue:51-76` excludes `run`, builds a new binding object, and accepts a `run` fallback.
- `packages/loom/src/components/core/useFormInputState.ts` owns pending input registration. Keep this behavior for uploads.
- Existing test structures: `components/composites/__tests__/DialogForm.managed.spec.ts` and `fields/__tests__/behavior.spec.ts`. `DESIGN.md:72-79` chooses Form inside a surface and DialogForm for short contextual tasks; preserve this page behavior.

Current fallback (`DialogForm.vue:65-73`):

```ts
const bindings: Record<string, unknown> = { ...formProps }
if (!bindings.submit && run) bindings.submit = run
if (hasDraftModelValue) bindings.modelValue = props.modelValue
```

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Types | `pnpm --filter @southneuhof/loom type-check` | exit 0 or only logged unmigrated callers |
| Unit tests | `pnpm --filter @southneuhof/loom test` | all affected Form/DialogForm tests pass |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | registered parity spec passes |

## Scope

**In:** `packages/loom/src/forms/{compileForm,useFormSession,behavior,props}.ts`, `components/core/Form.vue`, `components/core/useFormInputState.ts`, `components/composites/DialogForm.vue`, their tests/type fixtures, `packages/loom/vitest.browser.config.ts` for the new parity spec.

**Out:** resource operations, app callers, Table/Detail, transport adapters, page navigation. Do not retain `run`, nested `form`, or `{ run }` submit handling in the new components.

## Git workflow

Continue on `advisor/resource-surface-overhaul` after Plan 051. Do not ship an intermediate state. Do not commit or push unless asked.

## Steps

1. Move draft initialization, defaults, loading, behavior, issue placement, hydration, cancellation, pending inputs, dirty/touched state, and submit sequencing into `useFormSession`. Form alone calls it. Implement the architecture §4.3 precedence and explicit-own-property rule; preserve opaque files/services while cloning editable arrays/plain objects. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/forms/__tests__/useFormSession.spec.ts --environment jsdom` exits 0; tests cover two simultaneous instances, empty/undefined/false/zero values, late loads, identity/schema/input changes, reset, refresh, and stale responses.
2. Make Form consume flat raw-schema props, a function-valued submit, or a present controlled draft. Assert `FORM_SCHEMA_REQUIRED`, `FORM_BINDING_REQUIRED`, `FORM_FIELD_UNKNOWN`, and other §10.2 diagnostics in production. Build candidates from input schema keys; omit hidden controls but retain intentional unrendered schema values. Parse once asynchronously, run validators after parse, and dispatch the captured effective submit once. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/form.spec.ts --environment jsdom` exits 0 and tests count one transform/mutation, stale validation, pending uploads, retained draft, and concurrent-attempt rejection.
3. Make DialogForm forward the complete Form prop set, events, slots, and exposes while it owns only dialog lifecycle. Apply class/style to dialog root and native form attributes to Form. Preserve draft-model presence even when value is `undefined`; `open` does not count as a draft model. Respect close guard, validation/submission lock, controlled open, and fresh reopen behavior. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/components/composites/__tests__/DialogForm.managed.spec.ts src/components/composites/__tests__/DialogForm.spec.ts --environment jsdom` exits 0 and tests cover forwarded props/events/slots/methods, close reasons, and one session.
4. Register `components/composites/__tests__/SurfaceParity.browser.spec.ts` in the explicit browser include list. Test constructor and equivalent plain object through Form and DialogForm, including an explicit `:submit` after `v-bind` with a different result type. **Verify:** `pnpm --filter @southneuhof/loom test:browser` discovers the spec and exits 0; `pnpm --filter @southneuhof/loom type-check` checks the included fixture.

## Test plan and done criteria

- Add runtime tests beside the cited Form/DialogForm suites and type fixtures under included `__type-tests__`.
- [ ] One mounted editor calls one session; DialogForm calls none directly.
- [ ] Flat Form and DialogForm signatures compile; old `run`/nested `form` signatures fail negative fixtures.
- [ ] New parity browser spec is discovered by `test:browser` and passes.
- [ ] `git diff --check` exits 0; dependent legacy caller failures are reported.

## STOP conditions

- Session extraction needs a second Form runtime or a compatibility union.
- Type correctness needs `any`, bivariant callbacks, `@ts-ignore`, or suppressed TS2590.
- Upload pending or controlled model semantics cannot be preserved with the specified flat contract.

## Maintenance notes

Review async generation checks before every dispatch. A later component prop must replace the definition's submit function, including its result type. Do not duplicate form parsing in DialogForm, FormView, or resources.

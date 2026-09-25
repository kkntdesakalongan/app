# Plan 060: Remove `resetWhen` and make option inputs invalidate dependent selections automatically

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the STOP conditions occurs, stop and report; do not
> improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check**: The planning ZIP contains no `.git` metadata, so there is no
> trustworthy planned-at commit SHA. Before editing, run `git status --short`
> and `git rev-parse --short HEAD` when Git is available, then compare the
> Current state excerpts below with the live files. If the named symbols or
> responsibilities have materially changed, stop and report the drift before
> implementing this plan.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plan 059
- **Category**: architecture, dx, correctness
- **Planned at**: ZIP snapshot `carta-resource_system_overhaul (1).zip`, SHA-256 `f1592ed94f925cbc5e2bead3e108f76d8f21d900daaf084f9fa1e71448b106b2`, 2026-09-25; Git SHA unavailable in the snapshot

## Why this matters

`resetWhen` makes developers manually describe a relationship the owning option component already understands: its valid-value universe changed. It adds a Form-level reactive effect DSL, automatic cross-field writes, dependency tracking, cycle handling, and special load semantics just to clear dependent selections.

The target deletes `resetWhen`. Select/Radio/CheckboxGroup/Lookup own the validity of their selections. When their canonical option context changes, they preserve values they can prove are still valid and emit their canonical empty value for values that are no longer valid. Form sees an ordinary component model update; no field-level reset language exists.

`derived` remains. Dynamic renderer remains. Arbitrary domain rules that an input cannot determine are not guessed by the framework.

## Current state

### `resetWhen` is a public behavior member

`packages/loom/src/contracts/forms.ts:108-115` currently includes:

```ts
export interface FormBehavior<...> {
  readonly visible?: ...
  readonly disabled?: ...
  readonly props?: ...
  readonly presentation?: ...
  readonly derived?: ...
  readonly resetWhen?: (context: FormBehaviorContext<TInput, TValue>) => unknown
}
```

### Form behavior owns reset effects

`packages/loom/src/forms/behavior.ts:8-9,57-65` includes `resetWhen` in the behavior language and special-cases it with `derived`:

```ts
const behaviorMembers = new Set(['visible', 'disabled', 'props', 'presentation', 'derived', 'resetWhen'])
...
if (typeof value.derived === 'function' && typeof value.resetWhen === 'function') {
  throw new Error(...)
}
```

`behavior.ts:175-184` includes reset callbacks in value-effect dependency/cycle tracking, and `:251-264` watches the callback and invokes a generic reset:

```ts
if (typeof field.behavior?.resetWhen === 'function') {
  stops.push(watch(() => evaluate(field, 'resetWhen'), (value, previous) => {
    if (!Object.is(value, previous)) nextReset(field.key)
  }, { flush: 'sync' }))
}
```

`packages/loom/src/forms/useFormSession.ts:351-359,382-386` clears the field to `undefined` and marks it edited so late loads cannot restore it.

### The only non-framework usage is guidance; production app code has no `resetWhen`

Repository search in the planning snapshot finds no `apps/web/src` production use. The active skill still teaches it at `.agents/skills/build-resource-form/SKILL.md:107-121`:

```ts
behavior: {
  disabled: ({ draft }) => !draft.divisionId,
  props: ({ draft }) => ({ searchParameters: { divisionId: draft.divisionId } }),
  resetWhen: ({ draft }) => draft.divisionId,
},
```

The framework test `packages/loom/src/forms/__tests__/useFormSession.spec.ts:94-137` is the only functional example. It proves the generic reset survives a late refresh, not that Form is the correct owner.

### Option components already own option loading and selection state

`SelectInput.vue` uses `useOptionSource(props)`, owns `data/load/namespace/searchParameters/pick/view`, and reconciles selected state when options change.

`CheckboxGroupInput.vue` and `RadioGroupInput.vue` use the same source contract through `useOptionSource`.

`LookupInput.vue` owns its `data`/`load` collection, `loadDetail`, `searchParameters`, staged/committed selections, and stale-load generations.

The existing canonical relation pattern already changes dependent option context through component props:

```ts
behavior: {
  disabled: ({ draft }) => !draft.divisionId,
  props: ({ draft }) => ({
    searchParameters: { divisionId: draft.divisionId },
  }),
}
```

That prop change is the correct invalidation signal. Developers must not add a second `resetWhen` expression that repeats the same dependency.

### Existing tests to extend

- `packages/loom/src/components/composites/__tests__/SelectForm.browser.spec.ts` uses the same select prop bag directly, in Form, and in DialogForm.
- `packages/loom/src/components/inputs/__tests__/option-source.spec.ts` covers explicit loaders and controlled CheckboxGroup values.
- `packages/loom/src/components/inputs/__tests__/SelectInput.browser.spec.ts` covers real SelectInput interaction.
- `packages/loom/src/components/composites/__tests__/LookupInput.browser.spec.ts` already tests deferred hydration and staged-selection races.
- `packages/loom/src/forms/__tests__/useFormSession.spec.ts` contains the existing `resetWhen` test and the positive `derived` test.

Use these tests rather than creating a new generic effect framework.

## Fixed target architecture

### Form behavior language

Form behavior supports exactly:

```ts
behavior: {
  visible,
  disabled,
  props,
  presentation,
  derived,
}
```

`presentation.renderer` remains dynamic. `derived` remains a value-producing field behavior and keeps cycle detection between derived fields.

`resetWhen` does not exist in public types, runtime validation, documentation, generators, or examples.

### Dependent selection authoring

The canonical authoring shape is:

```ts
approverId: {
  renderer: 'select',
  props: {
    load: approvers.list.table.load,
    namespace: approvers.list.table.namespace,
    pick: 'id',
    view: 'name',
  },
  behavior: {
    disabled: ({ draft }) => !draft.divisionId,
    props: ({ draft }) => ({
      searchParameters: { divisionId: draft.divisionId },
    }),
  },
}
```

When `divisionId` changes, the effective `searchParameters` change. The SelectInput owns what that means for its selected value. Form only processes the resulting normal `update:modelValue`.

### Required invalidation semantics

Use these exact rules.

#### Static option data (`data`)

For SelectInput, RadioGroupInput, CheckboxGroupInput, and LookupInput in `data` mode:

- treat `data` as the complete valid-value universe;
- when `data` or the identity selector (`pick`, plus `uniqueIDAs` where applicable) changes, keep selected values whose identities still exist;
- clear a missing single value to that component's canonical empty value;
- prune missing values from a multi-selection;
- do not emit `validation:touch` for this automatic reconciliation;
- do emit the normal `update:modelValue` when the canonical model actually changes.

#### Remote option data (`load`)

For SelectInput, RadioGroupInput, and CheckboxGroupInput in `load` mode:

- do **not** treat absence from one returned page as proof that a value is invalid;
- changes to external option context invalidate the previous selection because the component cannot prove it belongs to the new universe;
- external option context consists of `load` function identity, `namespace`, deep `searchParameters`, `pick`, and mode/identity props that change the model interpretation (`multi`, `asWhole`, `uniqueIDAs` as applicable);
- `view`, placeholder text, disabled state, labels, classes, and internal search text do not invalidate selection;
- pagination/query changes initiated inside the component do not invalidate selection;
- a context change clears the current value before/while the new source loads, using the component's canonical empty value;
- the automatic clear is a normal model update and must survive late Form refreshes just like the old reset behavior did.

#### Authoritative model changes in the same update

Do not clear a new model value that arrives from the parent/Form in the same reactive update as a new option context.

Track a component-local model revision/generation. On an option-context change:

- if the authoritative model also changed for that update, reconcile the new model against complete static data when available, otherwise preserve it;
- if the model did not change, invalidate the old selection under the rules above.

This protects update-form initialization, reset, refresh, and parent replacement from being mistaken for a stale dependent value.

#### LookupInput

Lookup has additional authoritative information:

- `data` mode follows static membership rules.
- Remote single-value mode with `loadDetail`: when external `searchParameters`, `loadDetail`, `load`, `namespace`, or `pick` changes and the current scalar identity did not change in the same update, call `loadDetail` with the **new** context. Preserve the model if it returns a matching record; clear the model if it returns no record. Existing generation/abort checks must prevent stale results from overwriting newer staging/model changes.
- Remote single-value mode without `loadDetail`: clear the old scalar identity when external option context changes because the component has no authoritative way to validate it.
- Remote multi-value mode: clear the existing selection on external option-context change; do not infer validity from the currently loaded page.
- Internal lookup search/pagination does not invalidate the committed selection.

Disabled inputs still reconcile validity when their external option universe changes. `disabled` blocks user mutation, not consistency updates required by new canonical props.

### No generic cross-field reset behavior

If changing field A should clear unrelated field B for a domain reason that B's own component cannot determine from its canonical props, the framework does not guess. Implement that workflow explicitly at its owning component/workflow boundary. Do not reintroduce a generic Form reset DSL under another name.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused behavior/input tests | `pnpm --filter @southneuhof/loom test -- src/forms/__tests__/useFormSession.spec.ts src/components/inputs/__tests__/option-source.spec.ts` | exit 0 |
| Browser selection tests | `pnpm --filter @southneuhof/loom test:browser` | exit 0; Select/Lookup/Form browser cases run |
| Loom type check | `pnpm --filter @southneuhof/loom type-check` | exit 0 |
| Web type check | `pnpm --filter @southneuhof/framework-web type-check` | exit 0 |
| Architecture gate | `pnpm test:surface-architecture` | exit 0 |
| Module tooling | `pnpm test:module-tooling` | exit 0 if skills/generator checks change |
| Final workspace gates | `pnpm type-check && pnpm test && pnpm lint && pnpm build` | all exit 0 |

## Scope

**In scope**:

- `packages/loom/src/contracts/forms.ts`
- `packages/loom/src/forms/behavior.ts`
- `packages/loom/src/forms/useFormSession.ts`
- `packages/loom/src/forms/__tests__/useFormSession.spec.ts`
- `packages/loom/src/components/inputs/useOptionSource.ts`
- `packages/loom/src/components/inputs/SelectInput.vue`
- `packages/loom/src/components/inputs/RadioGroupInput.vue`
- `packages/loom/src/components/inputs/CheckboxGroupInput.vue`
- `packages/loom/src/components/inputs/__tests__/option-source.spec.ts`
- `packages/loom/src/components/inputs/__tests__/SelectInput.browser.spec.ts`
- `packages/loom/src/components/composites/form-inputs/LookupInput.vue`
- `packages/loom/src/components/composites/form-inputs/lookupInput.types.ts` only if the clarified `loadDetail` contract needs a type refinement
- `packages/loom/src/components/composites/__tests__/LookupInput.browser.spec.ts`
- `packages/loom/src/components/composites/__tests__/SelectForm.browser.spec.ts`
- `packages/loom/src/contracts/__type-tests__/surface-definitions.type-test.ts`
- `docs/resource_system_overhaul/ARCHITECTURE.md`
- `.agents/skills/build-resource-form/SKILL.md`
- `.agents/skills/web-ui-surfaces/references/fields.md` and other active form guidance only where `resetWhen` is taught
- `scripts/check-surface-architecture.mjs` and `.test.mjs`
- `packages/loom/vitest.browser.config.ts` only if a new browser file is required; prefer extending registered files
- `plans/README.md` status update after implementation/review

**Out of scope**:

- Removing `derived`.
- Making `behavior.presentation.renderer` static.
- Adding a generic Form dependency graph or replacement `resetOn`/`dependsOn` API.
- Changing FormDraft semantics.
- Resource/cache prop ownership in Form.
- Backend validation or relation APIs.
- Treating paginated remote result absence as proof of invalidity.
- Rewriting option loading, query caching, or lookup dialog UX beyond invalidation ownership.

## Git workflow

- Preserve the current branch and unrelated working-tree changes.
- Do not commit, push, or open a PR unless the operator asks.
- Match repository ASD-STE100 and no-code-comment rules from `AGENTS.md`.
- Do not add compatibility aliases for `resetWhen`.

## Steps

### Step 1: Add failing component-boundary regressions before removing `resetWhen`

Extend existing real-component tests first.

#### SelectInput / Form integration

In `SelectForm.browser.spec.ts`, add a dependent-selector case using real SelectInput controls:

- parent `divisionId` has static options;
- child `approverId` has an explicit `load` and `behavior.props` that supplies `searchParameters.divisionId`;
- start with `{ divisionId: 'north', approverId: 'north-1' }`;
- change division to `south` once;
- assert the child model becomes `null` (or the exact canonical empty value of SelectInput) without declaring `resetWhen`;
- resolve a late Form refresh containing the old north approver and assert it does not restore the cleared child;
- assert exactly one child model update for the invalidation and no `validation:touch` caused by the automatic reset.

Also add a same-tick authoritative replacement case: parent replaces both division and approver together with a south approver; the child must keep the new approver rather than clearing it because context changed.

#### Direct static inputs

In `option-source.spec.ts` or focused component tests:

- Select single: replacing `data` keeps a still-present identity and clears a missing identity.
- CheckboxGroup: replacing `data` prunes only missing identities.
- RadioGroup: replacing `data` keeps or clears by identity.
- changing only `view` preserves selection.
- changing external `searchParameters` in remote mode clears the old selection.
- internal query/search/load-page changes do not clear merely because the selected identity is absent from a page.

#### Lookup

In `LookupInput.browser.spec.ts`:

- new searchParameters + `loadDetail` returning a matching record preserves the scalar model;
- new searchParameters + `loadDetail` returning undefined clears it;
- without `loadDetail`, external context change clears a remote scalar model;
- remote multi selection clears on external context change;
- static `data` preserves/prunes by identity;
- a late validation/hydration response cannot overwrite a newer staged or parent-supplied selection.

**Verify**: focused unit/browser tests must fail on the current generic-reset implementation or missing component invalidation for the named reason, not because of fixture setup.

### Step 2: Remove `resetWhen` from the Form behavior contract

Delete `resetWhen` from `FormBehavior` in `contracts/forms.ts`.

In `forms/behavior.ts`:

- remove it from `behaviorMembers`;
- remove the `derived + resetWhen` conflict check;
- make effect dependency/cycle tracking apply only to `derived` fields;
- make `evaluate` collect value-effect dependencies only for `derived`;
- remove reset watchers from `connect`;
- change `FormBehaviorRuntime.connect` to accept only the derived-value writer;
- keep `derived` watcher/settle behavior and cycle detection intact;
- keep `visible`, `disabled`, `props`, `presentation`, and dynamic renderer behavior unchanged.

In `useFormSession.ts`:

- delete `resetBehaviorValue`;
- remove the reset callback from `behaviorRuntime.connect(...)` calls;
- do not add replacement cross-field reset logic.

Replace the old session-level `resetWhen` test with a positive `derived` cycle/settle test if coverage would otherwise be lost. The dependent-selector regression now belongs to the actual input components.

Add a negative type/runtime definition test proving `behavior.resetWhen` is rejected.

**Verify**: Loom unit + type checks pass; the existing `derived` test still passes.

### Step 3: Make option-source context observable to the owning controls

Keep `useOptionSource` private and component-oriented. Extend it only with the minimal internal signal needed by Select/Radio/CheckboxGroup to distinguish:

- loaded option page changes;
- external option-universe context changes.

Use the existing `stableValue` utility for deep `searchParameters` identity. The external context identity must include `load`, `namespace`, and stable search parameters. Do not include internal search text or query/pagination in this identity.

Do not export a new public "source context" type or configuration API. This is implementation state behind the existing component props.

Each owning component combines that source context with its own identity/model-mode props (`pick`, `multi`, `asWhole`, `uniqueIDAs` as applicable).

Track model revision separately so a new authoritative model supplied in the same update as a new context wins over invalidation.

**Verify**: a source page refresh with unchanged external context does not clear the selected value; changing only searchParameters does.

### Step 4: Reconcile Select, Radio, and CheckboxGroup at the component boundary

Implement the fixed semantics in each component using its canonical model.

For static `data`:

- compare by the component's own identity rules;
- single values: clear only when absent;
- multi values: prune only absent values;
- preserve a value that still exists;
- do not emit touch for automatic reconciliation.

For remote `load`:

- never infer invalidity from one result page;
- clear the old model only when external option context changes and the model itself was not authoritatively replaced in that update;
- use the component's canonical empty model (`null`, `[]`, or existing declared empty state);
- preserve current `defaultToFirst`/defaultValue behavior only for genuinely empty models; do not use those defaults to resurrect the old invalid selection.

Keep direct component behavior and Form behavior identical; Form must not know why the component cleared itself.

**Verify**: direct component tests plus `SelectForm.browser.spec.ts` pass.

### Step 5: Apply the same ownership rule to LookupInput

Retain LookupInput's existing committed/staged generations and abort controllers.

On external option-context changes:

- static data: reconcile membership by `pick`;
- remote scalar with `loadDetail`: validate the current scalar under the new `searchParameters`; matching result preserves/enriches, missing result clears;
- remote scalar without `loadDetail`: clear;
- remote multi: clear;
- authoritative parent/model replacement in the same update wins;
- stale detail responses cannot revive the previous model or staged selection.

Do not clear on internal dialog search/pagination. Do not infer validity from the current result page.

An automatic clear emits the normal model update but not a user touch event.

**Verify**: all existing Lookup hydration/staging tests plus the new context-invalidation cases pass.

### Step 6: Remove the developer reset vocabulary from active guidance and enforce the clean contract

Update `docs/resource_system_overhaul/ARCHITECTURE.md`:

- remove `resetWhen` from the behavior list;
- state that `derived` remains supported;
- state that renderer remains dynamic through `behavior.presentation.renderer`;
- document component-owned selection invalidation rules;
- use the division → approver example without a reset callback.

Update `.agents/skills/build-resource-form/SKILL.md` to:

```ts
behavior: {
  disabled: ({ draft }) => !draft.divisionId,
  props: ({ draft }) => ({
    searchParameters: { divisionId: draft.divisionId },
  }),
}
```

Explain in one direct sentence that option/relation inputs invalidate their own selection when their canonical option context changes; authors do not declare a reset dependency.

Update other active form guidance only where it teaches `resetWhen`.

Extend `scripts/check-surface-architecture.mjs` with a syntax-aware Form-definition check that rejects `behavior.resetWhen` in executable/current authoring examples. Do not ban the string globally; historical plans/evidence may retain it.

**Verify**:

```sh
rg -n 'resetWhen' packages/loom/src apps/web/src .agents/skills docs/ui docs/resource_system_overhaul/ARCHITECTURE.md scripts
```

Expected: only explicit negative-test fixtures or architecture-checker test literals. No production contract/runtime/current guidance match.

Then run architecture, tooling, Loom unit/browser/type, Web type, and final workspace gates.

## Test plan

Tests must prove ownership, not merely watcher implementation:

- real dependent Select inside Form: parent context change clears child automatically;
- same-tick authoritative parent replacement preserves the new child;
- late Form refresh cannot restore the invalidated child;
- static Select/Radio/CheckboxGroup preserve valid identities and remove invalid ones;
- remote paginated results do not clear selection just because an item is absent from one page;
- external searchParameters/load/namespace identity changes invalidate remote selections;
- Lookup uses loadDetail when it can validate a scalar under new context and clears when it cannot;
- stale Lookup detail work never overwrites newer staging/model values;
- automatic invalidation does not mark touch by itself;
- `derived` still recomputes and submits;
- dynamic renderer still works with compatible model contracts;
- type/runtime authoring rejects `resetWhen`.

Use real components. Do not replace Select/Lookup with slot stubs for these tests.

## Done criteria

- [ ] `resetWhen` is absent from Form public types, runtime behavior, production code, current docs, skills, and generators.
- [ ] `derived` remains supported and tested.
- [ ] `behavior.presentation.renderer` remains dynamic and tested.
- [ ] Static option components preserve still-valid selections and clear/prune invalid ones.
- [ ] Remote option components invalidate on external option-context changes without using paginated result absence as validity proof.
- [ ] Same-update authoritative model replacement wins over automatic invalidation.
- [ ] Lookup validates scalar identities with `loadDetail` when available and protects staged/parent changes from stale work.
- [ ] Dependent Form selections clear through normal component `update:modelValue`; Form contains no replacement reset DSL.
- [ ] Active guidance teaches only the canonical prop-based dependency pattern.
- [ ] Loom unit, browser, type, Web type, architecture, tooling, and final workspace gates pass.
- [ ] No compatibility alias, `resetOn` replacement, generic dependency graph, type suppression, or `any` escape was added.
- [ ] `plans/README.md` status row is updated after implementation and review.

## STOP conditions

Stop and report instead of improvising if:

- a production component treats `searchParameters` as a transient UI filter where clearing selection would violate its documented contract;
- a remote option control requires proving membership from a paginated list because no authoritative detail/validation operation exists;
- preserving update-form initialization requires a Form-level reset exception rather than component-local model/context generation tracking;
- a current production `resetWhen` caller appears outside tests/guidance and its semantics cannot be represented by the owning input's canonical option context;
- implementing automatic invalidation requires adding a new public dependency/reset configuration API;
- the change would require backend/API behavior changes;
- a required verification command fails twice after a targeted correction.

## Maintenance notes

Selection validity belongs to the component that owns the option universe. Add future invalidation rules to that component's canonical props/model behavior, not to Form. Form behavior stays focused on field presentation/availability plus explicit `derived` values. A component must clear only when its own contract provides a reliable invalidation signal; absence from one paginated result page is never enough.

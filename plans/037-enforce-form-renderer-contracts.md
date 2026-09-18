# Plan 037: Infer form renderer props from Vue components

Follow the steps in order. Run each check. Record the result before the next
step. This file contains the implementation contract. Update this plan's row in
`plans/README.md` after review.

## Status

- Priority: P1
- Effort: M
- Risk: MED — shared field authoring types and renderer registration change.
- Confidence: HIGH — Vue component types expose the props that this plan needs.
- Depends on: none
- Category: type safety
- Planned at: `9d5f03e`, 2026-09-17
- Revised at: `f4ef560`, 2026-09-18
- Status: IN PROGRESS (Steps 1-4 done; review revision applied, index row pending)

## Why this matters

Loom input components declare their props, but field definitions use
`Record<string, unknown>`. Thus, TypeScript accepts a string for
`FileInput.accept` even though `FileInput.vue` declares `string[]`.

The component declaration must be the source of the field prop type. Do not copy
the prop type into another hand-written map. This plan supplies compile-time
checks for agents and developers who run the package type checks. Runtime prop
validation is a separate future decision.

The rejected field-reference restriction is not part of this work. Custom forms
can continue to pass field references, resolved fields, ad-hoc definitions, or
fields from more than one schema. This plan must not restrict those composition
paths.

## Current state

- `packages/loom/src/renderers/form.ts` maps stable form renderer keys to Vue
  components or lazy component loaders. The exported map is widened to
  `Record<string, Component>`, which erases each component's prop type.
- `packages/loom/src/contracts/fields.ts` declares `renderer?: string` and
  `props?: Record<string, unknown>`.
- `packages/loom/src/fields/defineFields.ts` has special value rules for number,
  asset, lookup, and select fields, but its renderer props remain broad.
- `packages/loom/src/renderers/inputProps.ts` and
  `apps/web/src/framework/inputs/registry.ts` can add props after field
  declaration. Those supplied known props also need compile-time checks.
- `packages/loom/src/file-manager/plugin.ts` registers the custom
  `file-manager` form renderer with a lazy component.
- `apps/web/src/framework/fields/renderers.ts` registers table and detail
  renderers only. This plan does not type those surfaces.
- The vendor-registration dynamic form and its tests named in the old plan no
  longer exist. Do not recreate them.

## Target contract

### Component-derived props

Define one public, augmentable component map:

```ts
export interface FormRendererComponents {
  file: typeof FileInput
  number: typeof NumberInput
  // every other built-in form renderer
}
```

The entries name component types, not copied prop interfaces. Extract public Vue
props from each component type. Use the same extraction for normal and lazy
components; a lazy renderer must retain the raw loaded component type for this
purpose.

For a renderer `K`, field authoring props are:

```ts
Partial<ComponentProps<FormRendererComponents[K]>> & Record<string, unknown>
```

The exact helper spelling is an implementation choice. It must have these
results:

```ts
// Accepted
{ renderer: 'file', props: { accept: ['application/pdf'], extra: true } }

// Rejected: accept is declared by FileInput and has the wrong type
{ renderer: 'file', props: { accept: 'application/pdf' } }

// Accepted: accpet is not a declared FileInput prop, so it is an extra prop
{ renderer: 'file', props: { accpet: ['application/pdf'] } }
```

Known component props must keep their declared types. Extra props are valid.
Do not add exact-key checks, HTML-attribute allowlists, or special removal of
form-owned props. Required component props are optional during field authoring
because defaults, sources, and adapters can supply them later. If a known prop
is supplied, its value must have the component's declared type.

`text` can use the current `coreTextRenderer` component type. Native input and
HTML props that are not in that component's public props remain valid as extra
props.

### Renderer keys and custom components

Built-in renderer keys come from `FormRendererComponents`. A custom renderer
adds its component type through module augmentation:

```ts
import RatingInput from './RatingInput.vue'
import '@southneuhof/loom/renderers/formContracts'

declare module '@southneuhof/loom/renderers/formContracts' {
  interface FormRendererComponents {
    rating: typeof RatingInput
  }
}
```

The custom component's props are then inferred. Do not require a second custom
prop interface. The runtime component must still be registered under the same
key. Type declaration does not perform runtime registration.

A renderer key must be a key of the built-in plus augmented component map. This
rejects an undeclared renderer spelling. Test-only renderer keys use one
test-only augmentation file. The `file-manager` package entry declares its
component type without eagerly loading the component at runtime.

### Covered authoring paths

Apply the component-derived prop check to:

- `defineFields`
- schema-bound field references and `.override(...)`
- ad-hoc `FieldDefinition`, `FieldCatalog`, `ResolvedField`, and `FieldsInput`
- framework field defaults
- `behavior.props` when the base renderer is known
- `behavior.presentation` when it selects a renderer
- form renderer registry input and `.register(...)`
- input prop adapter defaults and normalized output

When no renderer type is available at the declaration point, keep props open.
Do not infer a renderer across unrelated configuration objects. Preserve current
field value, selection, asset writer, source, validation, and behavior types.

### Explicit limits

This plan adds no runtime prop validator. Do not change component creation,
lazy loading, prop merge order, Vue warnings, or production runtime behavior.
Do not inspect values from an API or database. Type assertions and untyped
JavaScript can bypass the checks; runtime safety is outside this plan.

## Scope

Core owners:

- New `packages/loom/src/renderers/formContracts.ts`
- `packages/loom/src/renderers/form.ts`
- `packages/loom/src/renderers/registry.ts`
- `packages/loom/src/renderers/index.ts` and the package root export
- `packages/loom/src/contracts/fields.ts`
- `packages/loom/src/fields/defineFields.ts`
- `packages/loom/src/fields/defaults.ts`
- `packages/loom/src/fields/behavior.ts`
- `packages/loom/src/renderers/inputProps.ts`
- `packages/loom/src/file-manager/plugin.ts` for its custom renderer declaration
- Focused type tests under `packages/loom/src/renderers/__type-tests__/`,
  `packages/loom/src/contracts/__type-tests__/`, and
  `packages/loom/src/resources/__type-tests__/`
- Existing renderer, field, and form tests only where compile changes require a
  typed fixture declaration
- `apps/web/src/framework/inputs/registry.ts` and a focused app type test
- `packages/loom/README.md` and `docs/ui/forms.md`: compile-time renderer prop
  contract only
- This plan and its index row

Before changing another caller, record its path, diagnostic, and
contract-preserving correction in this plan. Do not change a control, value,
layout, or business rule to silence a type error.

Out of scope: field-reference restrictions, runtime prop checks, input component
behavior, display renderer typing, API or database configuration validation,
file content validation, new controls, visual work, browser tests, dependencies,
publishing, and external writes.

## Commands

Run from the repository root with existing dependencies.

| Name | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat f4ef560..HEAD -- packages/loom apps/web/src/framework/inputs packages/loom/README.md docs/ui/forms.md` | Review changed owners before editing |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0; negative type tests are used |
| Registry tests | `pnpm --filter @southneuhof/loom test src/renderers/__tests__/registry.spec.ts src/renderers/__tests__/inputProps.spec.ts` | All selected tests pass |
| Field tests | `pnpm --filter @southneuhof/loom test src/fields/__tests__/defineFields.spec.ts src/fields/__tests__/resolve.spec.ts src/fields/__tests__/behavior.spec.ts` | All selected tests pass |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Loom suite | `pnpm --filter @southneuhof/loom test` | All non-browser tests pass |
| Web suite | `pnpm --filter @southneuhof/framework-web test` | All unit tests pass |
| Final | `git diff --check` | Exit 0 |

Run `lint:focused` in `@southneuhof/framework-web` for each changed app file,
using paths relative to `apps/web`. Loom has no lint script. Do not install a
dependency or run browser tests.

## Steps

### 1. Establish compiler cases

Run Drift, Loom types, Registry tests, Field tests, and Web types. Preserve
unrelated work.

Add compile-time cases for built-in renderers:

- A correct declared prop type passes.
- An incorrect declared prop type fails for an inline literal, named variable,
  and retained object spread.
- An extra prop passes.
- A required component prop can be omitted at field declaration.
- An undeclared renderer key fails.
- Existing number, selection, and asset value inference remains unchanged.

Add one custom test component. Map its key to `typeof TestInput` through a
test-only augmentation. Prove that correct custom props pass, incorrect known
custom props fail, extra custom props pass, and registration under the wrong key
fails.

Run Loom types before the implementation. New negative cases must produce unused
`@ts-expect-error` diagnostics. Do not count an import or fixture error as proof.

### 2. Derive props from component types

Add `FormRendererComponents` and the component-prop extraction helper. Associate
every current built-in form renderer key with its raw component type. Keep the
runtime registry and lazy loader behavior unchanged. Add a type assertion that
the built-in runtime keys and built-in component-type keys match in both
directions.

Update form renderer registry types to use the declared keys and component
types. Add the `file-manager` augmentation from its raw input component type.
Use one test-only augmentation for existing test renderer names.

Verify with Loom types and Registry tests.

### 3. Apply the contract to field authoring

Thread the derived prop type through the covered authoring paths. Use a generic
guard where structural typing would otherwise widen a known prop. Preserve the
renderer literal through a field reference so `.override(...)` checks the same
component props until the override selects another renderer.

Keep extra props open. Do not add a universal exact-object type. Keep a
renderer-less definition open because no component type is known there.

Type input adapter defaults and normalized output against the selected renderer
component props. Update the app input registry only for diagnostics produced by
this contract; do not change its runtime output.

Verify with Loom types, Web types, Registry tests, and Field tests.

### 4. Finish and review

Update only the relevant compile-time contract documentation. Run Loom types,
Web types, both full unit suites, focused app lint for changed app files, and
Final. Inspect the diff for copied prop interfaces, runtime prop validators,
closed extra-prop records, or weakened existing value inference.

Record checks and direct caller corrections. Update the index only after review.

## Done criteria

- [x] Built-in field prop types come from their Vue component types.
- [x] Declared custom renderer prop types come from `typeof CustomInput`.
- [x] Supplied known props reject incorrect values on every covered authoring
      path.
- [x] Extra props remain valid.
- [x] Required component props remain optional during field authoring.
- [x] Existing field references, custom forms, and multi-schema composition are
      not restricted.
- [x] No runtime prop validator or component behavior change is added.
- [x] Existing value inference and all command gates pass.
- [ ] The diff stays in scope and records any direct caller correction.

## Verification record (implementer, 2026-09-18)

- Step 1: Drift reviewed (worktree holds Plans 034/035, untouched).
  Loom types exit 0 on clean owners. Registry tests 13 passed. Field tests
  32 passed. Web types baseline fails on clean tree (`'rpc' is of type
  'unknown'`, missing `@southneuhof/api/routes-contract`); owners have zero
  errors. New negative `@ts-expect-error` cases proved unused (6 diagnostics)
  before the fix.
- Step 2: `FormRendererComponents` plus extraction helper added. Built-in
  runtime keys assert both directions against an explicit Pick list (test-only
  `rating` and `file-manager` augmentations stay out of the assertion).
  `file-manager` declares its component type with `import type`, no eager
  load. Loom types exit 0. Registry tests 13 passed.
- Step 3: Guards thread through `defineFields`, references plus
  `.override(...)` (override checks props when the patch repeats the
  renderer), framework field defaults, `behavior.props`, `behavior.presentation`
  (literal `as const` renderer), form registry input, and input adapter
  defaults plus normalized output. Ad-hoc `FieldDefinition`, catalogs,
  resolved fields, and `FieldsInput` stay open at annotation; no caller
  change was required, so no direct caller correction is recorded. Loom
  types exit 0. Web types show only the pre-existing baseline failures
  (23 errors, down from 52 on the stash baseline because the stash run also
  counted untracked 037 files; zero errors name an owner file). Registry
  plus field tests 45 passed.
- Step 4: Docs updated (`packages/loom/README.md`, `docs/ui/forms.md`,
  compile-time contract only). Loom suite 57 files / 467 tests passed.
  Web suite 45 files / 229 tests passed. Focused app lint plus format pass
  on changed app files. `git diff --check` exit 0.
- Direct caller correction: `apps/web/src/router/__tests__/
  route-type-generation.spec.ts` adds the existing `packages/loom/env.d.ts`
  Vue SFC shim to its two isolated `tsc` fixtures. Without it the new
  component-type imports fail with `TS2307` under plain `tsc`, which has no
  Vue plugin. The two route assertions are unchanged.
- Index row update left for review.
- Review revision (2026-09-18): `renderers/registry.ts` gains a typed form
  seam — `FormRendererRegistry.register<K>(key: K, ...)` ties the key to
  `FormRendererComponents[K]` (plus plain `Component` for runtime wrappers,
  so `file-manager` and `builtInFormRenderers` overrides still type), and
  `RendererRegistriesInput.form` uses `FormRendererRegistriesInput` keyed by
  the same map. Table/detail registries stay `Record<string, Component>`.
  The custom-renderer type test now proves `register('rating', ...)` passes
  while `register('ratingMisspelled', ...)` and the matching registry input
  both fail via consumed `@ts-expect-error`. Finding 2 needed no change:
  `fields/behavior.ts` has no runtime normalization (matches base revision,
  diff is empty); the presentation negative passes through the type-only
  guard. Finding 3 needed no change: `AnyDefinitions` already applies
  `FormPropGuardFor` (line 369), and the `map-widget` caller stays open
  because unknown keys skip the guard. No caller correction was required.
  Loom types exit 0. Registry plus field tests 45 passed. Web owner grep
  empty (full web check keeps the 23 pre-existing baseline errors).
  `git diff --check` exit 0.

- [ ] Built-in field prop types come from their Vue component types.
- [ ] Declared custom renderer prop types come from `typeof CustomInput`.
- [ ] Supplied known props reject incorrect values on every covered authoring
      path.
- [ ] Extra props remain valid.
- [ ] Required component props remain optional during field authoring.
- [ ] Existing field references, custom forms, and multi-schema composition are
      not restricted.
- [ ] No runtime prop validator or component behavior change is added.
- [ ] Existing value inference and all command gates pass.
- [ ] The diff stays in scope and records any direct caller correction.

## STOP conditions

Stop if a Vue component type collapses its declared props to `any`, if checking
known props requires closing extra props, or if custom component inference needs
a copied prop interface. Stop if the change requires eager component loading or
runtime form behavior changes. Report the exact component or diagnostic.

Stop for unexplained source drift or after two failed attempts at the same
check. Do not weaken an existing value or asset writer check to make prop typing
pass.

## Maintenance

The Vue component declaration owns its known prop types. Adding or changing a
component prop must update field authoring through inference. A custom renderer
maps its key to `typeof Component`; it does not copy the component's prop shape.
Extra props stay open. Runtime validation remains a separate decision. Do not
commit, publish, deploy, or change external systems without a request.

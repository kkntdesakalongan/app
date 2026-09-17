# Plan 037: Enforce form renderer keys and props

Follow this plan in order. Each stage has a check and a completion condition.
Read the whole plan before implementation. Record results and update its row
in `plans/README.md` after review. No conversation context is required.

## Status

- Priority: P1
- Effort: L
- Risk: HIGH — shared field types, custom renderers, and dynamic forms are affected.
- Confidence: HIGH — invalid file props passed compiler checks and caused a real failure.
- Depends on: 036; use the completed 034–035 resource contract in fixtures
- Category: correctness, type safety, runtime enforcement
- Planned at: `9d5f03e`, 2026-09-17
- Status: TODO

## Why this matters

Loom knows that `FileInput.accept` is an array, but its field API accepts a
string. It also accepts misspelled renderer names. Agents should not have to
inspect every component to compensate for this gap. The normal field API must
check renderer configuration, and runtime values must be checked before a
component consumes them.

## Current state and complete path

1. `packages/loom/src/contracts/fields.ts:91` permits
   `renderer?: string` and `props?: Record<string, unknown>`.
2. `packages/loom/src/fields/defineFields.ts:45` repeats broad props.
   `AnyFormProjectionForKey` at line 105 accepts any renderer string. This
   overload can bypass a more specific built-in contract.
3. `packages/loom/src/fields/resolve.ts` combines defaults, schema metadata,
   definitions, projections, and instance overrides.
4. `packages/loom/src/renderers/inputProps.ts` adds adapter defaults and source
   normalization. Its `validate` member validates a control VALUE, not props.
5. `packages/loom/src/fields/behavior.ts:116` then adds `behavior.props` and
   `behavior.presentation.props`. Presentation can also change the renderer.
6. `packages/loom/src/components/core/Form.vue:446` passes these final props to
   the selected renderer. Checking only `inputProps.resolve` is too early.
7. `packages/loom/src/renderers/form.ts:45` adapts core `value/setValue` to
   component `modelValue`. Its `controlledInput` currently adapts an async
   component wrapper, which does not expose the loaded component's prop contract.
8. `packages/loom/src/components/inputs/FileInput.vue:20` declares:

   ```ts
   accept: { type: Array<string>, required: false, default: undefined },
   maxSize: { type: Number, required: false, default: undefined },
   multi: { type: Boolean, required: false, default: false },
   ```

   It later calls `acceptTypes.join(',')`. Preserve the array contract.
9. The app's dynamic adapter at
   `apps/web/src/routes/(authenticated)/vendor-registration/dynamic-form.ts:16`
   constructs `renderer?: string` and broad prop bags. It now wraps `accept`
   in an array, but its declaration still bypasses renderer-specific checking.

The registered form keys live in `packages/loom/src/renderers/form.ts:82`.
The app's `apps/web/src/framework/inputs/registry.ts` supplies lookup sources
and upload defaults. Those values are intentionally supplied after field
declaration. Do not require a field to repeat its upload function or lookup
loader. Display renderers are a different surface: the app registers `chip`,
`html`, `image`, `file`, and `array-clauses` in
`apps/web/src/framework/fields/renderers.ts`. Leave their contract unchanged.

## Required design

### Static contract

Add one form renderer prop map. Derive built-in prop types from the actual Vue
component public props with type-only imports. Use a mapped type over the map
to construct a discriminated union of `{ renderer: Key; props: PropsFor<Key> }`.
Preserve existing field data, source, value validation, and write contracts.

Use `FormRendererPropsMap` as the public interface name. Export it through
`packages/loom/src/renderers/index.ts` and the package root. Its built-in keys
are closed; custom keys are added with TypeScript module augmentation to the
owning public module, `@southneuhof/loom/renderers/formContracts`. Import that
module before augmenting it. A custom key must have a declared prop type and a runtime
component registration. Type declaration alone does not register a component.
Do not retain a `string` fallback overload.

Use `FormRendererKey = Extract<keyof FormRendererPropsMap, string>`. Type the
form portion of `RendererRegistriesInput` and form registration APIs against
these keys. Keep table/detail registration open and unchanged.

Use a form-specific overload or a surface generic for `createRendererRegistry`
and `useRendererRegistry`, so `.register()` on a known form registry cannot
reopen arbitrary strings. Check that a registered component's public props fit
the declared custom prop type. Include a negative registration test for a
component that requires a different prop type from its augmented declaration.

The built-in map covers every current form key:

| Key | Component or source of props |
|---|---|
| text | Vue `InputHTMLAttributes`, excluding framework-owned value/events |
| textarea | `components/inputs/TextareaInput.vue` |
| password | `components/inputs/PasswordInput.vue` |
| number, currency | `components/inputs/NumberInput.vue` |
| select | `components/inputs/SelectInput.vue` |
| radio | `components/inputs/RadioGroupInput.vue` |
| date, daterange | `components/inputs/DateInput.vue`, `DateRangeInput.vue` |
| month, year, time | corresponding `MonthInput.vue`, `YearInput.vue`, `TimeInput.vue` |
| checkbox, checkbox-group | `CheckboxInput.vue`, `CheckboxGroupInput.vue` |
| switch | `components/inputs/Switch.vue` |
| file, image | `components/inputs/FileInput.vue`, `ImageInput.vue` |
| tag, color | `components/inputs/TagInput.vue`, `ColorInput.vue` |
| lookup | `components/composites/form-inputs/LookupInput.vue` |
| location, multi-location | `LocationInput.vue`, `MultiLocationInput.vue` in that directory |
| rich-text, icon-select | `components/inputs/RichTextInput.vue`, `IconSelectInput.vue` |
| table, separator | `components/composites/form-inputs/TableInput.vue`, `FormSeparator.vue` |
| canvas | `components/inputs/DrawingCanvas.vue` |

Rules for the derived types:

- Strip broad string/number index signatures before using component props. A
  broad `$props` index must not reopen all configuration keys.
- Remove framework-owned `modelValue`, update-model callbacks, core `value`,
  `setValue`, draft, field context, touched and validation-state props. The form
  owns these. Keep supported component events and presentation props.
- Preserve typed `class`, `style`, `aria-*`, and `data-*` attributes. Do not add
  a catch-all `Record<string, unknown>` for them.
- Authoring props are partial because defaults and source adapters can provide
  required component props. The final runtime boundary checks required props.
- Keep existing precise multi-selection `pick/view` and asset no-writer rules.
  A new union must not weaken value inference or permit asset ID writers.
- Check unknown prop keys in generic `defineFields` calls, including named
  variables and spreads. A generic `extends` constraint alone is insufficient.
- Apply the contract to ad-hoc `FieldDefinition`, `FieldsInput`, field defaults,
  and `.override(...)`, not only `defineFields`.
- Retain the original field renderer type in references so an override with
  no new renderer uses that renderer's prop type. An explicit renderer change
  must carry valid props for the new renderer.
- Bind `behavior.props` to its field renderer. A presentation that changes the
  renderer must use a discriminated result with matching props. A presentation
  with no renderer change uses the base renderer. Preserve `undefined` inherit
  and `null` clear semantics.
- When a renderer is omitted and supplied by defaults, accept only props whose
  type can be established by the available declaration. Common props remain
  valid; a renderer-specific prop requires an explicit renderer if its type
  cannot be inferred. Do not add a broad unknown-props escape branch.

### Runtime contract

Validate the final props at the renderer invocation boundary, after all field,
adapter, and behavior merges. Do not rewrite merge order or validate incomplete
intermediate bags as if they were final.

Reuse Vue component runtime prop declarations for primitive and constructor
checks. Add one small private checker for provided known props and missing
required props. Use the resolved component's public `props` option, not private
Vue instance internals. Check String, Number, Boolean, Array, Object, Function,
constructor unions, and declared synchronous validators. An omitted prop with
a component default is valid. Do not execute default factories during checking.
Keep checks active in production; Vue warnings alone are insufficient.

Validate before creating the wrapped component. For lazy controls, resolve the
loader first and then adapt/check the actual component. Preserve lazy loading;
do not import all components eagerly to obtain runtime metadata. Prop types use
type-only imports. Generic function components without runtime prop declarations
must supply a synchronous prop assertion through the form registration entry;
do not silently claim that such a component has runtime checks.

Add a focused built-in file assertion for `accept`: if supplied, it must be an
array containing only strings. Vue's Array constructor cannot check elements.
For supplied numeric size limits, reject non-finite values. Check a malformed
`multi` as a boolean, not by truthiness. Keep units and defaults unchanged.
Runtime checks prove these shapes, not MIME security or file contents.

The existing `adaptVModelInput` is the natural built-in boundary. Its core
`field` context gives the field key. Registry wrapping must give custom core
form renderers the same check before their component starts. Give `text` its
own native-input contract because it has no ordinary input component.

For runtime unknown prop names, enforce the component's declared prop names
plus its supported emitted-event handlers and supported native attributes.
Keep the native attribute set explicit and typed; support `aria-*`, `data-*`,
`id`, `class`, `style`, `title`, `role`, and `tabindex`. Add input attributes
where the control actually forwards them, such as `type`, `placeholder`, and
`autocomplete` for text. Do not allow every `on*` or arbitrary key. Check the
actual component forwarding code before adding an attribute.

Errors identify the field, renderer, and prop, for example:
`[loom] Field "document" renderer "file": accept must be an array of strings.`
Throw a configuration error; do not convert strings, drop properties, substitute
a text control, or expose user data in the message. Existing missing-renderer
errors in `RendererRegistry.require` remain useful and must stay.

Limits: TypeScript cannot prove arbitrary callback behavior or JSON content.
Runtime constructor checks do not prove nested application record schemas.
Keep existing value validation and source normalization for those responsibilities.
No new generic validation language or dependency is required.

## Scope

Core owners:

- New `packages/loom/src/renderers/formContracts.ts` for the prop type map and
  focused contract helpers; use a separate private runtime helper if needed to
  keep type-only component imports out of runtime code
- `packages/loom/src/renderers/form.ts`, `registry.ts`, and their export file
- `packages/loom/src/contracts/fields.ts`
- `packages/loom/src/fields/defineFields.ts`, `defaults.ts`, `resolve.ts`, `behavior.ts`
- `packages/loom/src/components/core/Form.vue` only for safe final invocation wiring
- `packages/loom/src/renderers/inputProps.ts` only for typed configuration;
  preserve source normalization and control-value validation behavior
- `packages/loom/src/adapters/plugin.ts` if custom contract registration requires it
- New renderer prop type tests in `packages/loom/src/renderers/__type-tests__/`
- Existing tests under `src/renderers/__tests__`, `src/fields/__tests__`,
  `src/resources/__type-tests__`, `src/contracts/__type-tests__`, and
  `src/components/core/__tests__` in Loom
- One test-only module augmentation file for test renderers; include it in the
  compiler program, not the published application contract

The component paths in the map above are required reads. They are not permission
to edit their behavior. If a prop declaration itself needs correction, use the
STOP condition below and revise this plan with the exact declaration-only change.

Application integration:

- `apps/web/src/framework/inputs/registry.ts` and its directly related tests
- `apps/web/src/routes/(authenticated)/vendor-registration/dynamic-form.ts`
- Its `dynamic-form.spec.ts` and `confirmation-fields.spec.ts`
- New `apps/web/src/framework/__type-tests__/form-renderers.type-test.ts`
- `packages/loom/README.md` and `docs/ui/forms.md`: renderer type/runtime contract only
- This plan and its index row

Other existing field declarations may need precise annotations or correction
when the new contract exposes an invalid prop. Before changing such a caller,
record its path, the diagnostic, and the contract-preserving correction in this
plan. This allowance is only for direct compiler errors caused by this change.
Do not change a control, layout, value, or business requirement to silence a type error.

Out of scope: display renderer typing, API/catalog schema changes, file content
validation, upload size units, new controls, visual work, business rules,
dependencies, skills, route behavior, browser testing, database writes, and publishing.

## Commands

Run from the repository root with existing dependencies.

| Name | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat 9d5f03e..HEAD -- packages/loom apps/web/src/framework/inputs apps/web/src/framework/__type-tests__ 'apps/web/src/routes/(authenticated)/vendor-registration' docs/ui/forms.md` | Compare changed owners; earlier plan changes are expected |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0; negative tests used |
| Registry | `pnpm --filter @southneuhof/loom test src/renderers/__tests__/registry.spec.ts src/renderers/__tests__/inputProps.spec.ts` | All selected tests pass |
| Forms | `pnpm --filter @southneuhof/loom test src/fields/__tests__/defineFields.spec.ts src/fields/__tests__/resolve.spec.ts src/fields/__tests__/behavior.spec.ts src/components/core/__tests__/form.spec.ts` | All selected tests pass |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Adapter tests | `pnpm --filter @southneuhof/framework-web test 'routes/(authenticated)/vendor-registration/dynamic-form.spec.ts' 'routes/(authenticated)/vendor-registration/confirmation-fields.spec.ts'` | Both test files selected and pass |
| Loom suite | `pnpm --filter @southneuhof/loom test` | All non-browser tests pass |
| Web suite | `pnpm --filter @southneuhof/framework-web test` | All unit tests pass |
| Final | `git diff --check` | Exit 0 |

Run `lint:focused` in `@southneuhof/framework-web` for each changed app file,
using paths relative to `apps/web`. Loom has no lint script. Do not run the root
aggregate test command, which includes API work outside this plan.

## Steps

### 1. Establish the contract tests

Run Drift, Types, Registry, Forms, and Adapter tests. Preserve unrelated dirty
files. Inspect the actual component declarations listed in the map before
writing prop types. In particular, NumberInput has a numeric `placeholder`
declaration today; do not silently redesign that component in this plan.

Use `resource-actions.type-test.ts` and `field-references.type-test.ts` as the
test style: small actual schemas, direct public calls, negative directives,
and positive assignments. Add a `form-renderers.type-test.ts` file with:

| Case | Required result |
|---|---|
| file `accept: 'application/pdf'` | Reject |
| file `accept: [123]` | Reject |
| file `accept: ['application/pdf']` | Accept |
| file `maxSize: 'large'` or `multi: 'false'` | Reject |
| `renderer: 'chekbox'` | Reject |
| `props: { accpet: [...] }`, literal and variable | Reject |
| invalid props through `.override()` with inherited renderer | Reject |
| invalid props through `behavior.props` and presentation change | Reject |
| typed ad-hoc catalog and resolved array with invalid file props | Reject |
| custom augmented key with matching props | Accept |
| custom key with wrong props, undeclared key, or wrong registration key | Reject |
| number validator value inference, multi lookup keys, asset no-writer | Preserve existing checks |
| valid ARIA/data attributes and class/style | Accept |
| attempt to replace form-owned model callback through props | Reject |

Test object spreads as well as inline literals. Run Types to show the expected
unused directives before changing the contracts. Do not count a fixture/import
error as proof that a case was rejected correctly.

### 2. Build the typed map and close all declaration paths

Implement the required static contract. Verify the built-in registry keys and
prop map keys match in both directions with a type assertion. Use component
prop extraction so changes to a control's declared props reach field callers.
Avoid copying 28 independent interfaces by hand.

Replace the broad form branches in `defineFields`, its override return types,
and ad-hoc field contracts. Keep table/detail projections open. Add exact-key
guards to inferred definitions where structural typing would still admit extra
props. Type behavior and presentation results while preserving draft/value
inference. Preserve the reference exclusion from Plan 036.

Add explicit test-only custom renderer declarations for fixtures that register
names such as `default`, `explicit`, and `map-widget`. A production wildcard
renderer type is not a valid way to repair fixtures.

Verify with Types: all negative cases are used and all positive cases pass.
Run Registry and Forms to confirm no unrelated runtime change was introduced.

### 3. Validate the final runtime input

Implement one private runtime prop checker and integrate it at final renderer
invocation. Change `controlledInput` so that adaptation has access to the loaded
component's real runtime prop declaration. Preserve the existing async loading
behavior and event forwarding. Pass the renderer name and field key into errors.

Wrap registered custom form components at the registry boundary. Preserve the
existing component-shaped registration for components with runtime declarations;
add an explicit `{ component, assertProps }` entry only for components whose
runtime declarations cannot express the required check. The form-key type and
declared custom prop type still apply to both entry forms. Reject an uncheckable
custom component without an assertion; no silent unvalidated path.

Check supplied props after every reactive change. Validate both base renderer
changes and presentation renderer changes. Do not cache a successful result
solely by field key; a later draft change can make props invalid. Keep input
adapter normalizers synchronous and keep their existing errors.

Add runtime tests through real field resolution and behavior. Cases:

- Invalid file `accept` from explicit props, adapter defaults, source output,
  behavior props, and presentation props each fail with field/renderer/prop context.
- An initially valid form becomes invalid after a draft change; the next render
  rejects it before the input consumes it.
- A valid file accepts the array, renders the expected native accept attribute,
  and does not invoke upload merely because the form renders.
- Required final lookup/table props supplied by a source/default pass; missing
  required final props fail. Do not fail a partial authoring declaration early.
- A custom component validates its declared prop and a custom assertion runs.
- Unknown renderer runtime errors remain deterministic.
- Event forwarding, common attributes, field ordering, and form submission pass
  existing tests. Invalid config never calls submit or upload.

Use `mountCore`, `flush`, and the Vue error handler pattern in the existing core
tests. Keep actual registry, resolver, and behavior code. Do not substitute a
mock resolver that returns the expected result.

Verify with Registry, Forms, and Types: exit 0. Assert errors, not Vue warnings.

### 4. Migrate the dynamic adapter to the checked contract

In `dynamic-form.ts`, replace the local wide field shape and mutable
`Record<string, unknown>` props assembly with the public typed form definition
or resolved-field union. Narrow the catalog renderer with an exhaustive switch
over the supported module keys. Construct each renderer branch as a typed
object. Use `satisfies` where needed to retain literals, not `as FieldsInput`.

Keep the module's renderer allowlist, trusted bank source check, field keys,
labels, current PDF default, and draft serialization. A database field must not
select an arbitrary registered component. Preserve `source` normalization; do
not move bank/upload application logic into Loom.

Update app input adapter declarations to check their supplied built-in props.
Keep the dynamic API schema unchanged. Extend the adapter test to pass output
through the actual framework form path, so invalid runtime configuration can
be rejected even when it originates from unknown input.

Verify with Web types, Adapter tests, and focused app lint: exit 0. Also run
Types because the app must not repair its own error by weakening Loom.

### 5. Finish and review the guarantee

Update only the relevant form contract docs. State the supported extension path
and the distinction between prop validation and control-value validation.
Run Loom suite, Web suite, Types, Web types, and Final. Inspect the entire diff
for broad casts, arbitrary string fallbacks, or weakened old negative tests.

Record any direct caller correction with its original diagnostic. Check the
pre-existing dirty vendor detail route and admin plans remain unchanged by this
work. Record review results and update the index row.

## Done criteria

- [ ] All built-in form keys have component-derived prop types.
- [ ] Wrong renderer names, prop names, and known prop types fail on every public
  authoring path listed in the test matrix, including overrides and behavior.
- [ ] Custom form extensions remain possible through a typed declaration and
  runtime registration; no arbitrary-string overload remains.
- [ ] Runtime checks see final props and reject the reported file error before
  FileInput starts, including reactive behavior changes.
- [ ] Required source/default-provided props are checked only after resolution.
- [ ] Dynamic application fields use the public checked contract without casts.
- [ ] Existing asset/selection/value tests and both full unit suites pass.
- [ ] No eager loading of all input components or new dependency was introduced.
- [ ] The diff and index record checks, actual coverage, and any remaining limit.

## STOP conditions

Stop if a component's public props collapse to `any` after removing an index
signature, if an existing valid control relies on undocumented arbitrary props,
or if a runtime rule would require changing its value or event behavior. Report
the exact component and missing contract. A targeted prop declaration correction
needs a plan update; a control rewrite is outside scope.

Stop if preserving lazy loading requires private Vue internals, if source
normalization must move into the framework, or if inference can only be restored
through a broad fallback. Also stop for unexplained drift or two failed attempts
at the same check. Do not mark only the file case complete while leaving the
other public declaration paths unchecked.

## Maintenance

Component prop declarations remain the source of static and basic runtime prop
shape. Add element-level checks only where erased runtime metadata cannot express
a required invariant, such as `string[]`. Keep their tests beside the checker.
New custom form components need both declared types and a checkable runtime
contract. The framework owns enforcement; module skills need no new checklist.
Do not commit, publish, deploy, or change external systems without a request.

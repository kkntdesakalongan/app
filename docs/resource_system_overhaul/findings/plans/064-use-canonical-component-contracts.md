# Plan 064: Make form inputs use component props and Vue models without translation

## Status

- Status: DONE
- Priority: P1
- Effort: L
- Fix risk: HIGH
- Category: correctness, architecture, types, verification
- Source baseline: `223fc622d9a897014fcbad48df838a19cec398db` (2026-09-24). Live source check: `b57c6f8` (2026-09-24); production source is unchanged, and the user revised `ARCHITECTURE.md` during review.
- Depends on: 062 tracked session and 063 global asset service
- Findings owned: F07, F08, F09; explicit native attributes, loaders, renderers, and component-owned models

**Execution:** Work in the current checkout; source paths are repository-relative. Do not commit, push, upgrade dependencies, change backend contracts, or alter unrelated work. Record commands and exit codes in this bundle's `README.md`. Follow `AGENTS.md`: write no implementation comments and no tautological tests. Expected-red regression tests are preparation, not completion. Missing dependencies or services are BLOCKED, never a passing result.

**Architecture:** Components own their public props, model values, events, and explicitly supported native attributes. Form derives requiredness from its schema, owns one tracked session, and forwards canonical component configuration. Authored inputs name their renderer. Inputs receive loaders in component props; no field `source`, inferred choice synthesis, prop-normalizer, or form-only model conversion exists in the completed architecture. App-level asset services are configured once and used by inputs and previews alike. `defineForm` preserves optional `submit`; a later explicit `:submit` replaces it. Form/DialogForm props are flat; page views contain nested primitive bags. Shared labels, input fragments, and read-only display fragments remain ordinary data. Changes are frontend-only; existing transport adapters remain the explicit API boundary.

## Intent

The same authored prop bag must mean the same thing on a standalone component and inside Form/DialogForm. Supported native attributes are part of the component's public API, not permission to accept arbitrary keys. Component-required props remain required. Schema-derived requiredness is retained; automatic renderer/choice synthesis and field-source conversion are removed.

## Current state and evidence

| Evidence | Defect or required architectural change |
|---|---|
| `forms/compileForm.ts:121–138` | F07: synthesizes renderer and `options: string[]`; SelectInput instead accepts `data`, `pick`, `view`. Remove this synthesis; do not add an options-to-data converter. |
| `forms/behavior.ts:11–38`, `SelectInput.vue:73–75` | F08: a separate kind table rejects numeric values that the component supports. Remove the competing component model description. |
| `Form.vue:125–158`, `forms/behavior.ts:216–242` | F09: requiredness reaches the field state but not the actual input's required prop. |
| `renderers/formContracts.ts:106–108` | Every component prop becomes optional and arbitrary extras are accepted. This hides missing required props and makes misspellings appear valid. |
| `renderers/form.ts:13–110` | CoreTextRenderer differs from TextInput; adaptVModelInput translates a second `value/setValue` protocol into Vue's model contract. |
| `forms/useFormSession.ts:343–381`, `forms/controlValues.ts` | Form silently bridges Date drafts to DateInput strings. The component's actual model at `DateInput.vue:37` is string/null/undefined. |
| `apps/web/src/framework/inputs/registry.ts` | Source adapters copy load/namespace/loadDetail into props that components already accept. |

F07/F08/F09 were source-inspected and reproduced at isolated compiler/state boundaries; no real selector browser pass was previously performed. Native forwarding and global transparency requirements are normative changes, not misattributed implementation regressions. Use `surface-definitions.type-test.ts`, `form-contracts.type-test.ts`, and existing option-input tests as exemplars.

`packages/loom/src/forms/compileForm.ts:121–134`

```ts
    const renderer = typeof input.renderer === 'string' ? input.renderer : inferredRenderers[metadata.kind]
    if (!renderer) {
      throw new Error(`[loom][INPUT_RENDERER_REQUIRED] Form field "${key}" has schema kind "${metadata.kind}" and needs an explicit renderer.`)
    }
    assertRendererInputCompatibility(key, metadata.kind, renderer)
    if (isRecord(input.behavior)) assertFormBehavior(input.behavior, key)

    const props = isRecord(input.props) ? { ...input.props } : {}
    if (renderer === 'select' && metadata.kind === 'enum' && !Object.hasOwn(props, 'options')) {
      props.options = metadata.options ?? []
    }
    const field: CompiledFormField = { key, renderer, required: metadata.required, kind: metadata.kind, props }
    if (isLabel(input.label)) field.label = input.label
    if (isRecord(input.source)) field.source = input.source
```

`packages/loom/src/renderers/formContracts.ts:100–108`

```ts
export type FormRendererKey = keyof FormRendererComponents & string

export type FormRendererPropBag<TRenderer extends keyof FormRendererComponents> = PublicFormProps<
  FormComponentOf<FormRendererComponents[TRenderer]>
>

export type FormRendererProps<TRenderer extends keyof FormRendererComponents> = Partial<
  Omit<FormRendererPropBag<TRenderer>, FormPlumbingKeys>
> & Record<string, unknown>
```

`packages/loom/src/renderers/form.ts:65–73`

```ts
      return () => h(input, {
        ...attrs,
        id: props.id,
        disabled: props.disabled,
        error: props.error,
        modelValue: props.value,
        'onUpdate:modelValue': (value: unknown) => props.setValue(value),
        'onValidation:touch': () => emit('validation:touch'),
      })
```

`packages/loom/src/components/inputs/DateInput.vue:36–46`

```ts
const emit = defineEmits<{ (event: 'validation:touch'): void }>()
const modelValue = defineModel<string | null | undefined>()
const internalValue = ref<Date | null>(null)
const modelUpdated = ref(false)
const dateFormat = props.withTimePicker ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd'

const parseModelValue = (value: string | null | undefined) => {
  if (!value) return null
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return null
  return parsedDate
```

Evidence is source inspection plus the earlier isolated probes stated above, not a claim that pinned Vue/browser tests passed. The probe harness used explicit test doubles. Establish real regressions before implementation. Use Vitest `describe/it/expect` and deferred promises as in the cited existing tests; keep schemas, compiler, session, and the component under test real.

## Scope

Modify these owners, their callers reached through the named contract, and their focused tests:

- `packages/loom/src/contracts/{forms,components}.ts`
- `packages/loom/src/forms/{defineForm,compileForm,behavior,props,useFormSession,controlValues}.ts`
- `packages/loom/src/renderers/{form,formContracts,inputProps,index,registry}.ts`
- `packages/loom/src/components/inputs/**: canonical public props, model/validity and native forwarding only`
- `packages/loom/src/components/composites/form-inputs/{LookupInput,TableInput,LocationInput,MultiLocationInput}.vue and their prop contracts`
- `packages/loom/src/components/core/Form.vue`
- `packages/loom/src/adapters/plugin.ts and affected barrels`
- `apps/web/src/framework/inputs/registry.ts and all its imports (delete)`
- `apps/web/src/routes/**, configs/input-presets.ts, framework/acceptance/** and relevant fixtures: replace source/inferred fields and align actual model types`
- `scripts/{scaffold-bounded-module,module-ui-check,check-surface-architecture}.mjs and tests: this contract migration only`
- `docs/ui/forms.md, docs/resource_system_overhaul/ARCHITECTURE.md, active form/control/asset skills and examples`
- `packages/loom/vitest.browser.config.ts and affected TS/Vue test files`

Out of scope: Backend/SDK protocol changes, replacing Vue or component libraries, arbitrary app workflow redesign, and reintroducing a universal field catalog. Do not weaken schemas or add default props to hide incompatible component usage. App-scoped asset services from the prerequisite remain; remove only the generic renderer prop/source/value adapter machinery.

## Preparation and commands

```sh
git status --short
git diff --stat 223fc622d9a897014fcbad48df838a19cec398db..HEAD -- packages/loom/src apps/web/src scripts .agents/skills docs/ui docs/architecture docs/resource_system_overhaul/ARCHITECTURE.md .github/workflows
```

Compare these excerpts with live code and read the revised `docs/resource_system_overhaul/ARCHITECTURE.md` as the required end contract. Its revision is expected drift from the source baseline. Changes made by declared prerequisite plans are also expected; verify their stated end contracts. Report other unexplained drift before editing. Do not discard unrelated working-tree changes.

Use installed package-local tools pinned by `package.json` and the lockfile. Record the actual Node/pnpm versions. The live baseline passed the listed unit, browser, tooling, architecture, and cold package type gates; rerun them after implementation. The Node 26 Web Storage flag applies to local web and workspace unit runs. CI uses Node 20.19.0.

| Gate | Command | Required result |
|---|---|---|
| Unit | `pnpm --filter @southneuhof/loom test` | Exit 0; scoped regressions run. |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; new files registered in the explicit include list. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0 with strict Vue fixtures. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 without boundary suppressions. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0 on this Node 26 checkout. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; no acceptance allowlist for removed executable paths. |
| Tooling | `pnpm test:module-tooling` | Exit 0 when callers, generators, docs fixtures, or checkers change. |
| Final workspace | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Exit 0 on this Node 26 checkout after the coordinated implementation. |

## Steps

### 1. Make native forwarding explicit at the component owner

Publish the accepted forwarded attributes in each component's public prop/attribute contract. Reuse Vue's native attribute types; select the attributes the component actually supports rather than copying the full DOM catalog. Keep a shared element-level declaration only for genuinely identical forwarding destinations. Component-owned runtime props remain authoritative. Finite accepted native keys are declared at the component boundary, so type checking and runtime declarations agree; remaining `data-*` attributes are the explicit bounded fallthrough family.

For text inputs the contract includes typed `name`, `autocomplete`, `inputmode`, `maxlength`, `minlength`, `pattern`, `readonly`, `placeholder`, `title`, `tabindex`, and `id`, plus supported ARIA attributes. Component-specific props win any type-name collision. Reference `InputHTMLAttributes` and `AriaAttributes` for their value types. `data-${string}` accepts string/number/boolean/null/undefined. An invented bare key such as `options` or `placehoder` is not a native attribute. A select does not accept text-input-only keys solely because another component does.

Keep this interface flat. No field `attrs`, `nativeProps`, or second input-prop bag is introduced. Do not hand-maintain a second form-owned native attribute allowlist. Put `inheritAttrs: false` on wrapped controls and forward supported control attributes to the actual focusable element. Class/style target the component wrapper; id/name/autocomplete/ARIA target the control. Re-emit documented events once. Native event observers remain typed component events; model-update and validity plumbing remain managed by Form.

Read current bindings during rendering. `useAttrs()` reflects current values but is not a reactive source for a cached computed-only forwarding map; test attributes added/removed after mount. Both direct component use and form configuration must expose the same accepted native API.

**Verify:** Loom types and Browser gates. Test maxlength/autocomplete/inputmode, dynamic data attributes, ARIA/id focus links, an invented prop, a misspelling, and two simultaneous inputs. Inspect the actual native element, not the wrapper's Vue props.

### 2. Derive authored props without weakening the component

Replace `Partial<Omit<...>> & Record<string, unknown>` with the selected component's public contract excluding only explicitly Form-owned bindings: model/update, validation-touch/error plumbing, managed required/error/field identity, and internal draft state. Preserve requiredness, defaulted optionality, and discriminated unions. Remove `Record<string, unknown>` fallback when component type extraction fails; fail that authoring path instead.

Validate the whole assembled prop bag, including named objects and spreads. Native attributes are accepted because the component publishes them, not through extras. Managed requiredness is forbidden in authored props/behavior prop patches and supplied after authored props to prevent override. Conditional required hints remain in Form's existing behavior presentation; schema validity remains authoritative. Resolve disabled state from Form, field behavior, and authored component disabled; an authored false cannot enable a parent-disabled field.

Input model compatibility is checked using the selected component's emitted model type and accepted model prop, including cardinality controlled by multi/select props. Every nonempty emitted value must fit the schema input type; canonical null/undefined empty values remain unchanged in FormDraft and may fail schema validation. An incompatible nonempty schema/renderer value fails rather than widening to unknown. Refine the components' own model types by their explicit modes: normal TextInput emits strings; its explicitly numeric constraint modes emit numbers; selection model types follow data/load item keys and multi/asWhole. Preserve those declared component behaviors and make their public types accurate instead of adding form-specific mode guesses. A broad nonempty union must not be accepted merely because one member fits. Runtime checks cover known structural options and component-owned validity; erased generic proofs are not replaced by a handwritten renderer-to-Zod-kind map.

**Verify:** Loom/Web types and Unit gates. Positive numeric selection and negative missing-required/unknown-prop fixtures include inline, variable, spread, optional and union branches. A custom required prop remains required through defineForm.

### 3. Bind Vue models directly and use the real component registry

Form renders registered components using their canonical model contract:

```vue
<component
  :is="inputComponent"
  v-bind="field.props"
  :model-value="fieldValue"
  :required="resolvedRequired"
  :disabled="resolvedDisabled"
  @update:model-value="setFieldValue"
  @validation:touch="touchField"
  @validation:error="reportFieldError"
/>
```

The exact error/id plumbing remains component-owned and typed. Input slots keep their typed `value`/`setValue` interaction context; that is not a second component renderer protocol. Remove `adaptVModelInput`, `controlledInput`, and the separate CoreTextRenderer; register the actual TextInput and other public components, lazily where appropriate. Derive built-in keys from one runtime roster; preserve custom component type augmentation without repeating key lists.

Remove `forms/controlValues.ts` and date-special branches from Form. Preserve DateInput's canonical string/null/undefined model. Date-to-input formatting belongs in an explicit draft loader; string-to-command conversion belongs in its explicitly declared form schema. A Date schema input bound directly to the string-model component is invalid. Components may format their internal widgets according to their own declared model; direct and managed usage must behave identically. Do not add another Date/string transformer elsewhere in Form or the renderer registry.

**Verify:** Unit, Browser, and both type gates. Test direct versus managed TextInput, numeric SelectInput, DateInput, custom inputs, native attributes, requiredness, combined disabled state, and exact emitted model shapes.

### 4. Require explicit renderers and canonical loader props

Every authored form input names `renderer`, including in shared fragments. Remove inferredRenderers, enum-options synthesis, schema-kind compatibility tables, field `source`, source normalization, generic prop defaults/hydration, and their exports. Preserve schema input-key/validation/required metadata; it no longer constructs a UI. The entire inputProps registry becomes unused and is deleted, not renamed.

```ts
const statusProps = {
  data: [{ code: 'draft', caption: 'Draft' }, { code: 'active', caption: 'Active' }],
  pick: 'code',
  view: 'caption',
} as const

const roleProps = {
  load: roles.list.table.load,
  namespace: roles.list.table.namespace,
  pick: 'id',
  view: 'name',
  searchParameters: { active: true },
} as const

const createUserForm = defineForm({
  schema: createUserSchema,
  labels: userLabels,
  fields: {
    name: { renderer: 'text', props: { autocomplete: 'name', maxlength: 120 } },
    roleId: { renderer: 'select', props: roleProps },
    status: { renderer: 'select', props: statusProps },
    attachment: { renderer: 'file' },
  },
  submit: createUser,
})
```

The selected loader already satisfies the component context/result/cancellation contract; component code does not inspect the resource or guess envelope members. Lookup's `loadDetail` and independent table definition likewise live in canonical props. Static options follow that component's actual API; `options` remains valid for components such as Chip whose API owns it. Do not ban a property globally based on SelectInput.

**Verify:** Unit, Browser, both type gates, Architecture and Tooling. Missing renderer and select `options: string[]` fail; real explicit choices work; direct resource loaders preserve their policies; file input still works without field wiring.

### 5. Migrate every producer and remove alternate meanings

Update all app input fragments, standalone forms, nested forms, renderer tests, schemas that relied on hidden Date conversion, scaffolder manifests/output, and module/static checks. Retain one schema per operation, shared labels and explicit display fragments. Preserve model-only forms, submit-presence inference, and Form/DialogForm flat props.

Remove `InputPropsRegistry`, adapter/default/normalizer/hydrate interfaces and injection, `FrameworkPlugin.inputProps`, source-only app registry modules, and every caller. Move component validity checks to the component-local validity contract rather than leaving them in a new registry. Update current control guides and architecture facts in this same plan so subsequent implementations cannot follow obsolete inference/source instructions.

**Verify:** all scoped gates and `git diff --check`; `rg -n 'adaptVModelInput|coreTextRenderer|inferredRenderers|dateControlValueAdapter|InputPropsRegistry|createInputPropsRegistry' packages/loom/src apps/web/src` has no production matches. Syntax-aware checks reject field-level source while retaining unrelated legitimate source properties.

## Test plan

Extend surface-definition and renderer-contract tests and add a canonical-props browser fixture. Use the real controls, not slots that replace them. Test required component props, defaulted optional props, multi-state unions, native attributes, late prop/attribute addition/removal, handler preservation, numeric/string selections, explicit dates, and incompatible schema inputs. The F07 replacement test rejects inference rather than requiring an inferred selector. F09 tests a component reacting to its actual required prop. Test custom renderer registration without any form adapter registration.

## Done criteria

- [x] Authored renderer props are the component contract minus managed plumbing; no blanket optionalization/extras.
- [x] Supported native attributes are typed, flat, and forwarded to a documented native target.
- [x] Every authored form field has an explicit renderer; no choice/renderer synthesis survives.
- [x] Loader props bind directly; field source and the generic inputProps registry are absent.
- [x] Form binds Vue models directly; CoreTextRenderer/model adapters and Form-only Date conversion are absent.
- [x] Requiredness has one schema-derived owner and reaches the actual control.
- [x] Scoped unit/browser/type gates pass with exact executed commands, counts, skips, and exit status recorded.
- [x] Only scoped owners, dependent callers, tests, current documentation, and plan status changed; review `git diff --check` and `git diff --stat`.
- [x] No compatibility alias, fallback to a removed contract, public `any` facade, or type-suppression escape was added.

## STOP conditions

Stop if a generic component's valid props cannot survive the pinned Vue checker, a component requires incompatible model values, or a change would need a backend schema relaxation. Fix the component's actual public contract and its tests; do not restore blanket extras, hide the problem behind a new adapter, or cast a schema to fit.

Do not improvise a new backend contract or suppress a required check. Report a repeated verification failure after two targeted repair attempts. A missing browser, dependency, database, or storage prerequisite blocks that gate rather than justifying a stubbed substitute.

## Maintenance

Native forwarding is an intentional part of a component API. Add supported native keys once at that owner, with a native-element test. Component implementations can reuse internal logic; no reuse mechanism may give a component a different public API inside Form. Keep required/default rules at their authoritative owners.

## References

Vue explicit attribute forwarding and non-reactive useAttrs: `https://vuejs.org/guide/components/attrs`. Imported prop-type conversion limitations: `https://vuejs.org/guide/typescript/composition-api`. Use the pinned compiler to prove the selected public type construction.

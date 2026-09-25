# Plan 059: Keep authored form definitions canonical and remove the compiled-form language

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
- **Depends on**: none
- **Category**: tech-debt, architecture, dx
- **Planned at**: ZIP snapshot `carta-resource_system_overhaul (1).zip`, SHA-256 `f1592ed94f925cbc5e2bead3e108f76d8f21d900daaf084f9fa1e71448b106b2`, 2026-09-25; Git SHA unavailable in the snapshot

## Why this matters

The public architecture says a `FormDefinition` is the canonical authored form configuration. The current runtime still creates and exports a second flattened `CompiledForm`/`CompiledFormField` representation, and `defineForm` constructs that representation only to discard it. This duplicates field semantics and gives future code a tempting place to add hidden normalization.

The target keeps all real Form-owned field metadata — including `renderer`, `span`, `initialValue`, dynamic `behavior.presentation.renderer`, and `derived` — on the authored field definition. Runtime code may derive ephemeral state, but it must reference the authored field instead of copying its semantic members into another frontend language.

The schema runtime also still carries `kind` and enum `options` metadata left over from renderer/choice inference. Renderer choice is now explicit, so the Form runtime needs only finite input keys, requiredness, parsing, and issue normalization.

## Current state

### Form compilation duplicates the field definition

`packages/loom/src/forms/compileForm.ts:8-29` defines a second field/form representation:

```ts
export interface CompiledFormField {
  key: string
  renderer: string
  required: boolean
  label?: Label
  props: Readonly<Record<string, unknown>>
  span?: number
  initialValue?: () => unknown
  behavior?: Readonly<Record<string, unknown>>
}

export interface CompiledForm<...> {
  definition: FormDefinition<...>
  schema: RawSchema<TInput, TOutput>
  inputKeys: readonly string[]
  fields: readonly CompiledFormField[]
  parseAsync: ...
}
```

`packages/loom/src/forms/compileForm.ts:101-128` then copies authored members into that representation:

```ts
const props = isRecord(input.props) ? { ...input.props } : {}
const field: CompiledFormField = { key, renderer, required: metadata.required, props }
if (isLabel(input.label)) field.label = input.label
if (typeof input.span === 'number') field.span = input.span
if (isFactory(input.initialValue)) field.initialValue = input.initialValue
if (isRecord(input.behavior)) field.behavior = { ...input.behavior }
fields.push(field)
```

The canonical authored object already contains all of those values.

### `defineForm` compiles only to validate, then returns the original shape

`packages/loom/src/forms/defineForm.ts:258-268`:

```ts
>(definition: FormDefinitionInput<...>): unknown {
  compileForm(definition)

  const result: Record<string, unknown> = {
    schema: definition.schema,
    fields: snapshotMap(definition.fields, snapshotInput),
  }
  ...
  return result
}
```

The compiled result is discarded.

### Form/session and behavior depend on compiled vocabulary

`packages/loom/src/forms/useFormSession.ts:12-14,207-208` imports and creates the compiled representation:

```ts
import { createFormBehaviorRuntime, type FormBehaviorRuntime } from './behavior'
import { compileForm, type CompiledForm, type CompiledFormField } from './compileForm'
...
const compiled = computed(() => compileForm(definitionFromProps(props)))
const initialCompiled = compiled.value
```

`packages/loom/src/forms/behavior.ts:5,29-35` also uses the flattened type:

```ts
import type { CompiledFormField } from './compileForm'
...
export interface FormBehaviorRuntimeOptions {
  fields: readonly CompiledFormField[]
  ...
  resolveBaseProps: (field: CompiledFormField, renderer: string) => Record<string, unknown>
}
```

Dynamic renderer support is real and must remain. `behavior.ts:198-227` resolves runtime presentation from the authored/static renderer plus `behavior.presentation`.

### The schema runtime still exposes presentation-oriented metadata

`packages/loom/src/contracts/schema.ts:10-16`:

```ts
export type SchemaFieldKind = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'object' | 'array' | 'unknown'

export interface SchemaFieldMetadata {
  kind: SchemaFieldKind
  required: boolean
  options?: readonly string[]
}
```

`packages/loom/src/schemas/compileSchema.ts:148-202` derives enum options and field kinds, and `:252-288` stores them in `fields` even though Form now uses only requiredness.

The static display checker still imports `SchemaFieldKind` through `packages/loom/src/display/requirements.policy.d.mts`; that checker already derives its own Zod kind information in `scripts/module-ui-check.mjs` and does not need Form's runtime schema metadata.

### Public-ish vocabulary remains exported from the forms barrel

`packages/loom/src/forms/index.ts:1-3`:

```ts
export { compileForm } from './compileForm'
export type { CompiledForm, CompiledFormField } from './compileForm'
export { defineForm } from './defineForm'
```

The package root exports only `defineForm`, but this internal barrel still establishes a second framework vocabulary.

### Existing test patterns

- `packages/loom/src/forms/__tests__/defineForm.spec.ts` checks transparent snapshots and currently calls `compileForm` directly.
- `packages/loom/src/schemas/__tests__/compileSchema.spec.ts` already covers Zod v3/v4 finite object discovery, requiredness, async parsing, issue paths, and output-key inspection.
- `packages/loom/src/forms/__tests__/useFormSession.spec.ts` proves `derived` behavior and load/session behavior.
- `packages/loom/src/components/composites/__type-tests__/flat-form-components.type-test.vue` and related form fixtures prove the public `v-bind` shape.

Match those test styles. Do not add source-string tests for behavior that can be exercised through the real API.

## Fixed target architecture

There is no public or internal semantic `CompiledForm` language.

The authored field remains canonical:

```ts
const form = defineForm({
  schema,
  fields: {
    description: {
      renderer: 'textarea',
      span: 2,
      props: { rows: 5 },
      behavior: {
        presentation: ({ draft }) => ({
          renderer: draft.rich ? 'rich-text' : 'textarea',
          span: draft.expanded ? 2 : 1,
        }),
      },
    },
  },
})
```

Internal runtime code may hold only the extra facts Form owns and cannot read directly from the authored field:

```ts
interface RuntimeFormField {
  readonly key: string
  readonly input: FormInput<any, any, any>
  readonly required: boolean
}
```

`input` is the actual snapshotted authored field object. Runtime code reads:

```ts
field.input.renderer
field.input.props
field.input.span
field.input.initialValue
field.input.behavior
```

Do not copy those members into `RuntimeFormField`.

Schema runtime is an internal adapter, not a UI compiler:

```ts
interface SchemaRuntime<TOutput extends object> {
  readonly inputKeys: readonly string[]
  readonly requiredKeys: ReadonlySet<string>
  readonly parseAsync: (input: unknown) => Promise<SchemaParseResult<TOutput>>
}
```

Keep `schemaOutputKeys(schema)` as a separate internal inspection utility for Table/Detail record-key checks. Remove runtime `kind` and enum `options` metadata from the Form schema path.

Dynamic renderer switching and `derived` behavior remain supported. `span` remains Form-owned layout metadata. This plan does not change `FormDraft`, resource/cache props, loaders, submit behavior, or component contracts.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused form/schema tests | `pnpm --filter @southneuhof/loom test -- src/forms/__tests__/defineForm.spec.ts src/forms/__tests__/useFormSession.spec.ts src/schemas/__tests__/schemaRuntime.spec.ts` | exit 0; all selected tests pass |
| Loom type check | `pnpm --filter @southneuhof/loom type-check` | exit 0, no errors |
| Loom unit suite | `pnpm --filter @southneuhof/loom test` | exit 0 |
| Loom browser suite | `pnpm --filter @southneuhof/loom test:browser` | exit 0 |
| Web type check | `pnpm --filter @southneuhof/framework-web type-check` | exit 0 |
| Architecture gate | `pnpm test:surface-architecture` | exit 0 |
| Final workspace gates | `pnpm type-check && pnpm test && pnpm lint && pnpm build` | all commands exit 0 |

If the focused Vitest command syntax does not select files in this workspace, run the package unit suite instead. Do not change test configuration just to make the command shorter.

## Scope

**In scope**:

- `packages/loom/src/forms/compileForm.ts` — delete
- `packages/loom/src/forms/assertFormDefinition.ts` — create as the single runtime definition validator
- `packages/loom/src/forms/defineForm.ts`
- `packages/loom/src/forms/useFormSession.ts`
- `packages/loom/src/forms/behavior.ts`
- `packages/loom/src/forms/index.ts`
- `packages/loom/src/forms/__tests__/defineForm.spec.ts`
- `packages/loom/src/forms/__tests__/useFormSession.spec.ts` only where compiled vocabulary is referenced or invariants need coverage
- `packages/loom/src/schemas/compileSchema.ts` — replace with `packages/loom/src/schemas/schemaRuntime.ts`
- `packages/loom/src/schemas/index.ts`
- `packages/loom/src/schemas/__tests__/compileSchema.spec.ts` — rename to `schemaRuntime.spec.ts`
- `packages/loom/src/contracts/schema.ts`
- `packages/loom/src/contracts/index.ts`
- `packages/loom/src/display/requirements.policy.d.mts`
- `packages/loom/src/components/core/{Form.vue,Table.vue,TableContent.vue,Detail.vue}` — import/runtime-field adaptation only
- `docs/resource_system_overhaul/ARCHITECTURE.md`
- `scripts/check-surface-architecture.mjs` and `.test.mjs` only to enforce removal of the compiled-form API if needed
- `plans/README.md` status update after implementation/review

**Out of scope**:

- `resetWhen` removal and dependent-selection invalidation; Plan 060 owns that.
- Removing or restricting dynamic `behavior.presentation.renderer`.
- Removing `derived`.
- Changing `FormDraft<T>` null/undefined semantics.
- Moving `id`, `resource`, `namespace`, or `searchParameters` out of Form.
- Resource binding, asset services, transport encoders, backend schemas, and API behavior.
- Rewriting static display policy; only detach its type from Form schema metadata.

## Git workflow

- Preserve the current branch and unrelated working-tree changes.
- Do not commit, push, or open a PR unless the operator asks.
- Use the repository's existing naming/style conventions and ASD-STE100 guidance from `AGENTS.md`.
- Do not add code comments; `AGENTS.md` forbids implementation comments.

## Steps

### Step 1: Add regressions that preserve the important behavior and reject the extra vocabulary

Update `packages/loom/src/forms/__tests__/defineForm.spec.ts` so it proves:

1. `defineForm` returns the transparent snapshotted definition.
2. `renderer`, `props`, `span`, `initialValue`, and behavior callbacks remain on that definition unchanged.
3. required and optional schema fields resolve correctly when mounted through Form; the test must not inspect a compiled object.
4. an equivalent valid plain definition passed directly to Form follows the same runtime validation path.
5. invalid JS definitions still fail with the existing stable diagnostics.

Keep the current `derived` test in `useFormSession.spec.ts` as a positive control. Add or retain a dynamic renderer + span browser/unit case so removing the flattened compiler cannot accidentally remove these Form-owned capabilities.

Replace runtime/public tests that import `compileForm`, `CompiledForm`, or `CompiledFormField` with tests of the actual consumer seam. If a type-only absence check is needed, use a negative TypeScript import; do not test type absence through JavaScript reflection.

**Verify**: run the focused Form unit tests. The new behavior assertions must pass before semantic refactoring, except explicit negative removal checks which become green only after Step 5.

### Step 2: Replace schema compilation with a narrow internal schema runtime

Create `packages/loom/src/schemas/schemaRuntime.ts` and move the legitimate Zod adaptation there.

Keep exactly these responsibilities:

- validate that the raw schema exposes a finite discoverable object input;
- return ordered input keys;
- identify required keys without executing defaults/refinements/transforms;
- parse asynchronously and normalize issues;
- inspect output keys through `schemaOutputKeys` without executing transforms.

Use a target shape equivalent to:

```ts
export interface SchemaRuntime<TOutput extends object> {
  readonly inputKeys: readonly string[]
  readonly requiredKeys: ReadonlySet<string>
  readonly parseAsync: (input: unknown) => Promise<SchemaParseResult<TOutput>>
}

export function createSchemaRuntime<TSchema extends RawSchema<object, object>>(
  schema: TSchema,
): SchemaRuntime<RawSchemaOutput<TSchema>>
```

Do not expose the raw Zod implementation through the runtime result unless an existing internal caller genuinely needs the exact reference. The Form already has `definition.schema`.

Delete:

- `stringOptions`;
- `fieldKind`;
- `SchemaFieldMetadata`;
- Form-runtime enum option extraction;
- Form-runtime schema `kind` metadata.

Remove `SchemaFieldKind` from `contracts/schema.ts` and `contracts/index.ts`. In `display/requirements.policy.d.mts`, declare a private/local `DisplaySchemaKind` union matching only the static display policy's accepted values. `scripts/module-ui-check.mjs` already derives its own schema kinds; do not couple it back to Form runtime metadata.

Update Table/TableContent query parsing and TableContent/Detail output-key imports to `schemaRuntime.ts`.

Rename the schema tests and retain these cases:

- Zod v3/v4 finite keys;
- required vs optional/default/catch/prefault;
- no execution during inspection;
- async parse and nested issue paths;
- pass-through/catch-all/undiscoverable input rejection;
- output-key inspection without transforms.

Delete expectations for scalar `kind` and enum `options`.

**Verify**: `pnpm --filter @southneuhof/loom test -- src/schemas/__tests__/schemaRuntime.spec.ts` → exit 0.

### Step 3: Split validation from runtime field resolution

Create `packages/loom/src/forms/assertFormDefinition.ts` by moving the runtime structural validation currently in `compileForm.ts`:

- top-level member whitelist;
- required raw schema;
- label dictionary shape;
- validator descriptor shape;
- submit function shape;
- safe string field keys;
- selected field key exists in schema input;
- `assertFormInput`;
- `assertFormBehavior`.

`assertFormDefinition` returns `void`. It must not create a second form object or field array.

`defineForm` calls `assertFormDefinition(definition)`, then snapshots and returns the authored definition exactly as it does now.

The direct plain-object Form path must call the same validator through `useFormSession`; constructor use must not be a hidden semantic prerequisite.

**Verify**: `defineForm.spec.ts` invalid-JavaScript cases remain green and a direct plain-object Form test receives the same error code for the same invalid structure.

### Step 4: Make session/runtime fields reference authored inputs

Delete `CompiledForm` and `CompiledFormField`.

Inside the forms runtime, use one private/internal runtime field shape:

```ts
interface RuntimeFormField {
  readonly key: string
  readonly input: FormInput<any, any, any>
  readonly required: boolean
}
```

Do not export this from Loom's root or forms barrel. Put the internal type in the narrowest owner shared by `useFormSession.ts` and `behavior.ts`; do not create another public contract module.

In `useFormSession.ts`:

- derive the current `FormDefinition` from flat props;
- validate it;
- create the schema runtime;
- create runtime fields by iterating `definition.fields` in declaration order and attaching only `key`, `input`, and schema-derived `required`;
- expose internal `fields`/lookup helpers to `Form.vue` instead of `session.compiled`;
- keep input-key filtering, initial-value precedence, loaders, validation, submit, and session-generation behavior unchanged.

In `behavior.ts`, read authored data through `field.input`:

```ts
field.input.renderer
field.input.props
field.input.label
field.input.span
field.input.behavior
```

Keep reactive resolved state for values Form genuinely derives at runtime:

- `visible`;
- `disabled`;
- dynamic `renderer`;
- effective `props`;
- resolved `label`;
- effective `span`;
- schema/conditional `required`;
- `derived` value.

Dynamic `behavior.presentation.renderer` is a required feature and must continue to work. `span` remains Form-owned layout metadata. This step must not make renderer static.

Update `Form.vue` to obtain the static fallback renderer/span from the authored input reference rather than a compiled copy.

**Verify**: Form/session unit tests, `SelectForm.browser.spec.ts`, and `SurfaceParity.browser.spec.ts` pass. Add a focused dynamic-renderer test if the existing suites do not already switch renderer at runtime.

### Step 5: Delete compiler vocabulary and update the architecture reference

Delete `packages/loom/src/forms/compileForm.ts` and remove its exports from `forms/index.ts`.

Rename/remove every remaining source import of:

- `compileForm`;
- `CompiledForm`;
- `CompiledFormField`;
- `compileSchema`;
- `CompiledSchema`;
- `SchemaFieldMetadata`;
- `SchemaFieldKind` as a public Form/schema runtime contract.

Do not rename these concepts and keep the same semantic layer. The target is removal, not vocabulary substitution.

Update `docs/resource_system_overhaul/ARCHITECTURE.md` to state:

- authored `FormDefinition` is canonical;
- runtime fields reference the authored input and add only framework-derived facts;
- schema runtime owns keys, requiredness, parsing, and issue normalization;
- `renderer`, `span`, `initialValue`, `behavior`, and canonical component props remain on the field definition;
- dynamic renderer and `derived` remain supported.

Update the implementation-ownership table to remove `compileForm`/`compileSchema` language.

Extend `scripts/check-surface-architecture.mjs` only if necessary to reject new executable/public uses of `compileForm`/`CompiledForm*`. Keep historical plan/evidence files exempt; do not rewrite historical records.

**Verify**:

```sh
rg -n 'compileForm|CompiledForm(Field)?|compileSchema|CompiledSchema|SchemaFieldMetadata' packages/loom/src apps/web/src scripts .agents/skills docs/ui docs/resource_system_overhaul/ARCHITECTURE.md
```

Expected: no executable/current-authoring matches. Historical files under `plans/` or `docs/resource_system_overhaul/findings/` are not part of this zero-match requirement.

Then run Loom unit/browser/type checks and `pnpm test:surface-architecture`.

## Test plan

Add/adjust tests so a plausible broken implementation fails:

- `defineForm.spec.ts`: transparent snapshot, invalid JS structure, no compiler inspection.
- `schemaRuntime.spec.ts`: finite keys, requiredness, async parse, normalized issues, no metadata execution, output keys, Zod v3/v4.
- `useFormSession.spec.ts`: `derived` remains functional; loaders/defaults/late-load behavior are unchanged.
- browser or existing parity fixture: `behavior.presentation.renderer` actually switches between two compatible registered inputs and keeps the model; dynamic `span` changes layout state without a compiler copy.
- type/public API fixture: removed compiler vocabulary cannot be imported as a supported API.

Do not test implementation details such as the exact runtime field object key order. Test only the canonical definition and observable Form behavior.

## Done criteria

- [ ] `compileForm.ts`, `CompiledForm`, and `CompiledFormField` are absent from executable/current API code.
- [ ] `defineForm` validates without constructing a second form representation.
- [ ] Form/session runtime fields reference the authored field definition and add only `key` + framework-derived facts such as `required`.
- [ ] Dynamic renderer, `span`, `initialValue`, `behavior`, and `derived` remain supported.
- [ ] Schema runtime exposes only finite keys, requiredness, parse/issue behavior, plus separate output-key inspection; it has no Form UI-choice metadata.
- [ ] `SchemaFieldKind`/`SchemaFieldMetadata` are not public Form/schema-runtime vocabulary; static display policy has its own private kind type.
- [ ] Equivalent valid plain form definitions and `defineForm` results behave the same.
- [ ] Loom unit, browser, type, web type, architecture, and final workspace gates pass.
- [ ] No compatibility alias, renamed compiler facade, type suppression, or `any` escape was added.
- [ ] `plans/README.md` status row is updated after implementation and review.

## STOP conditions

Stop and report instead of improvising if:

- a non-historical production caller genuinely consumes schema `kind` or enum `options` for behavior other than removed renderer/choice inference;
- removing the flattened field copy makes dynamic renderer or dynamic span impossible without changing their public contracts;
- an equivalent plain object cannot use the same validator/runtime path as `defineForm` without introducing a constructor brand;
- preserving current Zod v3/v4 behavior requires executing defaults/refinements/transforms during inspection;
- the repair appears to require changing `FormDraft`, resource loading/cache contracts, backend schemas, or component model contracts;
- a required verification command fails twice after a targeted correction.

## Maintenance notes

The authored surface definition is the source of truth. Runtime structures may cache or index it, but they must not copy its semantic members into a second frontend language. Add future Form-owned metadata directly to `FormInput`; add component-owned configuration to that component's canonical props; add schema facts only to the schema runtime when Form genuinely consumes them independently of UI choice.

# Plan 067: Enforce whole-contract type checks and export compact definitions

## Status

- Status: TODO
- Priority: P2
- Effort: L
- Fix risk: HIGH
- Category: correctness, architecture, types, verification
- Source baseline: `223fc622d9a897014fcbad48df838a19cec398db` (2026-09-24). Live source check: `b57c6f8` (2026-09-24); production source is unchanged, and the user revised `ARCHITECTURE.md` during review.
- Depends on: 064, 065, 066; canonical component and View contracts must be stable
- Findings owned: F18 (static guards), F19, F22

**Execution:** Work in the current checkout; source paths are repository-relative. Do not commit, push, upgrade dependencies, change backend contracts, or alter unrelated work. Record commands and exit codes in this bundle's `README.md`. Follow `AGENTS.md`: write no implementation comments and no tautological tests. Expected-red regression tests are preparation, not completion. Missing dependencies or services are BLOCKED, never a passing result.

**Architecture:** Components own their public props, model values, events, and explicitly supported native attributes. Form derives requiredness from its schema, owns one tracked session, and forwards canonical component configuration. Authored inputs name their renderer. Inputs receive loaders in component props; no field `source`, inferred choice synthesis, prop-normalizer, or form-only model conversion exists in the completed architecture. App-level asset services are configured once and used by inputs and previews alike. `defineForm` preserves optional `submit`; a later explicit `:submit` replaces it. Form/DialogForm props are flat; page views contain nested primitive bags. Shared labels, input fragments, and read-only display fragments remain ordinary data. Changes are frontend-only; existing transport adapters remain the explicit API boundary.

## Intent

A valid union member cannot hide an invalid one. Custom input slots retain their field's value/setter type through every wrapper. Constructors check the complete configuration once, then expose compact contracts rather than the full schema/literal/proof graph. Preserve useful inference and required bindings; hide implementation machinery.

## Current state and evidence

| Finding | Baseline evidence and limit |
|---|---|
| F18 | `tables/defineTable.ts:11–35` and `details/defineDetail.ts:11–35` distribute successful unknown/failed never branches over value unions. A prior actual-constructor TS probe accepted string-or-object for a string-only renderer. `resources/operations.ts:284–308,338–342` has related identity/action-map/reserved-name holes. Resource guard probes isolated the expressions rather than checking the full Vue graph. Runtime result identity is repaired by plan 065. |
| F19 | `Form.vue:58–60,130–140` exposes slot value/setter as unknown. Wrapper slot declarations do not restore per-key input types. Pinned Vue consumer behavior was not previously executed. |
| F22 | `forms/defineForm.ts:144–165`, table/detail constructors and resource return types retain full schema/literal generics; resources/index.ts exports guards/intermediate types. Performance consequences are unmeasured. |

Use existing `contracts/__type-tests__/surface-definitions.type-test.ts`, resource and renderer `__type-tests__`, and actual Vue SFC fixtures. An expected-error comment proves rejection only when its absence would make the checker fail; include valid controls and avoid casting the tested value.

`packages/loom/src/tables/defineTable.ts:11–35`

```ts

type ReadValue<TRecord extends object, TKey extends string, TColumn> = TColumn extends { read: (record: TRecord) => infer TValue }
  ? TValue
  : TKey extends keyof TRecord ? TRecord[TKey] : never

type DisplayRendererGuard<TColumn, TValue> = TColumn extends { renderer: infer TRenderer }
  ? TRenderer extends DisplayRendererKey
    ? DisplayRendererHasValue<TRenderer> extends true
      ? TValue extends DisplayRendererValue<TRenderer> ? unknown : never
      : unknown
    : never
  : unknown

type DisplayPropsGuard<TColumn> = TColumn extends { renderer: infer TRenderer }
  ? TRenderer extends DisplayRendererKey
    ? 'props' extends keyof TColumn
      ? TColumn extends { props?: infer TProps }
        ? TProps extends DisplayRendererProps<TRenderer> ? unknown : never
        : never
      : unknown
    : never
  : unknown

type TableRecordKeyGuard<TRecord extends object, TKey extends string, TColumn> =
  TKey extends Extract<keyof TRecord, string>
```

`packages/loom/src/resources/operations.ts:284–308`

```ts
type IdentityRecordGuard<TRecord, TIdentityRecord extends object> = [TRecord] extends [never]
  ? never
  : TRecord extends object
    ? TRecord extends TIdentityRecord ? unknown : never
    : never

type SubmitFunctionResult<TForm> = TForm extends { submit: infer TSubmit }
  ? TSubmit extends (...args: never[]) => infer TResult ? ResultRecord<TResult> : never
  : never

type IdentityResultGuard<TResult, TIdentityRecord extends object> = [TResult] extends [never]
  ? never
  : TResult extends object
    ? TResult extends TIdentityRecord ? unknown : never
    : never

type OperationRecordGuard<TDefinition, TIdentityRecord extends object> =
  (TDefinition extends { list: { table: infer TTable } }
    ? IdentityRecordGuard<TableRecord<TTable>, TIdentityRecord>
      & IdentityRecordGuard<CollectionRecord<TTable extends { load: infer TLoad } ? TLoad : never>, TIdentityRecord>
      & (CollectionRecord<TTable extends { load: infer TLoad } ? TLoad : never> extends TableRecord<TTable> ? unknown : never)
    : unknown)
  & (TDefinition extends { create: { form: infer TForm } }
    ? FormOutputGuard<TForm> & IdentityResultGuard<SubmitFunctionResult<TForm>, TIdentityRecord>
    : unknown)
```

`packages/loom/src/resources/operations.ts:338–342`

```ts
type CustomActionGuard<TActions> = TActions extends object
  ? Exclude<Extract<keyof TActions, string>, 'list' | 'create' | 'detail' | 'update' | 'delete'> extends never
    ? never
    : { [TKey in keyof TActions]: NoExtraKeys<TActions[TKey], ResourceCustomCommand> & CustomPermissionGuard<TActions[TKey]> }[keyof TActions]
  : never
```

`packages/loom/src/forms/defineForm.ts:144–165`

```ts
type DefinedForm<
  TSchema extends RawSchema<object, object>,
  TFields extends object,
  TLabels,
  TValidators,
  TSubmit,
> = Omit<FormDefinition<RawSchemaInput<TSchema>, RawSchemaOutput<TSchema>, SubmitResult<TSubmit>>, 'schema' | 'fields' | 'labels' | 'validators' | 'submit'> & {
  readonly schema: TSchema
  readonly fields: ReadonlySurfaceConfiguration<TFields>
} & OptionalMember<'labels', TLabels> & OptionalMember<'validators', TValidators> & OptionalMember<'submit', TSubmit>

type FormDefinitionInput<
  TSchema extends RawSchema<object, object>,
  TFields extends FormFields<RawSchemaInput<TSchema>>,
  TLabels extends LabelDictionary | undefined,
  TValidators extends readonly FormValidatorEntry<RawSchemaInput<TSchema>, RawSchemaOutput<TSchema>>[] | undefined,
> = {
  schema: TSchema & FormSchemaGuard<TSchema>
  fields: TFields & FormFieldsGuard<RawSchemaInput<TSchema>, TFields>
  labels?: TLabels
  validators?: TValidators
}
```

Evidence is source inspection plus the earlier isolated probes stated above, not a claim that pinned Vue/browser tests passed. The probe harness used explicit test doubles. Establish real regressions before implementation. Use Vitest `describe/it/expect` and deferred promises as in the cited existing tests; keep schemas, compiler, session, and the component under test real.

## Scope

Modify these owners, their callers reached through the named contract, and their focused tests:

- `packages/loom/src/{forms/defineForm,tables/defineTable,details/defineDetail}.ts`
- `packages/loom/src/contracts/{forms,display,tables,details,schema,views,index}.ts`
- `packages/loom/src/renderers/{formContracts,displayContracts,index}.ts`
- `packages/loom/src/resources/{operations,defineResource,bindResource,index}.ts`
- `packages/loom/src/components/core/Form.vue, composites/DialogForm.vue, views/FormView.vue: typed slots/ref declarations`
- `packages/loom/src/index.ts and public export tests`
- `packages/loom/src/**/__type-tests__/**`
- `apps/web/src/framework/__type-tests__/** and framework/hono/__type-tests__/**: affected consumer proofs`
- `packages/loom/tsconfig.json and apps/web/tsconfig*.json: strict fixture coverage only`
- `docs/resource_system_overhaul/findings/plans/implementation-evidence/: compiler measurement logs and type-surface inventory`

Out of scope: Backend types, schema-library upgrades, disabling strictness, a generic proof framework, broad renderer/model conversions, and benchmark-driven removal of useful public inference. Do not claim lower checking cost without comparable measurements.

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

### 1. Add mixed-member failure fixtures and record a baseline

Test a renderer declared to accept string against `string | { id: string }`, string alone, and wholly incompatible number. Test optional values, nullable values, never, broad unknown, custom accessor results, and a named fragment spread. Preserve nullish empty-display handling at its documented owner rather than rejecting every optional record.

For resources, combine one valid custom action with one invalid action, valid and reserved names in one map, valid and malformed identity members in one result union, and operations returning minimal identity records without display joins. Every unsupported member must fail the whole declaration. Also test all-positive maps so a guard that rejects everything cannot pass.

Run one cold baseline immediately before narrowing types. This measures the type-boundary work in this plan, not the whole original refactor. Prepare the web route contract with its normal package type-check command first. Then record diagnostics without incremental reuse:

```sh
pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false --extendedDiagnostics -p tsconfig.json
pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false --extendedDiagnostics -p tsconfig.vitest.json
```

Use the same installed Node/pnpm/package compiler, generated route state, checked scope, and resource limits for baseline and candidate. Capture elapsed time, types, instantiations, checker memory, exit code, and peak RSS using the host's existing process measurement utility. Record an unavailable metric as unavailable. Do not install another compiler to obtain nicer numbers.

**Verify:** both type gates record the intended negative-test failures and positive controls; measurement logs include exact commands/tool versions. An unavailable baseline blocks a performance conclusion, not the addition of valid correctness tests.

### 2. Check complete unions and reject any invalid action key

For compatibility, test the whole value type using non-distributive checks rather than unioning success/failure sentinels. Derive accepted model/renderer values from canonical component contracts. Evaluate intentional nullish display behavior explicitly before checking the value presented to a renderer.

For an action map, compute the set of invalid keys and accept only an empty set. Reject reserved names whenever their intersection with present keys is nonempty. Identity-result checks cover the entire result union. A callback accepting a wider argument cannot widen the schema's own inferred output to silence an error.

Share the small display compatibility implementation between table and detail constructors; keep it private. Do not duplicate the corrected conditional in several places or export a family of guard utilities.

**Verify:** Loom/Web types and Unit gates. Every mixed-invalid case now fails; all supported controls, shared fragments, numeric selections and minimal mutation results still pass. Runtime result checks from plan 065 remain independent of navigation.

### 3. Return compact contracts with only necessary refinements

Infer I/O from schema, record from read schema, result from the effective submit function, and selected keys from the map. After checking, expose a named contract carrying those types, not the complete schema class, validators tuple, source literal, and recursively frozen input expression.

Use `FormDefinition<I, O, R, K>` with a selected-key parameter K defaulting to input string keys. Its schema property uses the compact raw-schema input/output contract. Keep the submitted definition refinement required when submit was provided; omitted submit remains `submit?: never`. Fields retain canonical component prop/value correlations and selected keys. `defineTable`/`defineDetail` retain selected-key/accessor-value information needed for slots and composition without retaining Zod internals. Resource return types preserve required bound load/submit functions and per-operation results.

The load-bearing use cases are:

```ts
const form = defineForm({ schema, fields, submit: save })
form.submit

const rowForm = defineForm({ schema: rowSchema, fields: rowInputs })
```

```vue
<Form v-bind="form" />
<DialogForm v-bind="form" :submit="saveWithDifferentResult" @submitted="onDifferentResult" />
```

The override's return type determines the event. The original definition's result must not leak into that event type. Keep useful field-key completion and component prop checks; a faster `Record<string, unknown>` facade is not a solution.

**Verify:** both type gates and authoring/runtime tests. The complete target examples compile without casts or suppressions; incompatible override inputs and wrongly typed completion handlers fail.

### 4. Type the slot and exposed-state seam once

Declare the Form slot map from selected input keys. `input:age` receives the schema input's age value, including the declared null/undefined empty draft states, and a setter for that same value type. Use FormDraft<I> = { [K in keyof I]?: I[K] | null } for transient models and snapshots. Null is a preserved clear, not an implicit conversion to undefined; validation still checks the original schema. Draft and nested values exposed outward are read-only/detached under the session contract. Reuse the identical slot and exposed API through DialogForm and FormView; wrappers add only presentation-specific fields.

```vue
<DialogForm v-bind="personForm">
  <template #input:age="{ value, setValue }">
    <NumberInput :model-value="value" @update:model-value="setValue" />
  </template>
</DialogForm>
```

This fixture must reject a string setter argument when age is numeric. Input:name must reject a number for a string schema. Keep dynamic internal dispatch localized; do not export unknown as the normal slot value/setter contract. Supported native attributes remain component-derived, not arbitrary slot/prop indexes.

**Verify:** strict Vue fixtures under both type gates; wrong slot names, values and setters fail in Form, DialogForm and FormView. Browser tests still confirm one session and correct runtime forwarding.

### 5. Reduce exports and measure the candidate

Inventory public root/subpath exports and external callers. Keep the surface/component/command contracts needed for authoring. Remove exported construction guards, intermediate proof bags, identical runtime aliases, and unused internal type vocabulary. Do not remove a useful named contract simply to reduce a symbol count. Replace runtime absence assertions for type-only exports with negative type imports.

Rerun the same cold commands once. Report measurements without attributing changes caused by different scopes/toolchains to this plan. Inspect emitted/public types as well as memory. Preserve all type tests; no `any`, bivariant escape, suppression, tsconfig relaxation, or union simplification may conceal an invalid declaration.

**Verify:** Unit, both type gates, Architecture, Browser and final workspace gates. Public imports remain usable; removed proof names are unavailable; diagnostics and measurement conditions are recorded.

## Test plan

Use actual constructors and registered actual components in TypeScript and Vue fixtures. Negative tests mix valid/invalid union members and action siblings. Cover nullable and optional fields, custom read types, generic selections, required/defaulted/native props, default submit presence, model-only forms, result-changing overrides, typed slots, and resource factories. No global TypeScript substitute or standalone extracted guard test counts as pinned template evidence.

## Done criteria

- [ ] Whole unions and every action-map member must satisfy their contracts.
- [ ] Reserved action names fail even beside valid names.
- [ ] Typed custom slots preserve field values/setters through all wrappers.
- [ ] Definition returns retain selected keys, canonical props, submit presence and result types without full implementation graphs.
- [ ] Construction guard machinery is private; useful public contracts remain.
- [ ] One comparable cold baseline/candidate measurement is recorded; unavailable metrics are not invented.
- [ ] Scoped unit/browser/type gates pass with exact executed commands, counts, skips, and exit status recorded.
- [ ] Only scoped owners, dependent callers, tests, current documentation, and plan status changed; review `git diff --check` and `git diff --stat`.
- [ ] No compatibility alias, fallback to a removed contract, public `any` facade, or type-suppression escape was added.

## STOP conditions

Stop if narrowing removes required-binding certainty, useful key inference, renderer prop correlation, or correct submit override result typing. Investigate the boundary rather than widening to any/unknown. A pinned Vue compiler limitation is not permission to suppress the consumer test. Report performance measurement limitations separately from correctness results.

Do not improvise a new backend contract or suppress a required check. Report a repeated verification failure after two targeted repair attempts. A missing browser, dependency, database, or storage prerequisite blocks that gate rather than justifying a stubbed substitute.

## Maintenance

Future changes to a renderer or schema should be checked at that owner, not by growing resource-wide generic proofs. Require both positive and mixed-negative fixtures for every new guard. Keep measurements reproducible and the public type vocabulary driven by actual callers.

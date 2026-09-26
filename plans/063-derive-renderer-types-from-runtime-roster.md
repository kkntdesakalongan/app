# Plan 063: Derive built-in renderer contracts from one runtime roster

## Status and intent

- Status: TODO. Priority: P2. Effort: M. Risk: MED. Confidence: HIGH.
- Category: architecture. Dependencies: none; execute after 062 for a simple serial sequence.
- Planned at: `1246387`, 2026-09-26.

The form renderer key must identify the same component in the compiler and at runtime. Today the two lists only agree by convention. Make the runtime roster the source of built-in component types. Preserve ordinary Vue components, lazy loading, public renderer names, and custom component augmentation. Do not introduce renderer descriptors, conversion wrappers, a generated manifest, or a new registration API.

Read root `AGENTS.md`, resource architecture sections 3.3 and 3.4, and `test-audit`. Add no implementation comments. Execution requires selecting this plan; this planning record does not run implementation. Do not commit, push, install, update dependencies, or touch backend services.

## Current state

`packages/loom/src/renderers/formContracts.ts:37` repeats the built-in component list as an interface. Async components are represented as loader functions and unwrapped by `RawFormComponent` before extracting `$props`.

```ts
export interface BuiltInFormRendererComponents {
  text: typeof TextInput
  textarea: AsyncFormComponent<typeof TextareaInput>
  password: AsyncFormComponent<typeof PasswordInput>
  number: AsyncFormComponent<typeof NumberInput>
```

`packages/loom/src/renderers/form.ts:6` separately creates the real roster:

```ts
export const builtInFormRenderers: Record<keyof BuiltInFormRendererComponents, unknown> = {
  text: TextInput,
  textarea: defineAsyncComponent(() => import('../components/inputs/TextareaInput.vue')),
```

The `unknown` values check key coverage but not component agreement. `registry.ts` consumes this roster. `FormRendererComponents extends BuiltInFormRendererComponents` is the custom augmentation seam. Keep it. The registry currently permits plain-component overrides for declared form keys; tightening that separate contract is out of scope.

`FormRendererPropBag` has a special case for generic TableInput. `defineForm.ts` has prop-dependent model rules for text, selections, and assets. Neither is permission to widen those contracts to `any`, `unknown`, or a general `Component` type during this work.

Match `renderers/form.ts`: direct TextInput/FileInput imports and `defineAsyncComponent` for the currently lazy components. Match `renderers/__type-tests__/custom-renderers.type-test.ts` for augmentation and required-prop proofs. Existing comment directives in those fixtures are not a reason to add implementation comments or weaken tests.

## Scope

- `packages/loom/src/renderers/form.ts`
- `packages/loom/src/renderers/formContracts.ts`
- `packages/loom/src/renderers/__type-tests__/custom-renderers.type-test.ts`
- `packages/loom/src/renderers/__type-tests__/form-contracts.type-test.ts`
- `packages/loom/src/renderers/__tests__/registry.spec.ts`
- `packages/loom/src/components/core/__tests__/Form.browser.spec.ts`
- This plan and its `plans/README.md` row.

Read registry, components, generated fixtures, and installed Vue declarations as needed. Do not change component models or props, generic TableInput's contract, registry override policy, display renderers, public names, app modules, package exports, CI, or package versions. A private type-only helper inside the two production files is allowed. No new runtime helper or wrapper is required.

## Target design

1. In `form.ts`, let the literal roster retain each actual component's type. Remove the back-reference to `BuiltInFormRendererComponents`. An optional `satisfies` check must not erase per-entry inference.
2. In `formContracts.ts`, use a type-only import of the roster. Derive `BuiltInFormRendererComponents` from `typeof builtInFormRenderers`; keep `FormRendererComponents` as an augmentable interface extending the inferred built-ins.
3. Extract `$props` from the actual direct/async component types. Inspect the installed Vue `defineAsyncComponent` declaration first: use its retained component generic, not an assumed loader-return shape.
4. Delete only the duplicated built-in import/interface entries and internal unwrapping types made unused by this change. Retain any published standalone type unless its removal is separately justified and authorized; this plan does not need to remove `RichTextFormInput` merely because roster derivation no longer uses it.
5. Preserve lazy import expressions exactly where possible. Type-only links may form a type graph; they must not create a runtime import cycle or cause lazy inputs to load eagerly.

## Commands

Run from repo root. Positive gates must exit 0.

| Gate | Command |
|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/renderers packages/loom/src/components/core/__tests__/Form.browser.spec.ts` |
| Local work | `git status --short` and `git diff -- packages/loom/src/renderers` |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` |
| Registry | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/renderers/__tests__/registry.spec.ts` |
| Unit regression | `pnpm --filter @southneuhof/loom test` |
| Browser | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Form.browser.spec.ts src/components/composites/__tests__/SelectForm.browser.spec.ts src/assets/__tests__/AssetParity.browser.spec.ts src/components/composites/__tests__/TableInput.browser.spec.ts` |
| App types | `pnpm --filter @southneuhof/framework-web type-check` |
| Bundle | `pnpm --filter @southneuhof/framework-web build-only` |
| Architecture | `pnpm test:surface-architecture` |
| Whitespace | `git diff --check` |

Audit baseline: Types passed and Loom unit suite passed 450 tests. Bundle and browser behavior were not checked in that audit. App type generation and bundle output can write generated/ignored files: inspect changes and preserve unrelated work. No Loom lint script exists. Report the test-audit skill's unavailable OpenClaw tools separately; use these actual Carta gates and do not claim unavailable checks passed.

## Steps

1. Record drift/local work. Run Types and Registry. Read the installed `defineAsyncComponent` types through the package-resolved Vue dependency. Record whether direct, lazy, and generic component types retain their public props. **Verify:** both baseline gates pass; stop if the planned type derivation cannot preserve the current public contracts.
2. Remove the type-erasing roster annotation and derive the built-in type map. Keep all existing renderer keys and component import paths unchanged. Reuse the generic TableInput special case. **Verify:** Types passes with existing built-in and custom fixtures unchanged. If it fails, fix the owner inference; do not silence errors with broad casts or remove negative assertions.
3. Extend existing positive type fixtures with meaningful props/model assignments for one direct renderer, one lazy renderer, and the custom rating input. Use existing required-prop and model rejection fixtures as the negative controls. Avoid re-creating a hardcoded inventory of every renderer name. **Verify:** Types passes. In a disposable checkout, change one inferred built-in component mapping to an incompatible component; an existing or added consumer type assertion must fail for its model/props. Restore/discard only that disposable mutation. Record the diagnostic, not just its exit code.
4. Use the existing managed Form browser case that switches text to textarea to verify runtime selection and lazy loading. If it already proves this, keep it unchanged. Add a case only for an uncovered observable risk. **Verify:** Registry and Browser pass. Tests must render the registry-selected component, not import a replacement component directly while claiming registry coverage.
5. Run Unit regression, App types, Bundle, Architecture, and Whitespace. Inspect bundle output for the existing lazy component chunks; a successful build alone does not prove deferred loading. Record whether lazy imports remained and whether the emitted graph agrees. **Verify:** all gates pass; no new eager component imports, runtime cycle, or task-owned file outside Scope.

## Done, stops, and maintenance

- [ ] One inferred runtime roster supplies built-in keys and component types.
- [ ] Existing custom augmentation, required/defaulted props, generic input, and model rules still compile correctly.
- [ ] The disposable incompatible-mapping probe fails for the expected consumer contract.
- [ ] Real managed component/browser and app bundle checks pass.
- [ ] No runtime wrapper, generator, second roster, or dependency change was added.
- [ ] Evidence and index status reflect actual commands.

Stop if Vue inference loses generic props, if a type-only import becomes a required runtime cycle, if a published contract must be removed, or if repair requires component/model changes outside Scope. Stop after two failed attempts at a gate and report the failure. If a simpler inferred roster is impossible with installed types, report a bounded typed-roster alternative for review instead of building a new renderer framework.

Future built-in inputs must be added at the runtime roster. Existing per-mode model constraints remain with their current component/form contract owners; roster derivation does not replace them.

## Execution evidence

Not executed. The two-list maintenance gap is source-confirmed. The derivation and mutation proof must be performed during execution.

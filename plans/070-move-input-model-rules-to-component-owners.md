# Plan 070: Move input model rules to component owners

## Status and intent

- Status: DONE. Priority: P2. Effort: M. Risk: MED. Confidence: HIGH.
- Category: separation of concerns / type safety.
- Depends on root Plans 063 and 064 for the renderer roster and diagnostic gate. Recommended after 069 to keep form type edits serial.
- Planned at: `1246387`, 2026-09-26.

An input component owns what values it emits for its props. Form authoring must check that contract, but it should not independently define it. Textarea and asset cardinality rules still live in `defineForm.ts`. Move them to component-owned type contracts and use those contracts at both the component and form boundaries.

Preserve form-authoring precision and current component behavior. This plan does not introduce new generic SFC APIs or promise stricter direct-template inference. A dynamic boolean can produce either asset cardinality; it must not be typed as single merely because it is not the literal `true`.

## Current state

`packages/loom/src/forms/defineForm.ts:46` defines textarea constraint-to-model logic. At line 55 it defines:

```ts
type AssetModelValue<TEntry> = SelectedProps<TEntry> extends { multi: true } ? AssetValue[] | null : AssetValue | null
```

The following `RendererControlValue` conditional selects these local rules for textarea, file, and image. In contrast, text and selection controls already expose component-owned model helpers in `components/inputs/textInput.types.ts` and `selectInput.types.ts`. Use that ownership pattern.

`components/inputs/TextareaInput.vue:23` declares `defineModel<string | number | undefined>()`. Its watcher emits a finite number or undefined only for exactly `['number']`; other constraints emit string or undefined. Its default constraint is `['text', 'number']`.

FileInput and ImageInput use `multi: false` by default and a broad `AssetValue | AssetValue[] | null` model. `renderers/formContracts.ts` extracts component props/model events and retains a necessary TableInput special case. Do not remove that special case as part of this work.

## Scope

- `packages/loom/src/components/inputs/{TextareaInput,FileInput,ImageInput}.vue`.
- New component-owned `textareaInput.types.ts` and `assetInput.types.ts` beside those components. Do not add full duplicate component-prop catalogs.
- `packages/loom/src/forms/defineForm.ts` and `renderers/formContracts.ts`.
- `packages/loom/src/renderers/__type-tests__/form-contracts.type-test.ts`; new `packages/loom/src/components/inputs/__type-tests__/input-model-modes.type-test.vue` and `.ts`.
- Existing tests under `packages/loom/src/components/inputs/__tests__/` only for the three changed controls.
- Extend `packages/loom/scripts/check-contract-diagnostics.mjs` from root Plan 064 with bounded input-mode negative fixtures.
- This plan and its index row.

No selection rewrite, FileManager plugin change, upload lifecycle change, asset conversion, schema coercion, renderer override policy, or new public registry of model rules. Keep component defaults, events, attributes, slots, validation errors, and pending upload state unchanged. Shared asset cardinality is appropriate only because FileInput and ImageInput actually share that contract.

## Target contracts

1. `TextareaInputConstraint` and `TextareaInputModelValue<TConstraint>` belong beside TextareaInput. Exactly `readonly ['number']` permits `number | undefined`; a known nonnumeric mode permits `string | undefined`; a widened or union constraint must include all possible emitted branches. An omitted constraint uses the current mixed default and emits string or undefined. Preserve unset behavior; do not add null.
2. An asset cardinality helper parameterized by mode permits `AssetValue | null` for omitted/false, `AssetValue[] | null` for true, and both for boolean or a union containing both states. Keep optional model presence separate from the control's emitted empty value. Do not replace canonical assets with IDs.
3. Components use a broad model type derived from their component-owned rule, covering the modes they currently accept. Form authoring uses the same rule specialized to its selected props. Preserve current direct-component acceptance, defaults, and events; do not narrow accepted initialization values to only emitted values. Leave unrelated prop declarations alone. Direct-template per-mode narrowing is a separate possible improvement, not a completion condition here.
4. `renderers/formContracts.ts` may dispatch to component-owned conditional helpers to retain selected-prop precision beyond the broad component model. That dispatch is a type adapter, not a second definition of mode semantics. `defineForm.ts` retains generic schema-input compatibility checks but no textarea or asset cardinality policy. Existing text/select/radio/checkbox rules should continue to use their current owners; do not redesign them.
5. A single-mode schema must reject a dynamic multi control that can emit arrays. A schema with the full supported union can accept that control. Preserve module augmentation and custom renderer behavior from Plan 063.

Do not convert components to generics or add runtime casts for this extraction. Distinguish the model values a component currently accepts from those a particular mode can emit. Preserve the accepted aggregate model; specialize emitted-value compatibility at form authoring. A helper-only equality test cannot prove this: the fixtures must use actual component and form boundaries.

## Commands and steps

Read root AGENTS, the resource architecture input rules, and `test-audit`. Record initial status. Do not add code comments, suppression directives, compatibility wrappers, installs, commits, or pushes.

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/components/inputs packages/loom/src/forms/defineForm.ts packages/loom/src/renderers packages/loom/scripts` | Reconcile completed predecessors |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0 |
| Inputs | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/components/inputs/__tests__` | All pass |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |

1. Run Drift, Types, Diagnostics, and Inputs as a baseline. Record actual model writes and all prop defaults for each component. Compare the target matrix with those writes before editing; report any disagreement. The component implementation, not the old form conditional, is the behavior to preserve.
2. Add the component type owners. Connect TextareaInput first, then FileInput and ImageInput, using the shared aggregate model types. Add positive direct Vue fixtures preserving current acceptance and form fixtures for omitted, literal, widened, and union modes. Run Types and Inputs after each control. A type helper tested only in isolation is insufficient.
3. Route renderer selected-prop compatibility through those owners and remove the local policy types from `defineForm.ts`. Run Types and Diagnostics. Confirm custom renderers and existing select/text cases still compile.
4. Add paired negative form-authoring cases for schemas incompatible with numeric/text textarea output, single/multi assets, and a dynamic multi control bound to a single-only schema. Do not add negative direct-component cases for values those components currently accept. Positive controls use the same component/schema except for the incompatible model. Run Diagnostics. Assert the public call fails for model incompatibility; do not match private type names or full compiler prose.
5. Use existing input behavior test patterns to cover only missing evidence: numeric textarea clear, nonnumeric string emission, single asset selection/clear, and multi selection/clear. Retain existing upload/picker coverage. Run Inputs, Types, Diagnostics, App, and Architecture. Run `git diff --check`, review defaults/attrs/emits, and record results before updating the index.

## Done, stops, and maintenance

- [x] Component declarations and form compatibility consume the same component-owned mode rules.
- [x] `rg -n 'type TextareaModelValue|type AssetModelValue' packages/loom/src/forms/defineForm.ts` returns no matches.
- [x] Actual Vue calls retain existing model acceptance; form checks admit every runtime branch of dynamic modes.
- [x] Wrong form-schema/control-mode combinations fail with valid paired controls.
- [x] Input runtime behavior, defaults, and upload lifecycle remain unchanged; all gates pass.

Stop if sharing these owners breaks renderer registration or needs a generic SFC rewrite, if runtime behavior must change to satisfy the new type, or if a second list of built-in renderers is required. Keep the minimal failing fixture and report it. Stop after two failed bounded corrections. Future component mode changes must update the component owner and its boundary fixtures, not add a special case in the form constructor.

The baseline audit passed Loom types and 450 tests in 61 files before these changes. That is not evidence for the proposed repairs. The test skill references OpenClaw-specific tools that are not available here; report them as unavailable, not passed. Apply its independent-contract and no-duplicate-test rules to the actual Carta gates above. App type checks can generate route artifacts; preserve unrelated work.

## Execution evidence

Implemented from HEAD `05ebfa3`. The scoped drift command had no committed changes after `1246387`. The starting working tree contained uncommitted work from Plans 063 and 069, the Plan 064 diagnostics harness, and other plans. Those files and the Plan 063 renderer roster and Plan 069 compact form types were preserved.

The source writes match the target matrix. TextareaInput emits a finite number or undefined only for exactly `['number']`; invalid numeric text remains local and reports a validation error. Its current default `['text', 'number']` and every other supported constraint emit strings or undefined. FileInput emits its persisted asset list when `multi` is true, and the first persisted asset or null otherwise. ImageInput emits a copied asset list when `multi` is true, and the first asset or null otherwise. Both asset controls default `multi` to false.

The existing props and defaults remain unchanged. TextareaInput defaults `constraint` to `['text', 'number']`, `placeholder` to `''`, and `rows` to `3`. FileInput defaults `accept` and `maxSize` to undefined, `multi` to false, and `uploadPath` to `''`. ImageInput has an unset optional model, and defaults `maxSize` to `5`, `disableInformation` to false, `multi` to false, `limit` to `-1`, `additionalInfo` and `uploadPath` to `''`. All three retain the shared defaults: `field` and `label` to `''`, `enableHelperMessage`, `disabled`, and `required` to false, and `helperMessage` and `error` to `''`.

The new component-owned textarea and asset types supply both component model declarations and Form's selected-prop model checks. The Form layer only maps selected prop types into those owners. Textarea's omitted, literal, widened, union, and optional prop forms are covered. File and image fixtures cover omitted, literal, widened boolean, union, and optional multi modes. Dynamic asset mode checks reject schemas that support only one cardinality and accept the full asset union. Direct Vue fixtures keep the aggregate model accepted for existing component initialization values. The Plan 064 harness now checks paired public `defineForm` controls for default, numeric, text, widened, union, and optional textarea modes; single, multi, dynamic, and optional asset modes; and ImageInput multi mode. TableInput's generic special case, renderer augmentation, and custom renderer behavior remain unchanged.

The focused input tests add nonnumeric textarea string emission, FileInput clear values for both cardinalities, and ImageInput single selection/clear and multi clear behavior. The existing numeric textarea clear and file/image upload coverage already supplied that evidence, so they were not duplicated. A first optional-multi diagnostic showed that the selected-prop adapter did not include the omitted `false` branch; the adapter now reads the optional prop value and the final diagnostic gate passes.

Final verification passed:

- Loom `vue-tsc --noEmit --incremental false`: exit 0.
- Contract diagnostics: 23 resource and form cases, 9 TypeScript surface cases, and 8 Vue surface cases passed.
- Focused input suite: 16 files and 139 tests passed.
- Framework web `type-check` and cold `vue-tsc --noEmit --incremental false -p tsconfig.vitest.json`: exit 0 for both.
- Surface architecture: 18 checks and the architecture scan passed.
- `git diff --check` passed; the local textarea and asset policy aliases are absent from `defineForm.ts`.

The test-audit skill's OpenClaw testing, crabbox, changed-file classification, and autoreview tools were unavailable; they were not reported as passing. No comments, runtime conversion, renderer list, public export, generic SFC rewrite, package install, commit, or push was added.

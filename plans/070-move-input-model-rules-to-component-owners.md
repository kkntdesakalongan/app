# Plan 070: Move input model rules to component owners

## Status and intent

- Status: TODO. Priority: P2. Effort: L. Risk: MED. Confidence: HIGH.
- Category: separation of concerns / type safety.
- Depends on root Plans 063 and 064 for the renderer roster and diagnostic gate. Recommended after 069 to keep form type edits serial.
- Planned at: `1246387`, 2026-09-26.

An input component owns what values it emits for its props. Form authoring must check that contract, but it should not independently define it. Textarea and asset cardinality rules still live in `defineForm.ts`. Move them to component-owned type contracts and use those contracts at both the component and form boundaries.

This is more than moving two aliases. Preserve prop-dependent precision and actual runtime behavior. A dynamic boolean can produce either asset cardinality; it must not be typed as single merely because it is not the literal `true`.

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
- New component-owned `textareaInput.types.ts` and `assetInput.types.ts` beside those components. Add `fileInput.types.ts` and `imageInput.types.ts` only if separate full prop contracts are needed for generic SFC inference.
- `packages/loom/src/forms/defineForm.ts` and `renderers/formContracts.ts`.
- `packages/loom/src/renderers/__type-tests__/form-contracts.type-test.ts`; new `packages/loom/src/components/inputs/__type-tests__/input-model-modes.type-test.vue` and `.ts`.
- Existing tests under `packages/loom/src/components/inputs/__tests__/` only for the three changed controls.
- Extend `packages/loom/scripts/check-resource-diagnostics.mjs` from root Plan 064 with bounded input-mode negative fixtures.
- This plan and its index row.

No selection rewrite, FileManager plugin change, upload lifecycle change, asset conversion, schema coercion, renderer override policy, or new public registry of model rules. Keep component defaults, events, attributes, slots, validation errors, and pending upload state unchanged. Shared asset cardinality is appropriate only because FileInput and ImageInput actually share that contract.

## Target contracts

1. `TextareaInputConstraint` and `TextareaInputModelValue<TConstraint>` belong beside TextareaInput. Exactly `readonly ['number']` permits `number | undefined`; a known nonnumeric mode permits `string | undefined`; a widened or union constraint must include all possible emitted branches. An omitted constraint uses the current mixed default and emits string or undefined. Preserve unset behavior; do not add null.
2. An asset cardinality helper parameterized by mode permits `AssetValue | null` for omitted/false, `AssetValue[] | null` for true, and both for boolean or a union containing both states. Keep optional model presence separate from the control's emitted empty value. Do not replace canonical assets with IDs.
3. Component public prop/model declarations use these owners. Use typed generic SFC props tied to the constraint or multi parameter when needed for inference. Preserve all existing runtime defaults explicitly. Remove ImageInput's duplicate broad `modelValue` declaration if required to give `defineModel` one authoritative type; do not change accepted values at runtime.
4. `renderers/formContracts.ts` may dispatch to component-owned conditional helpers when generic SFC extraction cannot retain a selected prop mode. That dispatch is a type adapter, not a second definition of mode semantics. `defineForm.ts` retains generic schema-input compatibility checks but no textarea or asset cardinality policy. Existing text/select/radio/checkbox rules should continue to use their current owners; do not redesign them.
5. A single-mode schema must reject a dynamic multi control that can emit arrays. A schema with the full supported union can accept that control. Preserve module augmentation and custom renderer behavior from Plan 063.

TypeScript cannot always narrow a generic parameter from a runtime boolean branch. If an internal assertion is required, keep it at that branch and prove the branch output with a runtime test. It cannot weaken the public props, model, or form compatibility check. Do not scatter casts through consumers.

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
2. Add the component type owners. Connect TextareaInput first, then FileInput and ImageInput, with generic prop inference where needed. Add positive TS and Vue fixtures for omitted, literal, widened, and union modes. Run Types and Inputs after each control. A type helper tested only in isolation is insufficient.
3. Route renderer selected-prop compatibility through those owners and remove the local policy types from `defineForm.ts`. Run Types and Diagnostics. Confirm custom renderers and existing select/text cases still compile.
4. Add paired negative cases for wrong models on numeric/text textarea, single/multi assets, and a dynamic multi control bound to a single-only schema. Positive controls use the same component/schema except for the incompatible model. Run Diagnostics. Assert the public call fails for model incompatibility; do not match private type names or full compiler prose.
5. Use existing input behavior test patterns to cover only missing evidence: numeric textarea clear, nonnumeric string emission, single asset selection/clear, and multi selection/clear. Retain existing upload/picker coverage. Run Inputs, Types, Diagnostics, App, and Architecture. Run `git diff --check`, review defaults/attrs/emits, and record results before updating the index.

## Done, stops, and maintenance

- [ ] Component declarations and form compatibility consume the same component-owned mode rules.
- [ ] `rg -n 'type TextareaModelValue|type AssetModelValue' packages/loom/src/forms/defineForm.ts` returns no matches.
- [ ] Actual Vue calls retain mode inference; dynamic modes admit every runtime branch.
- [ ] Wrong public model/schema combinations fail with valid paired controls.
- [ ] Input runtime behavior, defaults, and upload lifecycle remain unchanged; all gates pass.

Stop if generic SFC extraction breaks renderer registration, if the only solution is a broad public model fallback, if runtime behavior must change to satisfy the new type, or if a second list of built-in renderers is required. Keep the minimal failing fixture and report it. Stop after two failed bounded corrections. Future component mode changes must update the component owner and its boundary fixtures, not add a special case in the form constructor.

The baseline audit passed Loom types and 450 tests in 61 files before these changes. That is not evidence for the proposed repairs. The test skill references OpenClaw-specific tools that are not available here; report them as unavailable, not passed. Apply its independent-contract and no-duplicate-test rules to the actual Carta gates above. App type checks can generate route artifacts; preserve unrelated work.

## Execution evidence

Not implemented. Duplicate model policy and the literal-only multi rule are confirmed from source. Generic SFC feasibility and the new compiler cases remain implementation gates.

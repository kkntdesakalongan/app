# Plan 069: Give compact form contracts one owner

## Status and intent

- Status: DONE. Priority: P2. Effort: M. Risk: MED. Confidence: HIGH for duplication; no runtime defect is claimed.
- Category: separation of concerns / maintenance.
- Depends on root Plans 064, 067, and 068 because they change diagnostics, filter properties, and resource bag composition. Execute serially with other edits to `resources/operations.ts`.
- Planned at: `1246387`, 2026-09-26.

Form definitions own fields, selected renderers, labels, and validators. Resource binding should add guarded operations and identity/cache context. Today resources independently reconstruct the form contract. Remove that second owner without returning huge inferred schema/configuration types to callers.

## Current state

`packages/loom/src/forms/defineForm.ts:179` defines `FieldRenderers`, `CompactFormField`, and `CompactFormFields`. `DefinedForm` preserves selected renderer types while exposing a compact schema contract:

```ts
readonly schema: RawSchema<TInput, TOutput>
readonly fields: CompactFormFields<TInput, TRenderers>
```

`packages/loom/src/resources/operations.ts:261` independently defines `FormFieldRenderers` and `ResourceFormFields`. `ResourceFormContract` restates schema, fields, labels, and validators, then adds guarded submit and resource metadata. `ResourceListFilterContract` repeats much of this again. Runtime binding is already field-agnostic; the duplicate ownership is in types.

Use the current compact form projection as the exemplar. Do not return the whole original `TForm`: that can leak raw Zod and deeply inferred declaration literals into every resource consumer. Keep form draft/input separate from parsed submit output.

## Scope

- `packages/loom/src/forms/defineForm.ts`.
- New internal `packages/loom/src/forms/definitionTypes.ts` for the shared compact type projection.
- `packages/loom/src/resources/operations.ts`.
- `packages/loom/src/renderers/__type-tests__/form-contracts.type-test.ts` and `resources/__type-tests__/bound-resource.type-test.ts`.
- Extend the diagnostic cases in `packages/loom/scripts/check-contract-diagnostics.mjs` from root Plan 064 only where needed to protect these public contracts.
- This plan and its index row.

No runtime resource binder, validation engine, schema wrapper, new public builder, universal field definition, barrel-export expansion, or renderer roster change. Runtime tests can be run but should not be changed for a type-only extraction. Avoid a general-purpose type utility package.

## Target ownership and invariants

Put renderer-key projection, compact fields, and the reusable schema/field/label/validator body in `forms/definitionTypes.ts`. It uses type-only imports from the existing contracts and renderer type boundary. It must not import resources or component implementations. Name each type for the form concept it represents; do not add aliases used once merely to rename an expression.

`defineForm.ts` keeps declaration validation and composes its result from this compact body. It still controls whether submit is required or forbidden. `resources/operations.ts` imports the compact body and composes only resource-specific behavior: guarded async submit, bound load, id, resource, namespace, and the existing allowed options. List filters compose the same body with their submit-free filter contract, including explicit `queryKeys` and `toDraft` from Plan 067.

Preserve all of these distinctions:

- Only declared field keys appear; a schema key without a field does not become a field.
- Each field retains its selected renderer props. A text field does not become the union of all renderer props.
- Schema input, transformed output, and awaited submit result stay distinct.
- Standalone forms without submit remain valid; bound create/update forms require their guarded submit.
- Update ids and record loaders retain their inferred types. List filters cannot acquire submit or editor lifecycle props.
- Valid plain declaration objects still bind. Do not require callers to use `defineForm` as a runtime tag.
- Invalid extra keys, renderer choices, and resource relationships remain rejected at the useful locations established by Plan 064.

Do not make every form option optional to unify these states. A shared body plus explicit ownership-specific composition is the goal; one universal form/resource type is not.

## Commands and steps

Read root AGENTS, architecture sections for forms and binding, and `test-audit`. Save initial status. No new code comments, suppression directives, unrelated formatting, installs, commits, or pushes.

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/forms packages/loom/src/resources/operations.ts packages/loom/src/renderers/__type-tests__ packages/loom/src/resources/__type-tests__ packages/loom/scripts` | Reconcile predecessor changes before editing |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0 |
| Runtime | `pnpm --filter @southneuhof/loom test` | All pass |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |

1. Run Drift, Types, and Diagnostics. Compare existing helper bodies side by side and record their intentional differences, especially submit and filter options. Check completed 067/068 contracts before changing their composition.
2. Add the internal compact types and consume them from `defineForm.ts`. Preserve all public inferred states listed above. Run Types and Diagnostics. This step is an extraction; a changed rejection or widened field needs correction before resource changes.
3. Replace the independently reconstructed resource form and filter bodies with the shared projection. Keep resource-specific transforms local. Run Types and Diagnostics. Remove obsolete helpers/imports; do not keep compatibility aliases for their old private names.
4. Extend the existing public type fixtures only for missing coverage of named/spread definitions, renderer-specific props, transformed output/result, optional versus required submit, and transformed filter mapping. Use assignability assertions against independent expected public shapes. Use the diagnostic gate for actual invalid calls; no new suppression comments. Run Types and Diagnostics.
5. Run Runtime, App, and Architecture once after the final change. Record the cold type-check duration as an observation, not a benchmark claim. Run `git diff --check`; compare final status with the initial status. Record evidence and update the index after review.

## Done, stops, and maintenance

- [x] One form-owned projection supplies constructor and bound form/filter field contracts.
- [x] `rg -n 'type FormFieldRenderers|type ResourceFormFields' packages/loom/src/resources/operations.ts` returns no matches.
- [x] The new form type owner has no resource dependency or runtime imports.
- [x] All public distinctions above have passing existing or added contract coverage.
- [x] All gates pass; no `any`, broad cast, or raw declaration return replaces the compact contract.

Stop if a predecessor is incomplete, inference becomes recursive or substantially slower, source-free options cannot be separated without changing runtime, or the plan needs another generic projection framework. Report the failing public fixture rather than adding escape hatches. Stop after two failed bounded corrections. Future form properties should be added at the form owner; the resource layer should change only if its binding policy changes.

The baseline audit passed Loom types and 450 tests in 61 files before these changes. That is not evidence for the proposed repairs. The test skill references OpenClaw-specific tools that are not available here; report them as unavailable, not passed. Apply its independent-contract and no-duplicate-test rules to the actual Carta gates above. App type checks can generate route artifacts; preserve unrelated work.

## Execution evidence

Implemented from HEAD `05ebfa3`. The scoped drift command had no committed changes after `1246387`; completed predecessor changes were present in the working tree and were preserved. The shared internal form type owner now supplies the compact schema, selected fields, labels, and validators to `defineForm`, bound create/update forms, and list filters. Resources retain their guarded submit, loader, identity, cache namespace, and filter ownership types. The public type fixtures cover named and spread declarations, renderer-specific props, transformed input/output/result contracts, submit-free standalone forms and filters, and mapped filter queries. The existing Plan 064 diagnostic cases already cover invalid resource members and submit relationships, so the harness needed no new case.

Verification passed:

- Cold Loom `vue-tsc`: 7.09 seconds.
- Cold app `vue-tsc`: 9.33 seconds.
- Plan app `type-check`, including route contract and route generation.
- Loom contract diagnostics: 11 resource, 9 TypeScript surface, and 8 Vue surface cases.
- Loom runtime suite: 478 tests in 62 files.
- Surface architecture: 18 checks and the architecture scan.
- `git diff --check`.

The test-audit skill's OpenClaw testing, changed-file classification, crabbox, and autoreview tools are unavailable in this environment; they were not reported as passing. The plan's listed commands and the independent type contracts passed. No runtime code was added, no comments or compatibility aliases were added, and no install, commit, or push was performed. No runtime defect or type-check speedup is claimed.

# Plan 071: Align File Manager values with canonical assets

## Status and intent

- Status: TODO. Priority: P2. Effort: M. Risk: MED. Confidence: HIGH for the mismatch.
- Category: public contract / migration completion.
- Depends on root Plan 064 for the negative diagnostic gate. Recommended after 070; implementation is otherwise independent.
- Planned at: `1246387`, 2026-09-26.

The File Manager provider advertises an arbitrary model type, but its shipped form input and file/image consumers use canonical `AssetValue`. Make the public adapter type describe that actual contract. Preserve the distinction between a managed folder/file listing and a persisted input asset value.

This intentionally removes the generic model parameter. It is not a claim that arbitrary IDs are always a bad product API. The current package has one installed provider, and the shipped input consumers require canonical assets. A standalone picker can still select a `ManagedAsset`; it does not need a different persisted input model on the shared provider.

## Current state and the documentation conflict

`packages/loom/src/file-manager/contracts.ts:28` declares:

```ts
export interface FileManagerValueAdapter<TModel = unknown> {
  fromModel(value: TModel): MaybePromise<ManagedAsset | undefined>
  toModel(asset: ManagedAsset): MaybePromise<TModel>
}
```

`FileManagerPluginOptions<TModel = unknown>` forwards the generic. `provider.ts` and `plugin.ts` use its default unknown form. `components/composites/form-inputs/FileManager/FileManagerInput.vue` has an `AssetValue | AssetValue[] | null` model, validates input with `assets.read`, then calls `fromModel`. Selection calls `toModel` and validates the returned asset. FileInput and ImageInput follow the same canonical boundary.

`apps/web/src/framework/adapters/fileManager.ts:23` already uses `FileManagerPluginOptions<StoredAsset>`. Its `toModel` rejects folders and builds a complete stored asset through `storedAssetSchema.parse`.

`docs/architecture/file-manager-plugin.md:23` explicitly describes an ID-only standalone model and shows `FileManagerPluginOptions<string>`. This is a conflicting documented direction, not merely a stale generic name. The selected resolution is to align the provider with its shipped input consumers and replace that example. Search for a real separate consumer before removal; if one exists and needs arbitrary provider values, use the stop rule below instead of silently breaking it.

## Scope

- `packages/loom/src/file-manager/{contracts,provider,plugin,index}.ts` only as needed for the type change.
- `packages/loom/src/file-manager/__tests__/plugin.spec.ts` and `components/inputs/__tests__/FileInput.file-manager.spec.ts`.
- New `packages/loom/src/file-manager/__type-tests__/canonical-values.type-test.ts`; bounded negative cases in `packages/loom/scripts/check-contract-diagnostics.mjs` from root Plan 064.
- `apps/web/src/framework/adapters/fileManager.ts` and its existing test `apps/web/src/framework/adapters/__tests__/fileManager.spec.ts`.
- `docs/architecture/file-manager-plugin.md` and only the corresponding asset/plugin rule in `docs/resource_system_overhaul/ARCHITECTURE.md` if necessary.
- This plan and its index row.

No storage endpoint/schema changes, folder CRUD changes, asset service replacement, picker redesign, permission changes, upload path changes, or route work. Keep runtime validators in FileManagerInput, FileInput, and ImageInput; no edits there are expected. Preserve the existing public type names and package export path, but do not add a generic compatibility alias.

## Target contract

Import `AssetValue` as a type from the asset owner. Make `FileManagerValueAdapter` non-generic: `fromModel(value: AssetValue)` returns `MaybePromise<ManagedAsset | undefined>`, and `toModel(asset: ManagedAsset)` returns `MaybePromise<AssetValue>`. Make `FileManagerPluginOptions` non-generic and refer to that adapter.

Keep `ManagedAsset`, `FileManagerOperations`, and their optional capabilities unchanged. A folder is valid in a listing and invalid as a persisted input asset. Keep the explicit conversion: managed entries have `previewUrl` and optional metadata while persisted values require `kind: 'file'`, `id`, `url`, and `name`. Do not replace that mapping with a cast or assume every managed item is already an asset.

Update the application annotation to the non-generic type. Keep `StoredAsset` wherever the backend boundary actually uses it. Keep schema validation at the application boundary and `assets.read` at untyped input boundaries. Types do not validate backend responses or JavaScript plugins.

Update plugin fixtures to return complete assets. Tests that intentionally return malformed plugin data must still exercise the runtime boundary; use a clearly bounded untyped fixture mechanism permitted by the local test policy, not a production type relaxation. The guide must show canonical conversion and explain that standalone selection exposes managed entries, while input integration uses canonical values. `packages/loom/src/components/utils/FileManager/FileManager.vue` exposes selection through its footer slot; `packages/loom/src/file-manager/AssetPicker.vue` emits the selected managed entry. Neither standalone surface calls provider value conversion. Preserve these APIs.

## Commands and steps

Read root AGENTS, the architecture asset rules, `test-audit`, and the existing adapter tests. Record initial dirty work. No new comments, schema wrappers, installs, commits, or pushes.

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/file-manager packages/loom/src/components/inputs/__tests__/FileInput.file-manager.spec.ts apps/web/src/framework/adapters/fileManager.ts apps/web/src/framework/adapters/__tests__/fileManager.spec.ts docs/architecture/file-manager-plugin.md` | Review affected owners |
| Consumers | `rg -n 'FileManagerPluginOptions|FileManagerValueAdapter|values\.toModel|values\.fromModel' packages/loom/src apps/web/src docs/architecture/file-manager-plugin.md` | Record all actual adapter consumers |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Diagnostics | `pnpm --filter @southneuhof/loom test:diagnostics` | Exit 0 |
| Plugin | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/file-manager/__tests__/plugin.spec.ts src/components/inputs/__tests__/FileInput.file-manager.spec.ts` | All pass |
| Adapter | `pnpm --filter @southneuhof/framework-web test:focused -- framework/adapters/__tests__/fileManager.spec.ts` | All pass |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |

1. Run Drift and Consumers. Inspect every caller, including the standalone FileManager product, to confirm what it emits and whether it calls provider value conversion. Run Types, Plugin, and Adapter as baseline gates. Record failures separately.
2. Narrow the two public types, migrate the application annotation, and repair valid test fixtures. Keep conversion behavior and runtime checks. Run Types and Plugin. A new cast in the application to force StoredAsset compatibility is a failure, not a migration solution.
3. Add positive public fixtures for sync and async canonical conversion. Add diagnostic cases rejecting string-only output and an adapter whose input accepts only string IDs; each has a valid paired canonical control. Run Types and Diagnostics. Reuse existing round-trip and folder-rejection behavior tests; add a test only if a required boundary is not covered.
4. Replace the ID-only guide example with the actual canonical adapter shape and explain the two value domains. Keep listing capabilities and backend neutrality. Run Consumers again; no active generic provider annotation or ID-only provider example should remain. Historical plan bundles remain untouched.
5. Run Plugin, Adapter, Types, Diagnostics, App, and Architecture. Run `git diff --check`. Review the diff for preserved conversion/validation and unchanged folder operations. Record all results and update the index after review.

## Done, stops, and maintenance

- [ ] `rg -n 'FileManagerPluginOptions<|FileManagerValueAdapter<' packages/loom/src apps/web/src docs/architecture/file-manager-plugin.md` has no matches, excluding deliberately invalid diagnostic fixture strings.
- [ ] Canonical sync/async adapters compile; ID-only adapters fail for the intended public contract reason.
- [ ] Existing folder rejection, selection, conversion, and invalid-value behavior tests pass.
- [ ] Active documentation describes the shipped input contract; managed entries remain distinct from persisted assets.
- [ ] All gates pass, with no framework-to-backend type dependency.

Stop if an actual separate supported consumer requires arbitrary provider model values. Report its path and behavior; do not remove it or add a second provider without a revised plan. Stop if `StoredAsset` is not structurally compatible with `AssetValue`, if schema changes are required, or after two failed bounded corrections. Future backend asset changes belong in the application conversion, not in the plugin's canonical input contract.

The baseline audit passed Loom types and 450 tests in 61 files before these changes. That is not evidence for the proposed repairs. The test skill references OpenClaw-specific tools that are not available here; report them as unavailable, not passed. Apply its independent-contract and no-duplicate-test rules to the actual Carta gates above. App type checks can generate route artifacts; preserve unrelated work.

## Execution evidence

Not implemented. The generic provider, canonical shipped consumers, and conflicting standalone guide example were inspected. New diagnostic and runtime gates remain unrun.

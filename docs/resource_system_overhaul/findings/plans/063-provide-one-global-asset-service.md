# Plan 063: Configure asset input and preview behavior once per application

## Status

- Status: DONE
- Priority: P2
- Effort: L
- Fix risk: MEDIUM
- Category: correctness, architecture, types, verification
- Source baseline: `223fc622d9a897014fcbad48df838a19cec398db` (2026-09-24). Live source check: `b57c6f8` (2026-09-24); production source is unchanged, and the user revised `ARCHITECTURE.md` during review.
- Depends on: 062 session ownership
- Findings owned: F17, F27; global asset configuration and input/preview parity

**Execution:** Work in the current checkout; source paths are repository-relative. Do not commit, push, upgrade dependencies, change backend contracts, or alter unrelated work. Record commands and exit codes in this bundle's `README.md`. Follow `AGENTS.md`: write no implementation comments and no tautological tests. Expected-red regression tests are preparation, not completion. Missing dependencies or services are BLOCKED, never a passing result.

**Architecture:** Components own their public props, model values, events, and explicitly supported native attributes. Form derives requiredness from its schema, owns one tracked session, and forwards canonical component configuration. Authored inputs name their renderer. Inputs receive loaders in component props; no field `source`, inferred choice synthesis, prop-normalizer, or form-only model conversion exists in the completed architecture. App-level asset services are configured once and used by inputs and previews alike. `defineForm` preserves optional `submit`; a later explicit `:submit` replaces it. Form/DialogForm props are flat; page views contain nested primitive bags. Shared labels, input fragments, and read-only display fragments remain ordinary data. Changes are frontend-only; existing transport adapters remain the explicit API boundary.

## Intent

File and image components must work after one application bootstrap registration, both directly and inside forms. Preview/display consumers use that same service. Eliminate per-field upload/toModel/preview wiring without recreating the generic source/prop-normalizer registry. Retain one canonical frontend asset value compatible with the existing StoredAsset contract.

## Current state and evidence

| Evidence | Consequence |
|---|---|
| `apps/web/src/framework/inputs/registry.ts` installs upload/read/preview defaults only through the form-input registry. `framework/display/renderers.ts:33–80` imports the app asset adapter separately. | Direct inputs, managed inputs, and previews do not have one dependency owner. This plan establishes the agreed global service contract. |
| `FileInput.vue:162–218,237–294` starts uploads and mutates selection without consistently enforcing disabled. | F17: the earlier setup probe invoked upload with disabled true. |
| `renderers/inputProps.ts:135` uses `hydrate(value) ?? value`. | F27: the actual registry probe replaced a deliberate null with the old value. Delete this generic path; preserve null correctly at the remaining explicit asset boundary. |
| `inputs/assetValue.ts:1–28`, app `adapters/assets.ts:11–40`, API `schema.ts:13–25` | The frontend file object already matches StoredAsset fields. Keep backend validation and storage unchanged. |

Confidence is high for these source/control-flow observations; full upload/preview browser and storage integration were not executed. Use `FileInput.spec.ts`, `FileInput.browser.spec.ts`, `adapters/assets.form.spec.ts`, and display renderer tests as test structure. API schema is read-only evidence.

`apps/web/src/framework/adapters/assets.ts:11–29`

```ts
function readOne(value: unknown): InputAssetValue | null {
  const parsed = storedAssetSchema.safeParse(value)
  return parsed.success ? toInputAssetValue(parsed.data) : null
}

function readValue(value: unknown): InputAssetValue | InputAssetValue[] | null {
  if (Array.isArray(value)) {
    const assets = value.map(readOne)
    return assets.every((asset): asset is InputAssetValue => Boolean(asset)) ? assets : null
  }
  return readOne(value)
}

function preview(value: unknown): AssetPreview {
  const resolved = readValue(value)
  const item = Array.isArray(resolved) ? resolved[0] : resolved
  const url = item?.url ?? ''
  return { imageURL: url, thumbnailURL: url }
}
```

`packages/loom/src/renderers/inputProps.ts:129–138`

```ts
    const defaults = adapter.defaults ? { ...adapter.defaults } : {}
    if (!hasSource) return { ...defaults, ...(input.props ?? {}) }
    if (!adapter.normalize) throw new Error(`[loom] Input props renderer "${renderer}"${field ? ` on field "${field}"` : ''} has no source normalizer.`)
    const normalized = objectResult((adapter.normalize as (source: unknown, context: InputPropsResolutionContext) => unknown)(input.source, context), renderer, field)
    return { ...defaults, ...normalized, ...(input.props ?? {}) }
  }
  const hydrate: InputPropsRegistry['hydrate'] = (renderer, value) => copied.get(renderer)?.value?.hydrate(value) ?? value
  const contract: InputPropsRegistry['contract'] = (renderer) => {
    const adapter = copied.get(renderer)
    return adapter?.validate ? { validate: adapter.validate } : {}
```

`packages/loom/src/components/inputs/FileInput.vue:38–55`

```ts
  uploadPath: {
    type: String,
    default: '',
  },
  upload: Function as PropType<UploadOperation>,
  toModel: { type: Function as PropType<(result: unknown) => unknown | Promise<unknown>>, default: (result: unknown) => result },
  ...commonProps,
})
const attrs = useAttrs()
const controlAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([key]) => key === 'id' || key.startsWith('aria-')),
))
const wrapperAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([key]) => key === 'class' || key === 'style'),
))
const fileManager = useOptionalAssetProvider()
const AssetPicker = defineAsyncComponent(() => import('../../file-manager/AssetPicker.vue'))
const mutation = useUploadMutation(() => props.upload)
```

`packages/loom/src/components/inputs/ImageInput.vue:50–63`

```ts
  uploadPath: {
    type: String,
    default: '',
  },
  upload: Function as PropType<UploadOperation>,
  toModel: { type: Function as PropType<(result: unknown) => unknown | Promise<unknown>>, default: (result: unknown) => result },
  imageURLResolver: {
    type: Function as PropType<(payload: InputAssetValue) => { imageURL: string; thumbnailURL: string }>,
  },
  ...commonProps,
})
const fileManager = useOptionalAssetProvider()
const AssetPicker = defineAsyncComponent(() => import('../../file-manager/AssetPicker.vue'))
const mutation = useUploadMutation(() => props.upload)
```

Evidence is source inspection plus the earlier isolated probes stated above, not a claim that pinned Vue/browser tests passed. The probe harness used explicit test doubles. Establish real regressions before implementation. Use Vitest `describe/it/expect` and deferred promises as in the cited existing tests; keep schemas, compiler, session, and the component under test real.

## Scope

Modify these owners, their callers reached through the named contract, and their focused tests:

- `packages/loom/src/assets/{contracts,provider,index}.ts (create)`
- `packages/loom/src/adapters/{projectAdapters,plugin}.ts and tests`
- `packages/loom/src/components/inputs/{assetValue,optionalAssetProvider,useUploadMutation}.ts`
- `packages/loom/src/components/inputs/{FileInput,ImageInput,CameraInput}.vue and tests`
- `packages/loom/src/components/base/{ImagePreview,ImagePreviewMulti}.vue and tests`
- `packages/loom/src/components/utils/FileComponent.vue and actual file-preview callers`
- `packages/loom/src/file-manager/**: asset picker/provider integration only`
- `packages/loom/src/components/composites/form-inputs/FileManager/**: asset ingestion/preview integration only`
- `packages/loom/src/renderers/inputProps.ts: remove asset defaults/hydration/validation registration after consumer migration`
- `packages/loom/src/index.ts and affected export barrels`
- `apps/web/src/framework/{adapters/assets,inputs/registry,display/renderers}.ts and tests`
- `apps/web/src/{main.ts,framework/adapters/bundle.ts} and current file/image authoring examples`
- `packages/loom/vitest.browser.config.ts`
- `docs/ui/forms.md, docs/resource_system_overhaul/ARCHITECTURE.md, and active asset guides`

Out of scope: API/storage implementations, backend StoredAsset schema, storage security, FileManager product operations, and unrelated download behavior. FileManager's collection provider remains distinct from the asset value/upload/preview service. Do not move provider `operations.list()` into resource surface semantics.

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

### 1. Define and install the asset service

Create `assets/contracts.ts` with `AssetValue` using the existing InputAssetValue fields (`kind`, `id`, `url`, `name`, optional `size`, `mimeType`, `updatedAt`, `metadata`). Relocate that canonical type; remove the input-only alias once callers migrate. Do not define a second stored-file DTO or require UI modules to reconstruct assets.

The service contract is:

```ts
interface AssetAdapter {
  read(value: unknown): AssetValue | null
  preview(value: AssetValue): { imageURL: string; thumbnailURL: string }
  upload: UploadOperation<AssetValue>
}
```

`read` handles one value synchronously and is idempotent on a canonical value. Components handle scalar/multi cardinality using that same scalar reader. `upload` returns canonical AssetValue directly and retains UploadOperation's signal/progress/destination context. `preview` describes display URLs without rewriting the model.

Add `assets` to `FrameworkAdaptersInput`. Install it once:

```ts
app.use(FrameworkPlugin, {
  adapters: { ...appAdapters, assets: assetAdapter },
  renderers: { display: appDisplayRenderers },
})
```

Inject the service through the existing app-scoped adapter provider; expose one `useAssetAdapter` consumer. No module-level last-installed asset singleton, per-field adapter prop, nested override provider, or second assets plugin exists. A component requiring assets without configuration throws `ASSET_ADAPTER_REQUIRED`; unrelated components do not fail. Bootstrap validates method presence. Standalone URL-only preview use does not require the asset service.

**Verify:** Unit and Loom types gates; install two apps with different services, mount consumers independently, and assert isolation and missing-provider diagnostics.

### 2. Make inputs consume the installed service themselves

FileInput and ImageInput use the injected service at their own boundary, irrespective of Form. FileManager selections and uploads enter the same reader; previews do not rely on a prior input visit. Remove per-instance `upload`, `toModel`, and `imageURLResolver` wiring from managed asset usage and public asset input props. Keep `accept`, `maxSize`, `multi`, limits, and upload destination as component-owned configuration.

For model values, undefined remains uninitialized, null remains cleared, and `[]` remains an empty multi-selection. Nonempty values rejected by `read` produce a visible invalid-asset state and `validation:error`; do not silently filter an invalid item out of a multi-selection. The reader's null result is never replaced with its input. A structurally invalid callback result throws `ASSET_ADAPTER_INVALID_RESULT` rather than falling back. A canonical empty value must not become a submission merely because it renders empty.

Reading for display never emits a model update by itself. Accepted user selection/upload emits canonical assets once; editing a valid StoredAsset preserves all its contract fields. Form receives those canonical model updates and performs no additional asset hydration. No bare IDs, URL strings, or File objects enter a stored-asset model as guessed alternatives.

**Verify:** Unit, Web behavior, and Browser gates for direct FileInput/ImageInput, Form, and DialogForm with only the one bootstrap registration. Assert no remembered per-instance service prop and unchanged StoredAsset payloads.

### 3. Use the same service for previews and display renderers

Add an explicit `asset` source to ImagePreview and FileComponent, and an `assets` source to ImagePreviewMulti. Asset-mode consumers accept canonical AssetValue values and use the global service. Keep existing URL-mode previews for actual URL-only callers as a mutually exclusive source contract; supplying asset and URL props together is invalid. This is two explicit data-source states, not shape detection or an asset-to-URL guessing converter. Asset paths in inputs, tables, details, TreeTable, and FileManager select asset mode.

```vue
<FileInput v-model="document" />
<ImageInput v-model="photo" />
<FileComponent :asset="document" />
<ImagePreview :asset="photo" />
<ImagePreviewMulti :assets="photos" />
```

Internally preview components resolve URL descriptors through the service. The app file/image display renderers pass values to these components and stop importing/calling app `assetAdapter` themselves. Every asset-aware viewer, including lightboxes and list previews, uses the same interpretation. Maintain URL validation, safe links/iframe behavior, loading/error/empty states, and accessible titles. Clean up the existing ImagePreviewMulti interval on unmount; empty arrays never compute modulo zero.

**Verify:** Browser and Web behavior gates; vary the installed preview URL resolver and verify direct/managed/read-only outputs all change together without model mutation. Cover empty lists, invalid assets, component disposal, and both exclusive preview source states.

### 4. Enforce disabled and operation ownership

Guard all FileInput/ImageInput mutation entry points: native picker activation/change, drop, paste where supported, delete, replacement, reorder, camera acquisition, asset-picker commit, and upload dispatch. Native disabled presentation is necessary but not sufficient. A disabled component starts no new work and emits no user mutation.

An upload started while enabled retains its own operation token. On a later disabled change it may finish the same accepted operation if the component and target row generation still match. It cannot replace a newer value, revive a removed row, or emit after disposal. Release pending state once on every exit. Disabling is not a claim of server cancellation or rollback.

**Verify:** Unit and Browser gates; disabled-at-start means zero uploads/model mutations. Test enabled-to-disabled, removal while uploading, replacement, unmount, and stale completion.

### 5. Remove form-only asset wiring and publish the contract

Remove asset entries from appInputProps and built-in input-prop adapters. Retain the generic registry only until its other callers are removed by the canonical-input plan; no asset consumer may still depend on it. Update app bootstrap, renderer registration, asset schemas/examples, tests, and package exports together. Providers expose services, not a generic configuration-normalization facility.

**Verify:** Unit, Browser, both type gates, Architecture, and `git diff --check`. Search `assetAdapter`, `toModel`, `imageURLResolver`, `InputAssetValue`, and `value.hydrate`; all surviving references must be the single service implementation, explicit service tests, or scheduled non-asset registry removal—not executable asset compatibility paths.

## Test plan

Add `assets/__tests__/provider.spec.ts` and a browser asset-parity fixture registered in `vitest.browser.config.ts`. Cover canonical read idempotence, exact null handling, invalid nonempty values, array cardinality, upload shape, abort/progress, app isolation, service absence, and input/preview parity. Do not require real storage for UI contract tests; stub upload network at the service boundary. Separately run the configured storage/E2E fixture without changing backend schemas. Preserve existing checks that asset form output is accepted by StoredAsset validation.

## Done criteria

- [x] One application-level assets registration serves direct inputs, managed inputs, file/image previews, and registered display renderers.
- [x] F17 disabled mutations are blocked at handlers, not only through CSS.
- [x] F27 has no nullish callback-result fallback; generic form asset hydration is absent.
- [x] Canonical StoredAsset fields, empty values, invalid-state reporting, progress, and pending ownership are preserved.
- [x] Preview-only resolution never rewrites form/record data; service installation is app-scoped.
- [x] Scoped unit/browser/type gates pass with exact executed commands, counts, skips, and exit status recorded.
- [x] Only scoped owners, dependent callers, tests, current documentation, and plan status changed; review `git diff --check` and `git diff --stat`.
- [x] No compatibility alias, fallback to a removed contract, public `any` facade, or type-suppression escape was added.

## STOP conditions

Stop if preserving the existing canonical StoredAsset requires backend edits, the file-manager provider must be rewritten rather than integrated, or a service resolver can only work by keeping Form-specific defaults. Null from read means no usable asset; invalid nonempty input must remain a visible invalid state, not an invented original value.

Do not improvise a new backend contract or suppress a required check. Report a repeated verification failure after two targeted repair attempts. A missing browser, dependency, database, or storage prerequisite blocks that gate rather than justifying a stubbed substitute.

## Maintenance

Keep asset infrastructure configurable once at bootstrap. Add future upload/preview behavior at this domain service, not to a general renderer adapter. Independent URL-only preview remains an explicit primitive capability; asset-mode call sites never manually unpack URLs.

## Reference

Vue app-level provide/inject supplies an app-scoped dependency to descendant components: `https://vuejs.org/guide/components/provide-inject`. This mechanism installs the service; it does not redefine any field props.

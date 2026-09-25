# Carta frontend implementation plans

Source baseline: `223fc622d9a897014fcbad48df838a19cec398db` — `resource_system_overhaul initial commit`. Live review: `b57c6f8` (2026-09-24). Plans 062–069 are accepted.

Earlier per-plan verification notes below are historical. The Plan 069 results and coverage ledger record the final coordinated state.

Execute 062–069 in order. Each Markdown plan contains its intent, current-source excerpts, target, scope, ordered work, tests, commands, completion criteria, and stop conditions. All 27 original findings and the approved architecture changes are assigned below.

This bundle is already in the live checkout. Keep its execution status and evidence in this directory; preserve the historical root `plans/README.md`. The original index is retained in `implementation-evidence/repository-plan-index.txt`. Plans 059–061 do not exist in this checkout; no implementation depends on them. Repository plans 051–058 are historical execution records, not acceptance of this repair.

At planning time, production source was unchanged since `223fc622d9a897014fcbad48df838a19cec398db`; the later commit added this plan bundle, and the user updated `ARCHITECTURE.md` during live review. All cited production source locations still existed. Node was `v26.9.0` and pnpm was `12.1.0`. Baseline checks passed: Loom unit (371 tests), Loom browser (34), web unit (230), surface architecture (11), module tooling (110 Node and 3 Python), and cold Loom/web `vue-tsc --noEmit --incremental false`. Web unit tests need `NODE_OPTIONS=--no-experimental-webstorage` on this Node 26 checkout. CI uses Node 20.19.0, so its commands do not need that local flag. These passes establish the original baseline; they do not verify the proposed repairs.

Follow the current `AGENTS.md`: write no implementation comments and add no tautological tests. Read `DESIGN.md` before changing an `apps/web` page. Use the local index and each plan's done criteria for review.

The updated [architecture](../../ARCHITECTURE.md) is the contract for these plans. It requires explicit renderers, component loader props, one app-level asset service, and removal of field `source` and `FrameworkPlugin.inputProps`. Read it before implementation; it supersedes the source baseline's API.

## Execution order and status

| Plan | Required outcome | Priority | Effort | Dependencies | Status |
|---|---|---|---|---|---|
| [062](062-track-form-edits-and-async-ownership.md) | Make edits, validation, and completion belong to one form session | P1 | L | none | DONE |
| [063](063-provide-one-global-asset-service.md) | Configure asset input and preview behavior once per application | P2 | L | 062 session ownership | DONE |
| [064](064-use-canonical-component-contracts.md) | Make form inputs use component props and Vue models without translation | P1 | L | 062 tracked session and 063 global asset service | DONE |
| [065](065-bind-safe-operations-and-complete-view-props.md) | Bind immutable operation identities and forward complete View contracts | P1 | L | 062, 064 | DONE |
| [066](066-preserve-wrapper-query-and-display-parity.md) | Make wrappers preserve live props, queries, selection, and rendering | P2 | L | 062, 064, 065 | DONE |
| [067](067-narrow-types-and-close-union-escapes.md) | Enforce whole-contract type checks and export compact definitions | P2 | L | 064, 065, 066 | DONE |
| [068](068-centralize-frontend-transport-query-encoding.md) | Put collection wire encoding in the existing Hono adapter | P3 | M | 064, 065, 066, 067 | DONE |
| [069](069-prove-contracts-and-remove-stale-guidance.md) | Make tests, CI, generators, and agent guidance prove the same architecture | P2 | L | 062–068 | DONE |

Status values: TODO, IN PROGRESS, DONE, BLOCKED (with reason), REJECTED (with source-backed reason). Update status only after implementation and review; a failed or unavailable verification is not a pass. Do not parallelize these plans across their shared owners.

Order rationale: tracked form state first; global assets before deleting form adapters; canonical component contracts before wrapper/type proofs; operation and query owners before final generation/CI verification. Type-size and transport duplication are implementation work, not an unassigned backlog.

## Frontend rules

Components own public props, models, events, defaults and supported native attributes. Form adds one tracked session, schema-owned requiredness, validation and submission; it does not make invalid component props valid. Native forwarding stays flat and typed; required component props stay required, component-defaulted props stay optional, and arbitrary extras are rejected. In-progress draft null/undefined values preserve explicit clear/unset states; they do not widen schema validity or authorize nonempty incompatible model values.

Configure asset read/preview/upload once through the app's existing FrameworkPlugin adapter installation. File/image inputs, FileComponent, previews and display renderers use that same service regardless of Form. No field author repeats adapters. This named app-level service is not a general form converter. Explicit schema transforms and transport encoding retain their own documented boundaries.

Every authored input declares renderer. Component loaders live in props. No field source, inferred enum choices, generic input-prop normalization, form-only hydration, or model-shape translation remains. Shared labels, input fragments, business catalogs, and read-only display fragments remain reusable ordinary data. Table/Detail share display rendering; resources bind access/identity/cache effects without field interpretation.

```ts
const roleInput = {
  renderer: 'select',
  props: {
    load: roles.list.table.load,
    namespace: roles.list.table.namespace,
    pick: 'id',
    view: 'name',
  },
} as const

const editor = defineForm({
  schema: createSchema,
  fields: {
    name: { renderer: 'text', props: { autocomplete: 'name', maxlength: 120 } },
    roleId: roleInput,
    attachment: { renderer: 'file' },
  },
  submit: createRecord,
})

app.use(FrameworkPlugin, {
  adapters: { ...appAdapters, assets: assetAdapter },
  renderers: { display: appDisplayRenderers },
})
```

```vue
<Form v-bind="editor" />
<DialogForm v-bind="editor" title="Create" />
<DialogForm v-bind="editor" :submit="createElsewhere" />
<FormView v-bind="records.create" />
<Form v-bind="records.create.form" />
<Table v-bind="records.list.table" />
<ImageInput v-model="photo" />
<ImagePreview :asset="photo" />
```

These are implementation targets, not a claim that the baseline already supports them. Schemas and action functions in examples represent the module's actual contracts; do not invent API properties from illustrative field names.

## Complete finding coverage

Priority below is the original audit classification. New architectural constraints are identified separately from observed baseline defects. F07's required outcome is explicit configuration, not an enum converter. F27's generic hydration path is deleted; its result-preservation invariant applies to the configured asset service.

| Finding | Plan owner | Required correction |
|---|---|---|
| F01 · P1 | [062](062-track-form-edits-and-async-ownership.md) | Track private edits; detach read-only drafts and Dates; preserve explicit transient empty values. |
| F02 · P1 | [062](062-track-form-edits-and-async-ownership.md) | A component-owned invalid-edit event blocks submission independently of candidate key presence. |
| F03 · P1 | [062](062-track-form-edits-and-async-ownership.md) | Bind post-await completion, errors and pending flags to the originating form generation. |
| F04 · P2 | [062](062-track-form-edits-and-async-ownership.md) | A single Save intent supersedes blur validation instead of disappearing. |
| F05 · P2 | [066](066-preserve-wrapper-query-and-display-parity.md) | Forward current component props and current model presence, not an initial snapshot. |
| F06 · P2 | [066](066-preserve-wrapper-query-and-display-parity.md) | Use one controlled-parent/uncontrolled-Collection query owner with exactly one update event. |
| F07 · P1 | [064](064-use-canonical-component-contracts.md) | Delete automatic renderer/enum-choice synthesis; require canonical explicit selector props. |
| F08 · P2 | [064](064-use-canonical-component-contracts.md) | Derive model/prop compatibility from components; remove the independent renderer-kind matrix. |
| F09 · P2 | [064](064-use-canonical-component-contracts.md) | Pass schema-derived requiredness to the component after authored props. |
| F10 · P2 | [065](065-bind-safe-operations-and-complete-view-props.md) | Null permission still goes through the row-policy access seam. |
| F11 · P1 | [065](065-bind-safe-operations-and-complete-view-props.md) | Bind immutable scalar/composite identities and detached policy context. |
| F12 · P2 | [065](065-bind-safe-operations-and-complete-view-props.md) | Bind context with withContext; preserve the exact business run/can argument tuple. |
| F13 · P2 | [065](065-bind-safe-operations-and-complete-view-props.md) | Derive declarations and forwarding from complete canonical View contracts. |
| F14 · P2 | [066](066-preserve-wrapper-query-and-display-parity.md) | Use nested Form labels and the standard actions slot; remove wrapper aliases. |
| F15 · P2 | [066](066-preserve-wrapper-query-and-display-parity.md) | Render the tree column through DisplayValue with original-record/accessor semantics. |
| F16 · P2 | [066](066-preserve-wrapper-query-and-display-parity.md) | Separate committed hydration from edited staging generations. |
| F17 · P2 | [063](063-provide-one-global-asset-service.md) | Block disabled asset mutation handlers and govern accepted in-flight work by token. |
| F18 · P2 | [065](065-bind-safe-operations-and-complete-view-props.md), [067](067-narrow-types-and-close-union-escapes.md) | Check whole unions/all keys; validate result identity before presentation independently of routes. |
| F19 · P2 | [067](067-narrow-types-and-close-union-escapes.md) | Use field-keyed typed slots and one read-only draft/ref contract across wrappers. |
| F20 · P2 | [069](069-prove-contracts-and-remove-stale-guidance.md) | Use real controls and plausible broken counterexamples; remove tautological/incidental assertions. |
| F21 · P2 | [069](069-prove-contracts-and-remove-stale-guidance.md) | Run Loom unit and tooling suites explicitly; include matching workflow triggers. |
| F22 · P3 | [067](067-narrow-types-and-close-union-escapes.md) | Return compact named contracts with useful refinements; hide proof aliases and measure fairly. |
| F23 · P3 | [068](068-centralize-frontend-transport-query-encoding.md) | Encode the unchanged HTTP query protocol once in the existing Hono adapter. |
| F24 · P3 | [065](065-bind-safe-operations-and-complete-view-props.md) | Delete unused identity declaration helpers and identical runtime aliases. |
| F25 · P2 | [069](069-prove-contracts-and-remove-stale-guidance.md) | Compile actual examples; align root docs, nested skills and generators with real owners. |
| F26 · P2 | [066](066-preserve-wrapper-query-and-display-parity.md) | Recheck close generation/busy state after awaited guard approval. |
| F27 · P2 | [063](063-provide-one-global-asset-service.md), [064](064-use-canonical-component-contracts.md) | Delete generic input hydration; preserve global asset reader null without raw-value fallback. |

Plan 069 proves integration for every row. No original finding is silently dropped or considered implemented because the observed file moved.

## Decision coverage

| Decision | Owners |
|---|---|
| D01 — Supported native attributes are explicit typed component API; flat props, no arbitrary extras or blanket Partial. | 064, 067, 069 |
| D02 — Configure one app-level asset service for direct/managed inputs, previews and display. No per-field adapter. | 063, 064, 066, 069 |
| D03 — Every authored input names its renderer; schemas derive requiredness, not UI choices. | 064, 069 |
| D04 — Resource loaders are passed through canonical component props. Delete field source and generic input prop adapters. | 064, 065, 068, 069 |
| D05 — Form forwards actual component Vue models and validity events; no Form-only coercion or hydration. | 062, 063, 064, 067 |
| D06 — Keep default submit, explicit overrides, flat Form/DialogForm and nested complete View bags. | 062, 064, 065, 066, 067, 069 |
| D07 — Share labels, input props, business catalogs, display accessors/renderers/formats without a universal field. | 064, 066, 067, 069 |
| D08 — Keep backend contracts unchanged; deliberate schema, asset-service and transport boundaries have explicit owners. | 062, 063, 064, 065, 068, 069 |
| D09 — Finish with no executable legacy paths, duplicate contracts, unsupported tests, or stale active authoring examples. | 064, 065, 066, 067, 068, 069 |

## Scope

The coordinated change includes Loom contracts/constructors/session/renderers, real inputs and native forwarding, assets and previews, Form/DialogForm/page wrappers, Table/TreeTable/Detail/export, collection/query ownership, composite inputs, resource access/identity/commands, frontend Hono integration, all affected app resources/routes, plugin bootstrap, tests/type fixtures, generators/checkers, CI, current docs and agent skills. Each plan lists its concrete owners and caller closure.

Backend schemas, server authorization, storage implementations, SDK protocol, vendored UI internals, dependency upgrades and unrelated product features are not redesigned. Their existing integration contracts remain regression constraints. Previously unexecuted schema/location/export/multi-app boundaries are listed as validation obligations, not newly claimed findings.

## Verification and evidence

Plan preparation used the supplied archive and prior audit evidence; it changed only files under `plans/`. No framework fix, package installation, pinned Vue/unit/browser/E2E run, build, or new performance benchmark was performed. Earlier isolated probes used explicit doubles and a global compiler; they are not integration certification. All implementation statuses start TODO.

- `implementation-evidence/coverage.json`: machine-readable ownership and fixed outcomes for every finding/decision.
- `implementation-evidence/baseline-observations.json`: source locations and original observations, without obsolete repair instructions.
- `implementation-evidence/baseline-runtime-probes.json` and `baseline-verification.json`: prior execution records, not new passes.
- `implementation-evidence/source-inventory.json`: exact source hashes and archive identity used for planning.
- `implementation-evidence/plan-validation.json`: document checks, not a code correctness verdict.

Record each implementation command, exit code, test counts/skips, baseline/candidate failures and missing prerequisites. Plan 067 requires one comparable cold type-boundary baseline/candidate; no repeated-run campaign or unsupported performance claim.

### Plan 062 accepted evidence

Plan 062 passed parent review. The regression checks failed before the implementation for the expected defects:

Environment: Node `v26.9.0`, pnpm `12.1.0`.

| Check | Result |
|---|---|
| `pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/form.spec.ts --environment jsdom` | Exit 1; four expected failures covered writable draft snapshots, an optional invalid number buffer, and late fulfillment/rejection effects from session A. |
| `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/composites/__tests__/SurfaceParity.browser.spec.ts` | Exit 1; deferred blur validation left the Save button disabled. An earlier selector setup miss was corrected before recording this assertion. |
| `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/text-input-surface.spec.ts src/components/core/__tests__/form.spec.ts --environment jsdom` | Exit 1; red regressions showed `12abc` submitted as 12, `-` submitted as negative zero, and an empty number submitted as 0. |
| `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/text-input-surface.spec.ts src/components/core/__tests__/form.spec.ts --environment jsdom` | Exit 1; added direct cases showed valid `1,000` and `1.000` group text was rejected or parsed as 1, and NumberInput kept invalid text after a parent model replacement. The mounted hide/show case showed that an old control error blocked a fresh blank optional input. |
| `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/form.spec.ts -t "resets retained invalid number text" --environment jsdom` | Exit 1; resetting to the unchanged canonical value left `12abc` visible in NumberInput. |
| `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/form.spec.ts -t "resets invalid number text while preserving a pending file upload" --environment jsdom` | Exit 1; a mounted Form with invalid NumberInput text and a deferred FileInput upload kept the upload pending, but reset left `12abc` visible. |
| `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/form.spec.ts -t "resets invalid number text while preserving a pending file upload" --environment jsdom` | Exit 1 after NumberInput reset was fixed; the valid TextInput sibling changed DOM identity even though it had reported no local error. |
| `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/composites/__tests__/SurfaceParity.browser.spec.ts -t "real DateInput"` | Exit 1; pasted invalid text reached the real Datepicker formatter, threw, and left Save able to submit the previous date. |

Candidate checks passed:

| Gate | Command | Result |
|---|---|---|
| Focused unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/forms/__tests__/useFormSession.spec.ts src/components/core/__tests__/form.spec.ts src/components/inputs/__tests__/text-input-surface.spec.ts src/components/inputs/__tests__/FileInput.spec.ts src/components/composites/__tests__/DialogForm.managed.spec.ts --environment jsdom` | Exit 0; 5 files, 54 tests, including locale grouping, malformed and partial number text, clear/unset, parent model replacement, same-value and pending-upload reset, hidden/show validity, repeated error invalidation, FileInput ownership, and DialogForm lifecycle. |
| Mixed reset/upload regression | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/form.spec.ts -t "resets invalid number text while preserving a pending file upload" --environment jsdom` | Exit 0; 1 test proves reset remounts only the invalid NumberInput, keeps a valid TextInput and pending FileInput mounted, uses the same reset function through the exposed ref and actions slot, submits the completed asset, and later restores the asset baseline. |
| Dialog lifecycle | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/composites/__tests__/DialogForm.managed.spec.ts --environment jsdom` | Exit 0; 1 file, 3 tests, including a deferred save across close/reopen. |
| FileInput unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/FileInput.spec.ts --environment jsdom` | Exit 0; 1 file, 15 tests, including pending-operation ownership after reset. |
| Browser regression | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/composites/__tests__/SurfaceParity.browser.spec.ts` | Exit 0; 1 file, 5 tests. Existing NumberInput placeholder and `prefix` attribute warnings remain. |
| Loom unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Earlier rerun: Exit 1; reset remounted a pending FileInput. Form now increments component keys only for fields with a current session control error when reset begins. The mounted regression confirms that a valid sibling and pending FileInput keep their identity. Final rerun: Exit 0; 59 files, 391 tests. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 10 files, 37 tests. Existing NumberInput placeholder and `prefix` attribute warnings remain. |
| Loom types | `pnpm --filter @southneuhof/loom type-check`; `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json`; `rm packages/loom/tsconfig.tsbuildinfo` | The first incremental run with the ignored `packages/loom/tsconfig.tsbuildinfo` reported TS2502 in `formContracts.ts`; cold type-check passed. After removing that generated cache, the required incremental command passed. Final rerun after the reset seam change: Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Earlier parallel run: Exit 1 with one nested-navigation assertion failure and 229 passing tests; isolated rerun passed. Revision rerun: Exit 0; 47 files, 230 tests. Vitest reports existing configuration deprecation warnings. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; 11 architecture tests passed and the surface checks passed on the revision. |
| Tooling | `pnpm test:module-tooling` | Exit 0; 110 Node tests and 3 Python tests. |
| Diff whitespace | `git diff --check` | Exit 0. |

The workspace final gate remains for the coordinated implementation after Plans 062–069.

### Plan 063 implementation evidence

Plan 063 passed parent review. Environment: Node `v26.9.0`, pnpm `12.1.0`.

The disabled-handler regression was run red before its final green check. During the red run, the disabled guards were temporarily removed from FileInput's native change, drop, and upload entry points. The upload spy was called once; the guards were restored before the green run.

Two intermediate verification attempts also exposed test/type setup issues that were corrected before the final gates:

| Check | Command | Result |
|---|---|---|
| Initial asset parity browser fixture | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/assets/__tests__/AssetParity.browser.spec.ts` | Exit 1; the test selected a Next image button that was not rendered. It now checks ImagePreviewMulti's real thumbnail through the shared service. |
| Initial preview type check | `pnpm --filter @southneuhof/loom type-check` | Exit 1; an intermediate AssetValue/AssetPreview union did not narrow before URL access. The branches now narrow the canonical asset before calling `preview`. |

| Check | Command | Result |
|---|---|---|
| Disabled mutation regression, red | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/FileInput.spec.ts -t "blocks disabled picker and drop handlers" --environment jsdom` | Exit 1 as expected; the test reported one upload call after the guards were temporarily removed. |
| Disabled mutation regression, green | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/FileInput.spec.ts -t "blocks disabled picker and drop handlers" --environment jsdom` | Exit 0; 1 passed, 20 skipped by the test-name filter. |
| FileManager input integration | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/FileInput.file-manager.spec.ts --environment jsdom` | Exit 0; 1 file, 4 tests. The real picker feeds canonical FileInput/FileManagerInput models through the registered reader; deferred selections do not commit after disable. |
| Initial Loom unit rerun | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 1; 399 passed and 2 failed because Plan 062 Form/FormView fixtures still passed `upload` as a per-field prop. The fixtures now install that upload through `FrameworkPlugin.adapters.assets`. |
| Loom unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 60 files, 406 tests. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 11 files, 38 tests, including the explicit asset parity browser fixture. Existing NumberInput `placeholder` and `prefix` warnings remain. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 47 files, 229 tests. Existing Vitest configuration deprecation warnings remain. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; 11 tests passed and surface checks passed. |
| Module tooling under parallel load | `pnpm test:module-tooling` | Exit 1; 109 of 110 Node tests passed. The command-duration check timed out while the Loom unit, browser, and type gates were running concurrently. |
| Module tooling isolated rerun | `pnpm test:module-tooling` | Exit 0; 110 Node tests and 3 Python tests. |
| Diff whitespace | `git diff --check` | Exit 0. |

Plan 063 review revision regressions:

| Check | Command | Result |
|---|---|---|
| FileComponent source-mode regression, red | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/utils/__tests__/FileComponent.spec.ts --environment jsdom` | Exit 1 as expected when the source guard was temporarily restored to reject only `url`; the test failed because asset plus `filename` and asset plus `ext` were accepted. |
| FileManager selection target regression, red | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/FileInput.file-manager.spec.ts -t "preserves an external" --environment jsdom` | Exit 1 as expected with the post-await generation checks temporarily removed; 3 tests failed because stale FileInput, ImageInput, and FileManagerInput selections appended after the target model changed. |
| Camera stale failure regression, red | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/CameraInput.spec.ts --environment jsdom` | Exit 1 as expected with the stale failure guards temporarily removed; all 6 camera and upload failure cases reported stale toasts after disable, reset, or replacement. |
| Camera disable-cycle regression, red | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/CameraInput.spec.ts -t "upload failure after disable and re-enable" --environment jsdom` | Exit 1 as expected with the disabled-generation check temporarily removed; the deferred upload rejection toasted after a disable/re-enable cycle. |
| Review revision focused unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/utils/__tests__/FileComponent.spec.ts src/components/inputs/__tests__/FileInput.file-manager.spec.ts src/components/inputs/__tests__/CameraInput.spec.ts --environment jsdom` | Exit 0; 3 files, 18 tests. |
| FileComponent browser regression | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/assets/__tests__/AssetParity.browser.spec.ts` | Exit 0; 1 file, 2 tests. The existing file remains in the browser config include list. |
| Loom full unit after review | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 62 files, 420 tests. |
| Loom browser after review | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 11 files, 39 tests. Existing NumberInput `placeholder` and `prefix` warnings remain. |
| Loom types after review | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types after review | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated routes passed before `vue-tsc`. |
| Web behavior after review | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 47 files, 229 tests. Existing Vitest configuration warnings remain. |
| Architecture after review | `pnpm test:surface-architecture` | Exit 0; 11 tests passed and surface checks passed. |
| Module tooling after review | `pnpm test:module-tooling` | Exit 0; 110 Node tests and 3 Python tests. |
| Diff whitespace after review | `git diff --check` | Exit 0. |

Camera stream ownership review:

| Check | Command | Result |
|---|---|---|
| Retake and teardown ownership regression, red | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test -- src/components/inputs/__tests__/CameraInput.spec.ts` | Exit 1 as expected; 420 passed and three new stream lifecycle tests failed because retake did not start a replacement request, while unmount left the active track running. |
| Camera stream ownership focused unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/CameraInput.spec.ts --environment jsdom` | Exit 0; 1 file, 12 tests. |
| Loom full unit after camera ownership | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 62 files, 424 tests. |
| Loom browser after camera ownership | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 11 files, 39 tests. Existing NumberInput `placeholder` and `prefix` warnings remain. |
| Loom types after camera ownership | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Diff whitespace after camera ownership | `git diff --check` | Exit 0. |

Asset storage/E2E remains unverified. The repository has no asset upload E2E fixture; app upload tests mock `uploadFile` at the storage boundary. No real storage service or credentials were configured for this work. The full workspace gate remains for the coordinated implementation after Plans 062–069.

## Considered and excluded

Do not add compatibility paths, a generic frontend conversion layer, a new workflow engine, arbitrary prop extras, per-field asset setup, or backend changes to satisfy a UI abstraction. Keep legitimate component internals, explicit read/format/schema behavior, app asset services and transport encoding. Runtime shape guards and static types serve different callers; their coexistence is not itself duplicated authority. Small files with a real shared owner are not defects by size.

The prior F07 enum-converter prescription and generic F27 hydration repair are not implementation instructions. The exact current outcomes are in plans 064 and 063. Old source evidence is retained solely to identify the original problems.

### Plan 064 implementation evidence

Plan 064 passed parent review. Environment: Node `v26.9.0`, pnpm `12.1.0`.

The initial Web type check exited 1. It found an import of the deleted app input registry in `statuses.spec.ts`, a misplaced `@ts-expect-error`, a missing explicit renderer in `QueryOwnershipFixture.vue` (with a follow-on unknown submit event type), and renderer/model mismatches for single and multi file values, textarea modes, and data/load-backed radio and checkbox-group controls. The stale assertion and fixture were updated. Form types now follow each control's actual prop mode and option result. The final Web type gates passed.

The first full Loom unit run exited 1 with 25 failed tests and 4 unhandled errors. Existing Form fixtures still omitted required renderers; a renderer test looked for control styling on the outer wrapper; and DialogForm tests dispatched input and the next action in one test turn. Form fixtures now name their renderers, the style assertion checks the control wrapper, and the DialogForm tests flush the real model update between user actions. The final Loom unit gate passed.

The first workspace chain stopped at `pnpm lint` with exit 1 after type-check and tests passed. Formatting failed for `apps/web/src/framework/adapters/assets.ts`, `apps/web/src/framework/display/renderers.spec.ts`, and `apps/web/src/framework/display/renderers.ts`; OxFmt corrected these files. The workspace chain then passed.

The first Loom type check after adding the generic TableInput contract exited 2. The pinned Vue checker returned `never` for the generic SFC's `$props`; the first correction also had a duplicate type-test name and a column callback that was too narrow for the broad table type. `FormRendererProps<'table'>` now uses the component's exported `TableInputProps` contract. The type fixture uses the default column reader and checks that `table` remains required. The corrected Loom type check passed, and the required gates below were rerun after this correction.

The full gate table below records the coordinated Plan 064 run before the parent-review follow-up. The focused evidence after that follow-up is listed separately.

| Gate | Command | Result |
|---|---|---|
| Loom unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 61 files, 416 passed, 0 skipped. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 13 files, 41 passed, 0 skipped, including the new native TextInput/Form and numeric SelectInput parity cases. Existing NumberInput `placeholder` and `prefix` runtime warnings remain. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Loom cold types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated routes passed before Vue type-checking. |
| Web cold types | `pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false -p tsconfig.vitest.json` | Exit 0. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 46 files, 225 passed, 0 skipped. Vitest reports existing configuration deprecation warnings. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; 13 architecture tests passed, 0 skipped, and surface checks passed. |
| Tooling | `pnpm test:module-tooling` | Exit 0; 112 Node tests passed, 0 skipped, and 3 Python tests passed. |
| Workspace | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Final run exit 0. Type-check: 6 tasks, 4 cached. Tests: 12 tasks, 8 cached; the architecture suite reported 13 passing tests. Lint: 3 tasks, 2 cached. Build: 6 tasks were cached. |
| Fresh workspace build | `pnpm exec turbo run build --force --output-logs=errors-only --filter=@southneuhof/sprindle --filter=@southneuhof/sdk --filter=@southneuhof/utilities --filter=@southneuhof/loom --filter=@southneuhof/api --filter=@southneuhof/framework-web` | Exit 0; 6 tasks, 0 cached. Turbo reports its existing missing-output configuration warnings for Loom, SDK, and utilities. |
| Whitespace | `git diff --check` | Exit 0. |

The workspace chain was repeated after the first lint failure. Its final build tasks were cache hits, so the separate forced build was also run and passed. The full app unit and Loom browser gates ran directly above; the workspace test command reported cached tasks as listed. No required gate remains unrun.

### Plan 064 parent-review follow-up

The first native-prop extraction attempt made `TextInputProps` use a broad `Pick<InputHTMLAttributes, ...>`. Its type check exited 2 with TS2590 in `TextInput.vue(35,23)` and `renderers/form.ts(9,13)`; the initial version also conflicted with PasswordInput's emitted `onInput` type at `PasswordInput.vue(25,4)`. A trial with the indexed autocomplete type also exited 2 with TS2590. The component now owns one finite native prop interface. Its native values use Vue's indexed types where the pinned SFC checker handles them; `readonly` narrows `InputHTMLAttributes['readonly']` to its boolean member. FormRendererProps derives finite native props from TextInput and PasswordInput instead of intersecting a second native map. Type fixtures check direct/managed parity and reject the string value `'false'` for both controls.

The pinned Vue compiler cannot put the template-literal `data-*` family in the SFC's declared props: a browser compile probe exited 1 with `Failed to resolve index type into finite keys`. A direct SFC template type probe also exited 2 with TS2353 for `dataFieldKind`. Keep this bounded family as a separate fallthrough-attribute contract; no finite native prop is added only by Form.

The first numeric-clear browser regression exited 1: after clearing direct TextInput, the model became `NaN` instead of `undefined`. An echoed unset model reached the numeric watcher as `undefined` and was converted with `Number(undefined)`. The watcher now preserves empty and unset values. The browser regression checks direct and managed models, confirms the cleared submit value is undefined, then confirms numeric re-entry submits `6`. Inspection also found the same empty-number conversion in numeric TextareaInput and unset stringification in PasswordInput; both now preserve unset values. TextareaInput's unit case checks clear, numeric re-entry, and an externally unset model.

| Check | Command | Result |
|---|---|---|
| Numeric clear regression, red | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Form.browser.spec.ts` | Exit 1; 1 of 2 tests failed. The new test expected the direct numeric model to be undefined and received NaN. |
| Focused input unit tests | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/text-input-surface.spec.ts --environment jsdom` | Exit 0; 1 file, 14 passed, 0 skipped. |
| Focused Form browser tests | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Form.browser.spec.ts` | Exit 0; 1 file, 2 passed, 0 skipped. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated routes passed before Vue type-checking. |
| Lint | `pnpm lint` | Exit 0; 3 tasks passed, 2 cached. |
| Whitespace | `git diff --check` | Exit 0. |

The full workspace unit, browser, and build gates were not repeated after this narrow follow-up. The new regressions and both requested type gates passed.

### Plan 064 numeric draft validity follow-up

Plan 064 numeric validity review: Numeric TextInput and TextareaInput now keep invalid nonempty text in their local edit buffer. They update the model only for finite values that match the control mode. They emit `validation:error` for invalid text and clear it after a valid edit or an empty edit. Empty numeric controls emit `undefined`. Form receives these events through its existing control contract and blocks submit while a visible field has a control error.

TextInput's numeric mode model includes `undefined` in `TextInputModelValue`; the existing pinned type fixture asserts `number | undefined`. TextareaInput's published model type also includes `undefined`. Form passes these component values through without a conversion buffer.

TextInput accepts a decimal point only when the full input matches its numeric pattern and parses to a finite number. Integer mode accepts digits only. Textarea's number mode keeps its existing digits-only edit rule. Both controls reject malformed pasted text and values too large to stay finite. The model watcher keeps equivalent numeric input text, including a trailing decimal point, visible while the model holds its parsed number.

The first focused browser run exited 1 with two test failures. The TextInput test expected the Form error text before the field was touched or a submit was attempted; Form hides field issues until one of those events. The Textarea test expected its asynchronous Form renderer before the lazy component had mounted. The revised browser test checks that invalid submit is blocked, checks the visible error after the attempt, and waits for the renderer.

| Check | Command | Result |
|---|---|---|
| First focused browser run | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Form.browser.spec.ts` | Exit 1; 1 of 3 tests passed. One assertion expected the hidden helper text; one assertion ran before the lazy Textarea renderer mounted. |
| Numeric input unit tests | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/text-input-surface.spec.ts --environment jsdom` | Exit 0; 1 file, 14 passed, 0 skipped. The Textarea case checks partial and malformed drafts, error clear, numeric recovery, and an unset model. |
| Numeric Form browser tests | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Form.browser.spec.ts` | Exit 0; 1 file, 3 passed, 0 skipped. Direct and managed TextInput and Textarea keep partial, malformed, and overflowing drafts local, block invalid submission, recover to a valid number, and submit the valid value. TextInput also submits unset after clear and accepts numeric re-entry. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated routes passed before Vue type-checking. |
| Lint | `pnpm lint` | Exit 0; 3 tasks passed, 2 cached. |
| Whitespace | `git diff --check` | Exit 0. |

The full workspace unit, browser, and build gates were not repeated after this focused correction.

Parent final-state gates: Loom unit exit 0 (61 files, 418 tests); Loom browser exit 0 (13 files, 43 tests); Loom and Web type checks exit 0; Web unit exit 0 (46 files, 225 tests); surface architecture exit 0 (13 tests); module tooling exit 0 (112 Node tests and 3 Python tests). The existing NumberInput browser warnings and Web Vitest configuration warnings remain. The full workspace chain and forced build passed before the two focused numeric revisions and remain unverified on this exact final state; run them after the coordinated Plans 062–069 migration.

### Plan 065 implementation candidate evidence

Plan 065 passed parent review. Environment: Node `v26.9.0`, pnpm `12.1.0`.

The implementation adds regression coverage at the bound operation and mounted FormView seams. Unit cases change source identities and records after binding, check scalar and composite targets, cross null permission with row restrictions, preserve default and rest arguments plus a business payload named `record`, validate create and update results, and check one dispatch and post-write invalidation errors. The browser case submits through the real FormView and checks that an invalid result reports a non-retryable post-write error without navigation or success callbacks.

The app adapter and Loom custom-command policy both reject an explicit `allowedOperations` array unless every entry is a nonempty string. Direct tests include a malformed array that contains the requested operation and a valid allow control; the custom-command test confirms a denied write makes no call.

The first Web behavior run exited 1. Its isolated resource-route compiler had no app display renderer registry augmentation, so `DisplayRendererKey` was `never`: the resolver's normalized `props` field then conflicted with `DisplayField.props`, and spreading `entry.props` failed. `resolveDisplayFields` owns the runtime-validated normalized prop map, so `ResolvedDisplayField` now omits only the renderer-specific `props` type and reads the runtime member as `unknown` before copying an object. The route test remains active and still proves that deleting a generated route makes the real resource declaration fail type checking. Its focused rerun passed.

The generator annotates identity-bound update output with the schema output type. After formatting the checked-in fixture, the first tooling rerun exited 1 because generated syntax did not match that fixture. The generator now emits the formatter's parenthesized `typeof` syntax, and the static verifier checks the same shape. A further run exposed the verifier's earlier pattern; the final tooling rerun passed.

| Check | Command | Result |
|---|---|---|
| Loom unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 61 files, 424 passed, 0 skipped. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 13 files, 44 passed, 0 skipped. Existing NumberInput placeholder/prefix and Vue Router test warnings remain. |
| Focused bound resource | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/resources/__tests__/boundResource.spec.ts --environment jsdom` | Exit 0; 1 file, 12 passed, 0 skipped. |
| Focused row adapter | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web exec vitest run --environment jsdom --root src/ framework/adapters/bundle.spec.ts` | Exit 0; 1 file, 7 passed, 0 skipped. |
| Focused route proof | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web exec vitest run --environment jsdom --root src/ router/__tests__/route-type-generation.spec.ts -t 'makes a deleted route fail through the real resource contract'` | Exit 0; 1 passed, 3 skipped by the test-name filter. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated route checks passed before Vue type-checking. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 46 files, 227 passed, 0 skipped. Existing Vitest option deprecation warnings remain. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; 13 tests passed, 0 skipped, and surface checks passed. |
| Tooling | `pnpm test:module-tooling` | Exit 0; 112 Node tests passed, 0 skipped, and 3 Python tests passed. |
| Workspace chain | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Exit 0. Type-check: 6 tasks, 4 cached. Tests: 12 tasks, 8 cached. Lint: 3 tasks, 3 cached. Build: 6 tasks, 6 cached. Turbo reports its existing missing-output configuration warnings for Loom type-check and build. |
| Whitespace | `git diff --check` | Exit 0. |

No server or external service was needed. All required Plan 065 gates now pass. The plan stays TODO for parent review.

### Plan 066 implementation candidate evidence

Plan 066 passed parent review. Environment: Node `v26.9.0`, pnpm `12.1.0`.

DialogForm now derives its forwarded prop roster from Form's runtime declarations and the declared native attribute contract. Mounted browser cases add and remove Form props after mount, check native attributes and slots, and defer close approval across a new session and a pending submit. FormView keeps labels and loading/error/input/actions slots in the nested Form contract. ListView, Table, and Collection now use one query owner; browser cases round-trip controlled updates, switch namespaces and query modes, and restore state after browser back. TreeTable default cells use DisplayValue, including the asset renderer on a tree column through the globally registered asset adapter. Lookup staging and TableInput session ownership have deferred and browser interaction coverage.

The first run of `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/DisplayParity.browser.spec.ts` exited 1; 1 test failed because a missing thumbnail URL loaded as an image error and ImagePreview selected its full-size fallback (`expected thumbnail, received full`). The test now returns successful data URLs with distinct thumbnail/full fragments from the global adapter and checks that the TreeTable indentation cell renders the adapter's thumbnail. The same focused command then passed: 1 file, 1 passed, 0 skipped.

The first `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` run exited 1; 60 files passed and 1 failed, with 428 tests passed and 1 failed. `collection.spec.ts` supplied a fixed controlled query and expected an update without a parent event round-trip (`expected 2 loader calls, received 1`). It now exercises Collection's uncontrolled owner; the focused rerun `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/collection.spec.ts --environment jsdom` passed: 1 file, 1 passed, 0 skipped.

The first `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` run exited 1; 45 files passed and 1 failed, with 226 tests passed and 1 failed. `QueryOwnershipFixture.spec.ts` found the local controlled query did not apply emitted updates because its fixture had no update listener (`expected 2 / 4, received 1 / 4`). The fixture now feeds `update:query` back to its parent ref. The focused rerun `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web exec vitest run --environment jsdom --root src/ framework/acceptance/QueryOwnershipFixture.spec.ts` passed: 1 file, 7 passed, 0 skipped.

The first `pnpm --filter @southneuhof/loom type-check` run exited 2 with two reported TypeScript errors: the native roster used the HTML spelling `accept-charset` where the Form prop key is `acceptCharset`, and tuple inference rejected the native binding filter. The roster now uses the component prop key and Form builds declared native bindings into a typed map. The focused Loom and Web type checks then passed.

The final native-attribute case also checks `acceptCharset` against the browser's `accept-charset` attribute and verifies that an explicit `novalidate: false` overrides Form's default. An intermediate template binding passed the allowed empty-string native value through unchanged; two focused type checks exited 2 because Vue's DOM type accepts only booleans and the strings `true` or `false`. Form now maps the empty-string boolean attribute to `true`; the final focused Loom type check passed.

| Check | Command | Result |
|---|---|---|
| Loom unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 61 files, 429 passed, 0 skipped. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 14 files, 53 passed, 0 skipped. Existing DialogContent description, NumberInput placeholder/prefix, and Vue Router route warnings remain. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated route checks passed before Vue type-checking. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 46 files, 227 passed, 0 skipped. Existing esbuild/oxc option and Vitest pool deprecation warnings remain. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; 13 tests passed, 0 skipped, and surface checks passed. |
| Tooling | `pnpm test:module-tooling` | Exit 0; 112 Node tests passed, 0 skipped, and 3 Python tests passed. |
| Workspace chain | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Exit 0. Type-check: 6 tasks successful, 4 cached. Tests: 12 tasks successful, 8 cached. Lint: 3 tasks successful, 2 cached. Build: 6 tasks successful, all cached. Turbo reports its existing missing-output configuration warnings for Loom type-check and build. |
| Whitespace | `git diff --check` | Exit 0. |

No server or external service was needed. All required Plan 066 gates pass. The plan stays TODO for parent review.

### Plan 066 parent-review follow-up

FormView now renders its default Save control only when the nested Form has a submit function. Its component ref exposes read-only Form state and forwards validate, submit, reset, and refresh to the same mounted Form. Form and DialogForm bind only their declared native attributes and the documented `data-*` family; undeclared bare attributes do not reach the native form. Supported ARIA and data attributes stay live when added, changed, or removed. DialogForm class/style remain on the dialog root.

The first `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/views/__tests__/views.spec.ts --environment jsdom -t 'shows Save only|exposes the managed Form state'` run exited 1; 1 of 50 tests failed because the Save assertion also matched NavigationHeader's back button outside the form. The selector now checks submit controls inside the nested `<form>`.

| Check | Command | Result |
|---|---|---|
| FormView focused unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/views/__tests__/views.spec.ts --environment jsdom -t 'shows Save only|exposes the managed Form state'` | Exit 0; 1 file, 2 passed, 48 skipped by the test-name filter. |
| Native attribute browser | `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/composites/__tests__/SurfaceParity.browser.spec.ts -t 'native declarations|current ARIA and data attributes'` | Exit 0; 1 file, 2 passed, 9 skipped by the test-name filter. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated route checks passed before Vue type-checking. |
| Lint | `pnpm lint` | Exit 0; 3 tasks successful, 2 cached. |
| Whitespace | `git diff --check` | Exit 0. |

Parent final-state reruns passed: Loom unit exit 0 (61 files, 431 tests), Loom browser exit 0 (14 files, 54 tests), and Web behavior exit 0 (46 files, 227 tests). Existing browser and Vitest warnings remain. The full workspace chain passed before the focused follow-up and will run again after Plans 067–069.

### Plan 067 implementation candidate evidence

Environment: Node `v26.9.0`, pnpm `12.1.0`, Vue checker `3.3.11`, TypeScript `6.0.2`. The baseline and candidate used the same host, package commands, compiler versions, generated route preparation, and cold `--incremental false` scope. The candidate enables `checkUnknownSlots` in Loom and Web so wrong slot names fail in the real SFC fixtures; the baseline used its prior disabled setting. The metrics below record that stricter candidate setting. This configuration change means the measurements do not isolate source narrowing by itself.

Baseline and candidate logs are in `implementation-evidence/plan-067-{baseline,candidate}-{loom,web}.log`; `plan-067-environment.txt` records the installed toolchain. The Web route contract was prepared with `pnpm --filter @southneuhof/framework-web type-check` before each measurement. The candidate Web route state was generated immediately before its cold measurement.

| Package and run | Exact command | Exit | Types | Instantiations | Checker memory | Checker total | Process real | Peak RSS |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Loom baseline | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false --extendedDiagnostics -p tsconfig.json` | 1; 17 fixture diagnostics (3 TS2322, 14 unused TS2578) | 197,864 | 876,741 | 851,991K | 4.65s | 5.54s | 994,394,112 B |
| Loom candidate | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false --extendedDiagnostics -p tsconfig.json` | 0 | 201,306 | 1,880,723 | 966,138K | 6.52s | 7.41s | 1,059,569,664 B |
| Web baseline | `pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false --extendedDiagnostics -p tsconfig.vitest.json` | 1; 19 fixture diagnostics (3 TS2322, 16 unused TS2578) | 339,515 | 1,323,033 | 1,255,341K | 6.69s | 7.72s | 1,273,069,568 B |
| Web candidate | `pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false --extendedDiagnostics -p tsconfig.vitest.json` | 0 | 353,099 | 2,551,096 | 1,141,976K | 9.84s | 10.85s | 1,526,628,352 B |

The baseline diagnostics showed that renderer and model values inferred as `unknown`, display unions failed compatibility, slot type assertions were unused, mixed surface/action members passed, and reserved action keys passed. The candidate type runs pass all positive and expected-error fixtures. `/usr/bin/time -l` supplied process time and peak RSS for all four runs. No requested metric was unavailable. Since the candidate also enables unknown-slot checking, do not treat the timing and instantiation changes as source-only performance effects.

| Gate | Command | Result |
|---|---|---|
| Loom unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 61 files, 431 tests, 0 skipped. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 14 files, 54 tests, 0 skipped. Existing DialogContent, NumberInput, and Vue Router warnings remain. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Loom cold types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false --pretty false -p tsconfig.json` | Exit 0. |
| Web types and route preparation | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated routes passed before Vue type checking. |
| Web cold types | `pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false --pretty false -p tsconfig.vitest.json` | Exit 0. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 46 files, 227 tests, 0 skipped. Existing esbuild/OXC and Vitest deprecation warnings remain. |
| Surface architecture | `pnpm test:surface-architecture` | Exit 0; 13 tests passed, 0 skipped, and surface checks passed. |
| Module tooling | `pnpm test:module-tooling` | Exit 0; 112 Node tests and 3 Python tests passed. |
| Workspace chain | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Exit 0. Type-check: 6 tasks successful, 5 cached. Tests: 12 tasks successful, all cached. Lint: 3 tasks successful, all cached. Build: 6 tasks successful, all cached. |
| Whitespace | `git diff --check` | Exit 0. |

The package, browser, behavior, architecture, tooling, and workspace gates passed after formatting. No server or external service was needed. Plan 067 remains TODO for parent review.

### Plan 067 resource-contract revision evidence

This follow-up replaces the resource return graph that retained `TDefinition` and whole declaration fragments. `BoundResource` now takes the resource key, permission map, selected custom actions, and projected operation members. Resource page contracts receive normalized table/form/detail bags and selected page props. Schema internals are absent from bound schema properties. Form resource fields retain selected keys and canonical renderer props; bound loaders, submits, operation-specific results, action routes, permission literals, and authored page props remain typed. `DefinedForm` stores the selected field renderer map and submit-presence flag instead of its full field literal. Type fixtures cover compact form/table/detail/filter schemas, required list/detail/update loaders and submits, distinct create/update results, page callback result types, action route names, and mixed valid/invalid field-entry and presentation-result unions.

The new cold candidate used the same Node `v26.9.0`, pnpm `12.1.0`, Vue checker `3.3.11`, TypeScript `6.0.2`, host process measurement, and disabled incremental reuse as the baseline. The candidate has `checkUnknownSlots` enabled; the baseline did not. The Web route contract was regenerated with `pnpm --filter @southneuhof/framework-web type-check` immediately before its measurement. This stricter configuration differs from baseline, so these values do not isolate the source type changes and support no performance claim. Full logs are in `implementation-evidence/plan-067-revision-candidate-{loom,web}.log`.

| Package and run | Exit | Types | Instantiations | Checker memory | Checker total | Process real | Peak RSS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Loom baseline | 1; expected fixture diagnostics | 197,864 | 876,741 | 851,991K | 4.65s | 5.54s | 994,394,112 B |
| Loom revised candidate | 0 | 168,191 | 824,051 | 826,449K | 4.63s | 5.53s | 965,427,200 B |
| Web baseline | 1; expected fixture diagnostics | 339,515 | 1,323,033 | 1,255,341K | 6.69s | 7.72s | 1,273,069,568 B |
| Web revised candidate | 0 | 314,831 | 1,285,284 | 1,227,825K | 6.47s | 7.42s | 1,100,070,912 B |

| Re-run gate | Exact command | Result |
|---|---|---|
| Loom cold types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false --pretty false -p tsconfig.json` | Exit 0. |
| Web cold types | `pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false --pretty false -p tsconfig.vitest.json` | Exit 0. |
| Loom package types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web package types and route generation | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated route checks passed. |
| Loom unit | `pnpm --filter @southneuhof/loom test` | Exit 0; 61 files, 431 passed, 0 skipped. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 14 files, 54 passed, 0 skipped. Existing Vue/router/component warnings remain. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 46 files, 227 passed, 0 skipped. Existing OXC/esbuild and Vitest deprecation warnings remain. |
| Surface architecture | `pnpm test:surface-architecture` | Exit 0; 13 Node tests passed, 0 skipped; checks passed. |
| Module tooling | `pnpm test:module-tooling` | Exit 0; 112 Node tests and 3 Python tests passed. |
| Workspace chain | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Exit 0; type-check 6/6 tasks (4 cached), tests 12/12 (8 cached), lint 3/3 (2 cached), build 6/6 (all cached). |
| Module preflight | `pnpm module:preflight` | Exit 0; API dependencies/configuration and Web configuration passed. |
| Web E2E | `pnpm --filter @southneuhof/framework-web test:e2e` | Exit 0; 10 tests passed. The configured E2E database was reset, migrated, cleared, and seeded by the test command. |
| Whitespace | `git diff --check` | Exit 0 after this evidence update. |

Plan 067 remains TODO for parent review.

### Plan 068 implementation evidence

The Hono adapter now parses the authored Collection query once per list call and encodes `sort_by` as wire `sort` and direction `sort` as wire `order`. Users, roles, permissions, and generated modules bind one query schema to the adapter. Resource tables use the adapter list loader directly. Their schemas keep their own sort keys and filters. Custom nested loaders keep their existing Table-owned query schemas.

The focused regressions were red before the adapter and generator changes:

| Check | Exact command | Result |
|---|---|---|
| Hono request regression | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web exec vitest run --environment jsdom --root src/ framework/hono/actions.spec.ts` | Exit 1 as expected; 3 of 6 tests failed because the adapter sent `sort_by` unchanged, did not run the schema transform, and dispatched a rejected sort key. |
| Generated contract regression | `node --test scripts/scaffold-bounded-module.test.mjs` | Exit 1 as expected; 21 of 22 tests passed. Generated resources did not bind their query schema to the Hono adapter. The old scaffold omitted this binding; it did not generate the settings modules' wrapper. |

Environment: Node `v26.9.0`, pnpm `12.1.0`. Before E2E, a local identity check confirmed that the configured `e2e` database and bucket differ from the development database and bucket. The E2E command reset and seeded only those configured E2E targets.

The loader query type is narrower because it now comes from the required module schema. For the cold Web type check, the baseline is the accepted Plan 067 candidate in `implementation-evidence/plan-067-revision-candidate-web.log`; the Plan 068 candidate log is `implementation-evidence/plan-068-web-cold-candidate.log`. Both runs used the same generated route preparation, Node `v26.9.0`, pnpm `12.1.0`, Vue checker `3.3.11`, TypeScript `6.0.2`, disabled incremental reuse, and `/usr/bin/time -l`. The package route check ran immediately before each measurement.

| Web run | Exit | Types | Instantiations | Checker memory | Checker total | Process real | Peak RSS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Plan 067 accepted baseline | 0 | 314,831 | 1,285,284 | 1,227,825K | 6.47s | 7.42s | 1,100,070,912 B |
| Plan 068 candidate | 0 | 315,499 | 1,293,055 | 1,247,174K | 6.42s | 7.04s | 1,078,591,488 B |

These results document the cold type boundary check. They do not support a performance claim because the source changed between the two plan candidates.

| Gate | Exact command | Result |
|---|---|---|
| Focused adapter and settings tests | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web exec vitest run --environment jsdom --root src/ framework/hono/actions.spec.ts 'routes/(authenticated)/settings/resource-list-query.spec.ts'` | Exit 0; 2 files, 10 tests passed, 0 skipped. |
| Generator | `node --test scripts/scaffold-bounded-module.test.mjs` | Exit 0; 23 tests passed, 0 skipped. The generated schema/action/resource fixture matches generator output and compiles in the Web type check. |
| Loom unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 61 files, 431 tests passed, 0 skipped. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 14 files, 54 tests passed, 0 skipped. Existing DialogContent, NumberInput, and Vue Router warnings remain. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated route checks passed before Vue type checking. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 46 files, 230 tests passed, 0 skipped. Existing OXC/esbuild and Vitest deprecation warnings remain. |
| Surface architecture | `pnpm test:surface-architecture` | Exit 0; 13 tests passed, 0 skipped, and surface checks passed. |
| Module tooling | `pnpm test:module-tooling` | Exit 0; 113 Node tests passed, 0 skipped, and 3 Python tests passed. |
| Module preflight | `pnpm module:preflight` | Exit 0; API dependencies/configuration and Web configuration passed. |
| Web E2E | `pnpm --filter @southneuhof/framework-web test:e2e` | Exit 0; 10 tests passed. The command reset, migrated, cleared, and seeded the separate E2E database and bucket. Existing `NO_COLOR` and icon-button accessibility warnings remain. |
| Workspace chain | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Exit 0. Type-check: 6 tasks successful, 5 cached. Tests: 12 tasks successful, all cached. Lint: 3 tasks successful, all cached. Build: 6 tasks successful, all cached. |
| Whitespace | `git diff --check` | Exit 0 after the evidence update. |

### Plan 068 review follow-up

The SDK's actual list request type in `packages/sdk/src/client.ts` defines page, limit, search, sort, and order as strings, then intersects them with `Record<string, string | undefined>` for dynamic equality filters. The Web type fixture inspects `rpc.users.list.$get` and confirms this open key map and its string values. This contract cannot list every valid filter name. The adapter guard now checks encoded value types against the open map. It still checks both encoded keys and values when an endpoint declares a finite key set. The query schema keeps each loader's allowed sorts and filters strict. The same fixture rejects a string value against a numeric index signature, which covers the former bypass. Module consumer fixtures reject sort and filter values outside each query schema.

| Check | Exact command | Result |
|---|---|---|
| First Web types attempt | `pnpm --filter @southneuhof/framework-web type-check` | Exit 1 with 3 TS2322 diagnostics. The runtime invalid-route tests also needed to bind their known route/schema types after the query guard stopped accepting a missing route type. The tests now provide those type parameters and keep only the invalid runtime route cast. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated route checks passed. The actual open query map, its value type, exact endpoint checks, and expected-error fixtures compile. |
| Focused adapter and settings tests | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web exec vitest run --environment jsdom --root src/ framework/hono/actions.spec.ts 'routes/(authenticated)/settings/resource-list-query.spec.ts'` | Exit 0; 2 files, 10 tests passed, 0 skipped. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 46 files, 230 tests passed, 0 skipped. Existing OXC/esbuild and Vitest deprecation warnings remain. |
| First lint attempt | `pnpm lint` | Exit 1 because Oxfmt found formatting changes in `contracts.type-test.ts`; Oxlint reported 19 warnings and no errors. |
| Format changed type fixture | `pnpm --filter @southneuhof/framework-web exec oxfmt src/framework/hono/actions.spec.ts src/framework/hono/__type-tests__/contracts.type-test.ts` | Exit 0; formatted the two changed test files only. |
| Lint | `pnpm lint` | Exit 0; 3 tasks successful, 2 cached. |
| E2E | Not rerun. | Earlier Plan 068 E2E evidence remains applicable because this follow-up changes only type checks and a redundant test assertion. |
| Whitespace | `git diff --check` | Exit 0 after this follow-up. |

Plan 068 remains TODO for parent review.

### Plan 069 implementation candidate evidence

Environment: Node `v26.9.0`, pnpm `12.1.0`. Plans 062–069 are accepted. The machine-readable coverage ledger records each finding and decision, its current production owner, an executed regression fixture, the exact command, and its result in `implementation-evidence/coverage.json`.

#### Finding coverage

Each fixture below ran in the named gate. Commands and full counts are listed in the verification table. F01–F19 and F22–F24, F26–F27 use the accepted plan's actual owner test as their current regression fixture; the commands here rerun those fixtures against the coordinated candidate. F20, F21 and F25 include the Plan 069 test and workflow/guidance work.

| Finding | Production owner | Executed regression fixture | Gate/result |
|---|---|---|---|
| F01 | `useFormSession.ts`, `Form.vue` | `form.spec.ts` — detached exposed draft; `useFormSession.spec.ts` — derived values and reset clear survive late refresh | U: exit 0; 61 files, 438 passed, 0 skipped |
| F02 | `Form.vue`, `NumberInput.vue` | `form.spec.ts` — local text errors block validation; invalid optional number text cannot submit | U: exit 0; 61 files, 438 passed, 0 skipped |
| F03 | `useFormSession.ts`, `Form.vue`, `DialogForm.vue` | `form.spec.ts` — late fulfill/reject stays with its original session; `DialogForm.managed.spec.ts` — late save cannot change reopened session | U: exit 0; 61 files, 438 passed, 0 skipped |
| F04 | `Form.vue` | `SurfaceParity.browser.spec.ts` — Save supersedes deferred blur validation and dispatches once | B: exit 0; 14 files, 55 passed, 0 skipped |
| F05 | `DialogForm.vue` | `SurfaceParity.browser.spec.ts` — forwards current prop presence and native attributes | B: exit 0; 14 files, 55 passed, 0 skipped |
| F06 | `ListView.vue` | `ListView.browser.spec.ts` — query ownership survives namespace and controlled-mode changes; `QueryOwnershipFixture.vue` — browser back restores state and keeps unrelated query parameters | B and W: exit 0; 14/55 and 46/230; no skips |
| F07 | `renderers/form.ts`, `SelectInput.vue` | `SelectForm.browser.spec.ts` — real numeric SelectInput standalone, in Form, and in DialogForm; `form-contracts.type-test.ts` — missing renderer rejected; `defineForm.spec.ts` — missing renderer rejected for JavaScript definitions | U, B and LT: exit 0; U 61/438, B 14/55, no skips; LT passed |
| F08 | `renderers/formContracts.ts`, `SelectInput.vue` | `form-contracts.type-test.ts` — accepts numeric choice and rejects string schema; `SelectForm.browser.spec.ts` — real numeric selection | LT and B: exit 0; LT passed; B 14/55, no skips |
| F09 | `Form.vue`, `renderers/form.ts` | `Form.browser.spec.ts` — real managed native input receives schema-required state and canonical props | B: exit 0; 14 files, 55 passed, 0 skipped |
| F10 | `bindResource.ts`, `operations.ts` | `boundResource.spec.ts` — null permission reaches access adapter and retains row policy | U: exit 0; 61 files, 438 passed, 0 skipped |
| F11 | `bindResource.ts`, `identity.ts` | `boundResource.spec.ts` — scalar/composite identity checks and detached snapshots | U: exit 0; 61 files, 438 passed, 0 skipped |
| F12 | `bindResource.ts`, `operations.ts` | `boundResource.spec.ts` — custom command context stays separate from default and record payloads; `resource-actions.type-test.ts` — `withContext` argument contract | U and LT: exit 0; U 61/438, no skips; LT passed |
| F13 | `bindResource.ts`, `runtime.ts` | `boundResource.spec.ts` — canonical list and Form View props; `bound-resource.type-test.ts` — complete page bags | U and LT: exit 0; U 61/438, no skips; LT passed |
| F14 | `FormView.vue` | `SurfaceParity.browser.spec.ts` — inherits nested Form labels and forwards full actions scope | B: exit 0; 14 files, 55 passed, 0 skipped |
| F15 | `TreeTable.vue`, `resolveDisplay.ts` | `DisplayParity.browser.spec.ts` — joined relation renderer runs on TreeTable and extracted surfaces | B: exit 0; 14 files, 55 passed, 0 skipped |
| F16 | `LookupInput.vue` | `LookupInput.browser.spec.ts` — late detail hydration preserves a new staged row and parent replacement | B: exit 0; 14 files, 55 passed, 0 skipped |
| F17 | `FileInput.vue`, `ImageInput.vue` | `FileInput.spec.ts` and `ImageInput.spec.ts` — disabled mutation handlers do not start work; accepted pending work follows its owner | U: exit 0; 61 files, 438 passed, 0 skipped |
| F18 | `bindResource.ts`, `defineResource.ts` | `boundResource.spec.ts` — checks mutation result identity and does not retry post-write failures; `resource-actions.type-test.ts` — rejects invalid result identity unions | U and LT: exit 0; U 61/438, no skips; LT passed |
| F19 | `formContracts.ts`, `Form.vue`, `DialogForm.vue`, `FormView.vue` | `plan067-form-contracts.type-test.vue` — field-keyed value/setter slots and rejected unknown keys; `surface-definitions.type-test.ts` — deeply readonly draft snapshot | LT: exit 0 |
| F20 | Loom component tests, type fixtures, and `check-surface-architecture.test.mjs` | `SelectForm.browser.spec.ts` uses real controls; `DisplayParity.browser.spec.ts` uses a TreeTable renderer; `AssetParity.browser.spec.ts` uses real direct/managed inputs and previews across two apps; runtime export and negative type-import fixtures check the public surface; `defineForm.spec.ts` checks content without insertion-order dependence | U, B, LT and A: exit 0; U 61/438, B 14/55, A 17 tests; all 0 skipped |
| F21 | `.github/workflows/web-validation.yml`, `web-validation-workflow.test.mjs` | Structural test checks push/PR path triggers and explicit Loom, Web, tooling, browser, and type-check commands | C and T: exit 0; C 2 tests, T 119 Node and 3 Python; no skips. Hosted CI was not run. |
| F22 | Loom contract and resource type definitions | `surface-definitions.type-test.ts` and `bound-resource.type-test.ts` — compact declarations preserve model, operation, action, result and page refinements | LT and WT: exit 0; both passed |
| F23 | Web Hono `actions.ts`, `collectionQuery.ts` | `actions.spec.ts` — validates and encodes one canonical query while preserving the endpoint protocol; parses direct loader query once | W: exit 0; 46 files, 230 passed, 0 skipped |
| F24 | `identity.ts`, `operations.ts`, resource exports | `public-api.spec.ts` — legacy runtime exports and paths are absent; `check-surface-architecture.test.mjs` rejects removed resource factories and allows unrelated list methods | U and A: exit 0; U 61/438, A 17 tests; no skips |
| F25 | Root/package docs, module skills, scaffold and UI checker | `scaffold-bounded-module.test.mjs` — checked-in Web type fixture matches generator output; `verify-module.test.mjs` checks active guidance evidence; architecture test checks generated output and current docs | T, G, WT and A: exit 0; T 119 Node + 3 Python, G 23, A 17; no skips; WT passed |
| F26 | `DialogForm.vue` | `SurfaceParity.browser.spec.ts` — deferred close approval does not close a reopened or submitting session | B: exit 0; 14 files, 55 passed, 0 skipped |
| F27 | `assets/provider.ts`, `FileInput.vue`, `ImageInput.vue` | `provider.spec.ts` — canonical reads preserve adapter `null`; `FileInput.spec.ts` — submitted asset remains canonical | U: exit 0; 61 files, 438 passed, 0 skipped |

#### Accepted decision coverage

| Decision | Executed evidence |
|---|---|
| D01 — Explicit supported native attributes | `Form.browser.spec.ts` checks real native attributes and schema requiredness; `form-contracts.type-test.ts` compares direct and managed prop types and rejects unsupported props. B and LT pass. |
| D02 — One app-level asset service | `AssetParity.browser.spec.ts` runs direct FileInput/ImageInput, managed Form, and previews with one registration; a second test checks two app instances stay isolated. B passes. |
| D03 — Explicit renderers and component-owned models | `SelectForm.browser.spec.ts` and `form-contracts.type-test.ts` cover the real numeric select model. B and LT pass. |
| D04 — Canonical loader props; remove field source/prop adapters | Syntax-aware tests follow aliases/spreads and reject field sources; `SelectForm.browser.spec.ts` exercises component props. A and B pass. |
| D05 — Actual component models and no Form conversion | `Form.browser.spec.ts` submits only valid/unset numeric text; `SurfaceParity.browser.spec.ts` sends DateInput string model to schema unchanged. B and U pass. |
| D06 — Submit behavior and wrapper prop shapes | `defineForm.spec.ts`, `SurfaceParity.browser.spec.ts`, and `flat-form-components.type-test.vue` cover configuration, labels/actions, and flat Form/DialogForm props. U, B and LT pass. |
| D07 — Shared display fragments | `DisplayParity.browser.spec.ts` checks joined roles, status, date and asset rendering; `export.spec.ts` checks the joined relation formatter. B and U pass. |
| D08 — Existing schema, asset, and transport boundaries | `compileSchema.spec.ts`, `AssetParity.browser.spec.ts`, and Hono `actions.spec.ts` check transform/default discovery, app assets, and wire encoding. U, B and W pass. No backend contract changed. |
| D09 — No executable legacy path or stale active example | `check-surface-architecture.test.mjs`, `public-api.spec.ts`, and `verify-module.test.mjs` cover syntax-aware source/generator checks, removed exports, and current authoring guidance. A, U and T pass. |

#### Residual boundary regressions

These are validation obligations from Plan 069, not new audit findings. Each named fixture uses the real production owner and ran in the listed final package gate.

| Boundary | Production owner and regression fixture | Command/result |
|---|---|---|
| Zod discovery | `compileSchema.ts`; `compileSchema.spec.ts` checks finite input keys for installed Zod v3/v4 and confirms metadata inspection does not execute defaults/transforms before parsing. | U: exit 0; 61 files, 438 passed, 0 skipped. |
| Derived/reset ownership | `useFormSession.ts`; `useFormSession.spec.ts` checks derived values from current draft and that resetWhen clear survives a late refresh. | U: exit 0; 61 files, 438 passed, 0 skipped. |
| Date model | `DateInput.vue`; `date-input-model.type-test.ts` rejects a `z.date()` schema model for the string-emitting DateInput and accepts the transformed string schema. `SurfaceParity.browser.spec.ts` checks the real browser control sends the string model without Form conversion. | LT and B: exit 0; LT passed, B 14 files/55 passed/0 skipped. |
| Location cancellation | `LocationInput.vue`; `LocationInput.spec.ts` checks live map configuration failure, aborts stale autocomplete, ignores stale autocomplete error and geolocation after selection, and ignores geolocation after unmount. | U: exit 0; 61 files, 438 passed, 0 skipped. |
| Export termination | `services/export.ts`; `export.spec.ts` runs the page safety limit and asserts an incomplete-export error and no workbook result. | U: exit 0; 61 files, 438 passed, 0 skipped. |
| App asset isolation | `assets/provider.ts`; `AssetParity.browser.spec.ts` uploads different files through two real FileInputs and checks each app uses its own adapter and preview. | B: exit 0; 14 files, 55 passed, 0 skipped. |

The following local mutation checks remove one production guard at a time. Each focused regression failed as expected; the candidate implementation was restored before final gates.

| Temporary removal | Exact command | Observed result |
|---|---|---|
| Export page-cap error, changed to return collected rows | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/services/__tests__/export.spec.ts -t 'reports an incomplete export when paging reaches the safety limit'` | Exit 1 as expected; the regression failed because no incomplete-export error was thrown. |
| `edited.add(key)` in `resetBehaviorValue` | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/forms/__tests__/useFormSession.spec.ts -t 'keeps a reset dependent value clear when a late refresh resolves'` | Exit 1 as expected; the stale late value `north-approver-late` replaced the reset clear. The fixture asserts the initial load and deferred refresh both ran. |
| Geolocation generation guard after a prediction was selected | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/composites/__tests__/LocationInput.spec.ts -t 'ignores a geolocation result after the user selects a prediction'` | Exit 1 as expected; the stale coordinates replaced the pending prediction. |
| Geolocation generation guard after unmount | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/components/composites/__tests__/LocationInput.spec.ts -t 'ignores a geolocation result after unmount'` | Exit 1 as expected; the stale callback read the latitude and longitude after disposal. The test now observes those reads directly. |

The final candidate versions of the reset and both LocationInput focused tests pass. The complete unit gate also reran after the fixture changes.

#### Commands and environment results

| Gate | Exact command | Result |
|---|---|---|
| Loom unit | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom test` | Exit 0; 61 files, 438 passed, 0 skipped. |
| Public API boundary | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/loom exec vitest run src/__tests__/public-api.spec.ts` | Exit 0; 1 file, 4 tests passed, 0 skipped. |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; 14 files, 55 passed, 0 skipped. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract and generated route checks passed before Vue type checking. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0; 46 files, 230 passed, 0 skipped. |
| Surface architecture | `pnpm test:surface-architecture` | Exit 0; 17 tests passed, 0 skipped; surface checks passed. This scans active root and package docs and syntax-checks executable legacy surfaces and generator output. |
| Module tooling | `pnpm test:module-tooling` | Exit 0; 119 Node tests passed, 0 skipped; 3 Python tests passed. |
| Generator fixture | `node --test scripts/scaffold-bounded-module.test.mjs` | Exit 0; 23 tests passed, 0 skipped; generated output matches the checked-in Web type fixture, which passes WT. |
| Workflow fixture | `node --test scripts/web-validation-workflow.test.mjs` | Exit 0; 2 tests passed, 0 skipped. Hosted CI was not run. |
| Workspace types | `pnpm type-check` | Exit 0; 6 Turbo tasks successful, 4 cached. |
| Affected task graph | `pnpm exec turbo run lint type-check --affected --dry=json` | Exit 0; 12 selected tasks: lint and type-check for API, Web, Loom, SDK, Sprindle, and utilities. Turbo's affected package set was workspace root, Web, Loom, and utilities; the other package tasks were in the dependency graph. This was a local dry run, not hosted CI. |
| Workspace tests | `NODE_OPTIONS=--no-experimental-webstorage pnpm test` | Exit 0; root surface check passed; 12 Turbo tasks successful, 8 cached. Package-level counts are reported above. |
| Lint | `pnpm lint` | Exit 0; 3 Turbo tasks successful, 2 cached. |
| Build | `pnpm build` | Exit 0; 6 Turbo tasks successful, all 6 cached (`FULL TURBO`). No uncached build job ran, so this is not evidence of a fresh build. |
| Module preflight | `pnpm module:preflight` | Exit 0; API dependencies/configuration and Web configuration passed. |
| E2E | `pnpm --filter @southneuhof/framework-web test:e2e` | Exit 0; 10 passed, 0 skipped. Before reset and seed, `CARTA_DATABASE_PURPOSE=e2e` and the `carta_e2e` database differed from development `carta`; the reset script checks the configured name and marker. The E2E `carta-e2e` bucket differed from development `carta`; both use the same endpoint, and the clear script checks the configured bucket. The run reset, migrated, cleared, and seeded only those isolated E2E targets. |
| Whitespace | `git diff --check` | Exit 0. |

The Loom browser run reports existing DialogContent description, NumberInput placeholder/prefix, and Vue Router `onBeforeRouteLeave` warnings. Web Vitest reports the existing esbuild/oxc option conflict (oxc wins) and deprecated `test.poolOptions`. Turbo reports its existing missing-output configuration warnings for Loom type-check/build tasks. No required Plan 069 gate remained failed. Plan 067 cold measurements remain in the earlier evidence section; the stricter checker configuration differed from baseline, so no source-only performance claim is made. The pre-existing resource-runtime multi-app/SSR limitation stays outside this work. Asset adapter isolation is tested across two mounted Vue apps.

One direct browser run overlapped Loom unit, Web unit, and both package type checks. It exited 1 with 54 of 55 browser tests passing; the Save/blur case timed out while waiting for the lazy input to mount. The same browser command then ran by itself and exited 0 with all 55 tests passing. The final workspace command chain also passed after that rerun.

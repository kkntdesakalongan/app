# Carta frontend implementation plans

Source baseline: `223fc622d9a897014fcbad48df838a19cec398db` — `resource_system_overhaul initial commit`. Live review: `b57c6f8` (2026-09-24). Status: **planned, not implemented**.

Execute 062–069 in order. Each Markdown plan contains its intent, current-source excerpts, target, scope, ordered work, tests, commands, completion criteria, and stop conditions. All 27 original findings and the approved architecture changes are assigned below.

This bundle is already in the live checkout. Keep its execution status and evidence in this directory; preserve the historical root `plans/README.md`. The original index is retained in `implementation-evidence/repository-plan-index.txt`. Plans 059–061 do not exist in this checkout; no implementation depends on them. Repository plans 051–058 are historical execution records, not acceptance of this repair.

Production source is unchanged since `223fc622d9a897014fcbad48df838a19cec398db`; the later commit added this plan bundle, and the user updated `ARCHITECTURE.md` during live review. All cited production source locations still exist. Node is `v26.9.0` and pnpm is `12.1.0`. Live checks passed: Loom unit (371 tests), Loom browser (34), web unit (230), surface architecture (11), module tooling (110 Node and 3 Python), and cold Loom/web `vue-tsc --noEmit --incremental false`. Web unit tests need `NODE_OPTIONS=--no-experimental-webstorage` on this Node 26 checkout. CI uses Node 20.19.0, so its commands do not need that local flag. These passes establish the current baseline; they do not verify the proposed repairs.

Follow the current `AGENTS.md`: write no implementation comments and add no tautological tests. Read `DESIGN.md` before changing an `apps/web` page. Use the local index and each plan's done criteria for review.

The updated [architecture](../../ARCHITECTURE.md) is the contract for these plans. It requires explicit renderers, component loader props, one app-level asset service, and removal of field `source` and `FrameworkPlugin.inputProps`. Read it before implementation; it supersedes the source baseline's API.

## Execution order and status

| Plan | Required outcome | Priority | Effort | Dependencies | Status |
|---|---|---|---|---|---|
| [062](062-track-form-edits-and-async-ownership.md) | Make edits, validation, and completion belong to one form session | P1 | L | none | TODO |
| [063](063-provide-one-global-asset-service.md) | Configure asset input and preview behavior once per application | P2 | L | 062 session ownership | TODO |
| [064](064-use-canonical-component-contracts.md) | Make form inputs use component props and Vue models without translation | P1 | L | 062 tracked session and 063 global asset service | TODO |
| [065](065-bind-safe-operations-and-complete-view-props.md) | Bind immutable operation identities and forward complete View contracts | P1 | L | 062, 064 | TODO |
| [066](066-preserve-wrapper-query-and-display-parity.md) | Make wrappers preserve live props, queries, selection, and rendering | P2 | L | 062, 064, 065 | TODO |
| [067](067-narrow-types-and-close-union-escapes.md) | Enforce whole-contract type checks and export compact definitions | P2 | L | 064, 065, 066 | TODO |
| [068](068-centralize-frontend-transport-query-encoding.md) | Put collection wire encoding in the existing Hono adapter | P3 | M | 064, 065, 066, 067 | TODO |
| [069](069-prove-contracts-and-remove-stale-guidance.md) | Make tests, CI, generators, and agent guidance prove the same architecture | P2 | L | 062–068 | TODO |

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

## Considered and excluded

Do not add compatibility paths, a generic frontend conversion layer, a new workflow engine, arbitrary prop extras, per-field asset setup, or backend changes to satisfy a UI abstraction. Keep legitimate component internals, explicit read/format/schema behavior, app asset services and transport encoding. Runtime shape guards and static types serve different callers; their coexistence is not itself duplicated authority. Small files with a real shared owner are not defects by size.

The prior F07 enum-converter prescription and generic F27 hydration repair are not implementation instructions. The exact current outcomes are in plans 064 and 063. Old source evidence is retained solely to identify the original problems.

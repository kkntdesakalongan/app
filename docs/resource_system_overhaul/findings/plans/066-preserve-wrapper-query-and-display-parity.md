# Plan 066: Make wrappers preserve live props, queries, selection, and rendering

## Status

- Status: TODO
- Priority: P2
- Effort: L
- Fix risk: MEDIUM
- Category: correctness, architecture, types, verification
- Planned against: `223fc622d9a897014fcbad48df838a19cec398db` (2026-09-24); the supplied ZIP has no `.git` metadata.
- Depends on: 062, 064, 065; one session, canonical component props, and shared View contracts must exist
- Findings owned: F05, F06, F14, F15, F16, F26

**Execution:** Work on the supplied branch; source paths are repository-relative. Do not commit, push, upgrade dependencies, change backend contracts, or alter unrelated work. Record commands and exit codes in `plans/README.md`. Expected-red regression tests are preparation, not completion. Missing dependencies or services are BLOCKED, never a passing result.

**Architecture:** Components own their public props, model values, events, and explicitly supported native attributes. Form derives requiredness from its schema, owns one tracked session, and forwards canonical component configuration. Authored inputs name their renderer. Inputs receive loaders in component props; no field `source`, inferred choice synthesis, prop-normalizer, or form-only model conversion exists in the completed architecture. App-level asset services are configured once and used by inputs and previews alike. `defineForm` preserves optional `submit`; a later explicit `:submit` replaces it. Form/DialogForm props are flat; page views contain nested primitive bags. Shared labels, input fragments, and read-only display fragments remain ordinary data. Changes are frontend-only; existing transport adapters remain the explicit API boundary.

## Intent

Changing presentation must not change component semantics. DialogForm forwards current Form props, ListView preserves the controlled-query round trip, FormView preserves form labels and slots, and TreeTable uses the same display renderer. Deferred lookup and close work cannot overwrite a newer user decision.

## Current state and evidence

| Finding | Baseline defect and evidence |
|---|---|
| F05 | `DialogForm.vue:40–99` fixes initial vnode prop presence. An isolated setup probe added disabled/context after mount and neither reached its Form bindings. |
| F06 | `ListView.vue:112–147` copies query and has no update:query emit. A parent replacement stayed stale; `Table.vue:73–82` also manually emits around methods whose Collection emits, so round-trip tests must inspect duplicate events and exposed ref shape. |
| F14 | `FormView.vue:14–36,122–147` owns competing submit labels and a form-actions slot instead of preserving its nested form. |
| F15 | `TreeTable.vue:158–169` interpolates the tree-cell value. The existing parity fixture chooses a text-only tree column, missing the renderer bypass. |
| F16 | `LookupInput.vue:165–211,234–263` checks the load request but not staged user edits. Deferred hydration of A replaced newer staged B in the setup probe. |
| F26 | `DialogForm.vue:111–132` checks busy state only before beforeClose. A deferred approval closed an already-submitting session in the probe. |

Use the existing DialogForm, ListView, LookupInput, TreeTable, and SurfaceParity browser suites as structure. Retain the current design tokens and managed layouts; no visual redesign is needed.

`packages/loom/src/components/composites/DialogForm.vue:40–57`

```ts
const vnodeProps = instance?.vnode.props ?? {}
const attrs = useAttrs()
const slots = useSlots()
const form = ref<FormHandle | null>(null)
const localOpen = ref(false)
const checkingClose = ref(false)
const hasOpenModel = Object.hasOwn(vnodeProps, 'open')
const hasDraftModel = Object.hasOwn(vnodeProps, 'modelValue') || Object.hasOwn(vnodeProps, 'model-value')
const { submitLabel: defaultSubmitLabel } = useFrameworkUiDefaults()

const nativeFormAttrs = computed<Record<string, unknown>>(() => Object.fromEntries(
  Object.entries(attrs).filter(([key]) => key === 'name' || key === 'autocomplete' || key.startsWith('aria-') || key.startsWith('data-')),
))

function hasProp(name: string): boolean {
  const kebab = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
  return Object.hasOwn(vnodeProps, name) || Object.hasOwn(vnodeProps, kebab)
}
```

`packages/loom/src/components/composites/DialogForm.vue:111–132`

```ts
const cancelDisabled = computed(() => props.disabled === true || submitting.value || validating.value || checkingClose.value)
const submitDisabled = computed(() => props.disabled === true || submitting.value || validating.value || inputPending.value)

async function requestClose(reason: DialogFormCloseReason): Promise<boolean> {
  if (submitting.value || validating.value || checkingClose.value) return false
  checkingClose.value = true
  try {
    const context: DialogFormCloseContext = {
      reason,
      dirty: dirty.value,
      submitting: submitting.value,
      validating: validating.value,
    }
    const approved = props.beforeClose ? await props.beforeClose(context) : true
    if (!approved) return false
    open.value = false
    return true
  } catch {
    return false
  } finally {
    checkingClose.value = false
  }
```

`packages/loom/src/components/views/ListView.vue:118–140`

```ts
const hasControlledQuery = Object.hasOwn(props.table, "query");
const tableRef = ref<{ refresh: () => Promise<void>; query: { value: QueryValues }; updateQuery: (patch: QueryValues) => void; replaceQuery: (values: QueryValues) => void }>();
const currentQuery = ref<QueryValues>({ page: 1, ...(props.filters?.defaults ?? {}), ...(props.table.query as QueryValues | undefined) });
const filterDraftState = ref<Partial<TFilterInput>>({ ...(props.filters?.defaults ?? {}), ...filterValues(currentQuery.value) });
const filterDraft = computed(() => filterDraftState.value);
const filterFormRef = ref<{ validate: () => Promise<SchemaParseResult<Partial<TQuery>>>; reset: () => void }>();
let filterValidation = 0;
let lastFilterOutputKeys = new Set<string>();

const tableBindings = computed(() => {
  const base = { ...surface.value.table };
  if (hasControlledQuery) base.query = currentQuery.value as TQuery;
  return base;
});

function applyQuery(patch: QueryValues) {
  tableRef.value?.updateQuery(patch);
}

function onTableQuery(values: QueryValues) {
  filterValidation += 1;
  currentQuery.value = values;
}
```

`packages/loom/src/components/core/TreeTable.vue:158–169`

```ts
    <template v-for="name in forwardedSlotNames" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="forwardedSlotProps(slotProps)" />
    </template>

    <template #[treeSlotName]="cell">
      <span class="is-tree-table-cell inline-flex min-w-0 items-stretch">
        <span
          class="is-tree-table-label min-w-0 truncate"
          :style="{ paddingInlineStart: `${metadataFor(cell.record).depth * treeIndentationRem}rem` }"
        >
          <slot name="tree-cell" v-bind="treeCellScope(cell)">{{ cell.value ?? '-' }}</slot>
        </span>
```

Evidence is source inspection plus the earlier isolated probes stated above, not a claim that pinned Vue/browser tests passed. The probe harness used explicit test doubles. Establish real regressions before implementation. Use Vitest `describe/it/expect` and deferred promises as in the cited existing tests; keep schemas, compiler, session, and the component under test real.

## Scope

Modify these owners, their callers reached through the named contract, and their focused tests:

- `packages/loom/src/components/composites/DialogForm.vue`
- `packages/loom/src/forms/props.ts and contracts/{forms,views}.ts`
- `packages/loom/src/components/views/{FormView.vue,FormView.types.ts,ListView.vue,DetailView.vue}`
- `packages/loom/src/components/core/{Table,TableContent,TreeTable,Collection}.vue and query/useNamespacedQuery.ts: query ownership and forwarding only`
- `packages/loom/src/components/composites/form-inputs/{LookupInput.vue,lookupInput.types.ts,TableInput.vue,tableInput.types.ts}`
- `packages/loom/src/display/{DisplayValue.vue,resolveDisplay.ts}`
- `packages/loom/src/components/{core,views,composites}/__tests__/** and __type-tests__/**`
- `packages/loom/vitest.browser.config.ts`
- `apps/web/src/framework/acceptance/QueryOwnershipFixture.* and router/query/route regression fixtures`
- `docs/ui/{forms,collections}.md and docs/resource_system_overhaul/ARCHITECTURE.md`

Out of scope: Renderer prop conversion, new collection/query abstractions, backend pagination, arbitrary modal content replacing the managed Form, and a generic async state machine. Use local generation checks at each existing owner.

## Preparation and commands

```sh
git status --short
git diff --stat 223fc622d9a897014fcbad48df838a19cec398db..HEAD -- packages/loom/src apps/web/src scripts .agents/skills docs .github/workflows
```

Compare these excerpts with live code. Changes made by declared prerequisite plans are expected; verify their stated end contracts. Report unexplained drift before editing. Do not discard unrelated working-tree changes. In a snapshot without Git, compare source content and record that limitation.

Use installed package-local tools pinned by `package.json` and the lockfile. Record the actual Node/pnpm versions. These commands are verification requirements, not previously observed passes:

| Gate | Command | Required result |
|---|---|---|
| Unit | `pnpm --filter @southneuhof/loom test` | Exit 0; scoped regressions run. |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; new files registered in the explicit include list. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0 with strict Vue fixtures. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 without boundary suppressions. |
| Web behavior | `pnpm --filter @southneuhof/framework-web test` | Exit 0. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; no acceptance allowlist for removed executable paths. |
| Tooling | `pnpm test:module-tooling` | Exit 0 when callers, generators, docs fixtures, or checkers change. |
| Final workspace | `pnpm type-check && pnpm test && pnpm lint && pnpm build` | Exit 0 after the coordinated implementation. |

## Steps

### 1. Turn the observed races and forwarding losses into mounted tests

Create direct-versus-wrapper hosts with reactive prop bags. Add/remove props after mount rather than only mutating initially present values. Use deferred beforeClose and lookup promises. Attach a real renderer to the TreeTable indentation column. Count events, loads, and writes so duplicated forwarding is observable.

**Verify:** Browser and Unit gates; the baseline regression cases fail for the reported behavior, not missing fixtures/dependencies.

### 2. Forward the live Form contract through DialogForm

Use the authoritative Form runtime declarations and public types for the wrapper; remove its handwritten per-prop reconstruction. Forward the current declared Form subset on every component update. Track actual current model-prop presence explicitly through component lifecycle updates, not an initial vnode snapshot or a computed depending only on non-reactive vnode/attrs objects. Addition/removal of `modelValue`, load, initialData, context, and disabled must take effect. Do not forward an absent model as `modelValue: undefined`.

Preserve Form's canonical supported native attributes and intended target from the component contracts. Set inheritAttrs:false and forward attributes deliberately. Keep class/style on the dialog presentation wrapper and input/form accessibility attributes at the matching native element. Forward every Form event once, preserve all slot payloads, and expose the same read-only state and methods. DialogForm adds only its visibility/lifecycle members.

```vue
<Form v-bind="editor" />
<DialogForm v-bind="editor" v-model:open="open" title="Edit" />
<DialogForm v-bind="editor" :submit="replacementSubmit" />
```

The override replaces only the effective function, never combines mutation handlers. A submit-free Form still requires a present controlled draft; the open model cannot satisfy that rule.

**Verify:** Browser, both type gates and Unit. Iterate actual Form prop declarations and compare direct/wrapped values and presence; test false/undefined and removed props. No session is allocated by the wrapper.

### 3. Make closing session-bound and restore FormView composition

Capture dialog generation and managed Form identity when requestClose begins. After awaiting beforeClose, recheck generation, current openness, submitting/submit-validation state, and close ownership. Ignore stale approvals/rejections after parent close/reopen or disposal. Disable conflicting default Save/Cancel actions while a close decision is pending; imperative submit that begins anyway prevents the pending close from succeeding. A parent explicitly setting open=false remains authoritative. Successful submission auto-closes only its own active session and bypasses the cancel guard.

FormView reads submitLabel/submittingLabel from `form` and forwards the standard `actions` slot with unchanged Form context. Its default presentation adds page navigation controls; it does not invent another action-label source or slot name. Remove outer label aliases and `form-actions`. Preserve afterSubmit, default navigation, back navigation, success policy, dirty-page guards, and post-submit error handling at the page owner. DetailView likewise forwards its primitive slots/events without reloading.

**Verify:** Browser and Web behavior; inherited labels/slots match direct forms, late close approvals cannot close new/busy sessions, and success produces one page effect without duplicate writes.

### 4. Give query values one authoritative owner

Controlled query values come from the parent `table.query`; forward them directly to Table/Collection and emit `update:query` exactly once on requested changes. Never mutate the parent's object. When uncontrolled, Collection's namespaced query owns values and URL synchronization. ListView reads that query through Table's existing exposed/slot contract and invokes updateQuery/replaceQuery for toolbar operations. Remove ListView's competing writable query copy.

Use a consistent exposed query value contract through Collection and Table; Vue component refs unwrap exposed refs, so do not assume an extra `.value` where the public component exposes a value. Remove Table's manual duplicate emit after calling an emitting Collection method. Preserve current prop presence when changing between controlled/uncontrolled hosts; changing namespace creates the corresponding isolated ownership state instead of keeping an initial mode snapshot.

```vue
<ListView
  :table="{ ...users.list.table, query }"
  @update:query="query = $event"
/>
```

Filter input remains a normal controlled submit-free Form. Synchronize its displayed draft after authoritative query replacements and browser-back navigation. Cancel stale filter validation on those replacements. Commit only successful current output to filter-owned query keys, remove cleared keys, and reset pagination once. Parent updates must not echo into another load/event loop. Keep custom collection slots, export inputs, sorting, and page controls on that same query owner.

**Verify:** Browser, Web behavior and type gates. Parent replacement, browser-back, search, sort, page, clear/reset, mode presence changes, and two namespaces each produce the expected query and one load/update event. Invalid/stale filters produce none.

### 5. Preserve shared display behavior in the tree column

Render the default tree cell through DisplayValue inside the indentation/expand wrapper. Keep the original record, accessor, renderer, props, and formatting contract intact; do not read/format the already-resolved value a second time. Explicit cell slots remain intentional rendering overrides. Default cells in Table, TreeTable, and Detail share one display implementation.

Test shared joined-role captions, status chips, date formats, and an asset renderer configured by the global service. Place the renderer on the tree column itself. Exports use the shared accessor/format and explicit text map, not Vue rendering. Changing display configuration cannot mutate loader records or change form values.

**Verify:** Browser, Unit and Web behavior; equivalent displays match, no per-cell network calls are introduced, and export text remains correct.

### 6. Protect lookup staging and retain composite ownership

Track committed-value hydration and user staging with separate generations. A response may enrich an unchanged committed identity but cannot replace a staged selection edited since the request started. Stage edits, parent replacements, clearing, closing/reopening, and disposal obsolete the relevant work. Prop loaders remain explicit component-native load/loadDetail; do not reintroduce field source or resource introspection.

TableInput retains independent table/form definitions and mandatory toDraft. Its row form is submit-free; TableInput owns insert/replace. Reject conflicting business submit/load/model bindings rather than silently executing them. Keep disabled mutations blocked, stable row identity, independent row sessions, and schema-parsed row outputs.

**Verify:** Browser, Unit and both type gates. Deferred A cannot overwrite chosen B; clearing remains cleared; cancel/reopen follows parent state. Row display/edit selections can differ without hidden projections.

### 7. Remove duplicate wrapper vocabulary and document the normal calls

Delete the fixed presence snapshots, alternate action slots/labels, competing query values, and tree-only display fallback. Update all wrapper and route callers. Document only the canonical flat Form/DialogForm props and nested page bags, with complete examples for controlled queries and direct extracted primitives.

**Verify:** Architecture, Tooling, all scoped type/behavior gates and `git diff --check`. No compatibility prop aliases or source-string tests preserve a removed path.

## Test plan

Extend DialogForm.spec/managed, SurfaceParity.browser, ListView.browser/views/resource-cache, TreeTable and DisplayParity.browser, LookupInput and TableInput suites. Include native attribute changes after mount, all Form props added/removed, default/overridden submit, page navigation generation, two query namespaces, accessor+renderer on treeColumn, and lookup staging with parent replacement. Use timers only when the product contract is timed; use deferred promises and actual clicks for ordering.

## Done criteria

- [ ] Form/DialogForm parity includes changing prop presence, native targeting, events, slots, methods, and models.
- [ ] Stale close decisions cannot close a new or busy session; parent visibility remains authoritative.
- [ ] FormView preserves nested labels and the actions slot with no aliases.
- [ ] ListView/Table/Collection preserve a single controlled/uncontrolled query owner and one update event.
- [ ] TreeTable tree cells use the shared display implementation.
- [ ] Late lookup hydration never replaces newer staged edits; composite commits retain explicit ownership.
- [ ] Scoped unit/browser/type gates pass with exact executed commands, counts, skips, and exit status recorded.
- [ ] Only scoped owners, dependent callers, tests, current documentation, and plan status changed; review `git diff --check` and `git diff --stat`.
- [ ] No compatibility alias, fallback to a removed contract, public `any` facade, or type-suppression escape was added.

## STOP conditions

Stop if a wrapper requires a second form session or query owner to pass a test, an existing route requires an undocumented legacy alias, or the tree record context cannot be preserved without changing backend data. Resolve the owning public contract rather than making the wrapper special. Required real-browser focus, model, or render checks cannot be substituted with setup-script probes.

Do not improvise a new backend contract or suppress a required check. Report a repeated verification failure after two targeted repair attempts. A missing browser, dependency, database, or storage prerequisite blocks that gate rather than justifying a stubbed substitute.

## Maintenance

A wrapper adds presentation, not a dialect. New props/events/slots must flow from the primitive contract. Each async owner tracks only its own generation; do not centralize unrelated form, lookup, and modal transitions into a workflow engine.


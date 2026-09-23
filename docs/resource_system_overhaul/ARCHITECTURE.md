# Carta surface architecture

Implementation specification for Loom, Carta web integration, application consumers, generators, tests, and agent instructions. Source tree: `carta-main (1)(1).zip`.

Implement one coordinated breaking change. Completion requires the replaced implementation and its public paths to be absent. Preserve backend contracts, authorization, transport envelopes, unrelated features, and dependency versions.

## 1. Target contract

| Public API | Owns | Consumer |
|---|---|---|
| `defineForm` | Input schema, selected inputs, labels, validators, optional submit function. | `Form`, `DialogForm` |
| `defineTable` | Record schema, selected columns, labels. | `Table`, `TreeTable` |
| `defineDetail` | Record schema, selected detail entries, labels. | `Detail` |
| `DisplayField` | Reusable read-only accessor, renderer, renderer props, format, label override. | Table columns and detail entries |
| `defineResource` | Operation binding, identity, access, cache invalidation, page composition. | `ListView`, `FormView`, `DetailView`; extracted primitives |

Definitions are transparent, read-only configuration objects. Mounted primitives own mutable state. Resources contain no field-definition system. Vue object binding is the public composition mechanism; no conversion call is required.

### 1.1 Required consumption

```vue
<!-- createUserForm includes submit. No repeated submit prop is required. -->
<Form v-bind="createUserForm" />
<DialogForm v-bind="createUserForm" title="Create user" />

<!-- A later explicit prop replaces the definition's submit function. -->
<Form v-bind="createUserForm" :submit="createUserForAnotherWorkflow" />
<DialogForm
  v-bind="createUserForm"
  :submit="createUserForAnotherWorkflow"
  title="Create user"
/>

<!-- Standalone read-only surfaces. -->
<Table v-bind="usersTable" :data="rows" />
<Detail v-bind="userDetail" :data="record" />

<!-- Page composition and primitive extraction. -->
<ListView v-bind="users.list" />
<Table v-bind="users.list.table" />
<FormView v-bind="users.create" />
<Form v-bind="users.create.form" />
<DialogForm v-bind="users.create.form" title="Create user" />

<!-- Identity-bound pages and extracted primitives. -->
<DetailView v-bind="detailPage" />
<Detail v-bind="detailPage.detail" />
<FormView v-bind="updatePage" />
<DialogForm v-bind="updatePage.form" title="Edit user" />
```

```ts
const detailPage = computed(() => users.detail({ id: userId.value }))
const updatePage = computed(() => users.update({ id: userId.value }))
```

Place explicit prop overrides after `v-bind`. Vue binding order determines ordinary-prop precedence. `submit` is a function prop, not an event listener; replacement invokes only the effective handler. [R1]

### 1.2 Component boundaries

```ts
type DialogFormProps<I extends object, O extends object, R> =
  FormProps<I, O, R> & DialogPresentationProps

type FormViewProps<I extends object, O extends object, R> = {
  form: FormProps<I, O, R>
  title?: string
  description?: string
  backTo?: RouteLocationRaw
  defaultTo?: RouteLocationRaw | ((result: R) => RouteLocationRaw | undefined) | false
  afterSubmit?: (context: AfterSubmitContext<R>) => MaybePromise<void>
  successMessage?: string | false
}
```

`Form` and `DialogForm` consume flat Form props. DialogForm adds presentation and lifecycle without a nested `form` prop. `FormView.form`, `ListView.table`, and `DetailView.detail` are complete primitive prop bags. Page metadata stays outside them. No flat action-bag variants exist on views.

## 2. Definitions and reuse

### 2.1 Construction

Constructors provide contextual typing and context-free configuration checks. Their results retain meaningful configuration in enumerable properties. An equivalent valid plain object has identical runtime behavior: every primitive uses the same configuration compiler regardless of construction origin.

Constructors do not allocate sessions, resolve app injection, start loads, parse sample values, invoke defaults, or attach hidden field payloads. Snapshot framework-owned configuration containers; preserve schemas, components, functions, and external services by reference. Consumers never mutate shared definitions or fragments. Shared-source edits propagate through the declarations; live label changes use reactive getters, not mutation of a definition.

Composition uses ordinary object references and shallow object spread. Later members replace earlier members; nested configuration is retained only through an explicit nested spread. There is no inheritance, deep merge, mode, selection, or override DSL.

### 2.2 Labels

```ts
const userLabels = {
  ...commonLabels,
  name: 'Name',
  email: 'Email address',
  password: 'Password',
  roleIds: 'Roles',
  statusCode: 'Status',
  createdAt: 'Created at',
  updatedAt: 'Updated at',
} as const
```

`Label = string | (() => string)`. Evaluate synchronous label getters in the consuming component's reactive context. Resolve labels in this order: entry override, supplied dictionary entry, entry key. Preserve an explicit empty string. Extra dictionary keys are allowed.

Dictionaries contain labels only. They travel with definitions; no resource injection or implicit global property-name lookup supplies missing behavior. A label change cannot affect a renderer, format, requiredness, initial value, source, or submitted value.

### 2.3 Shared business metadata and inputs

Share option identity, option captions, and business constants independently of presentation. Derive display and input configuration from that data. Editable choices are an explicit subset of displayable values.

```ts
const statusCatalog = {
  active:        { label: 'Aktif', color: 'success' },
  non_active:    { label: 'Nonaktif', color: 'neutral' },
  expired:       { label: 'Kadaluwarsa', color: 'error' },
  expiring_soon: { label: 'Akan Kadaluwarsa', color: 'warning' },
} as const

const editableStatusCodes = ['active', 'non_active'] as const
const statusInput = {
  renderer: 'radio',
  props: {
    data: editableStatusCodes.map(id => ({ id, name: statusCatalog[id].label })),
  },
} as const

const roleChoice = { pick: 'id', view: 'name' } as const
const roleInput = {
  renderer: 'checkbox-group',
  source: { load: roles.list.table.load },
  props: { ...roleChoice, searchParameters: { active: true } },
} as const

const emailInput = {
  renderer: 'text',
  props: { type: 'email' },
} as const

const sharedUserInputs = {
  name: { renderer: 'text' },
  email: emailInput,
} as const
```

Fragments are ordinary objects, not schema-bound references. Check the assembled fragment against the consuming form's input type and renderer contract, including fragments supplied through variables and spreads. A callback that reads another draft property requires that property in its declared draft context. Keep workflow-specific behavior local; parameterized reuse uses typed ordinary functions.

### 2.4 Forms and submit ownership

```ts
export const createUserForm = defineForm({
  schema: createUserFormSchema,
  labels: userLabels,
  fields: {
    ...sharedUserInputs,
    password: { renderer: 'text', props: { type: 'password' } },
    roleIds: roleInput,
  },
  submit: usersActions.create,
})

export const updateUserForm = defineForm({
  schema: updateUserFormSchema,
  labels: userLabels,
  fields: {
    name: sharedUserInputs.name,
    statusCode: statusInput,
  },
})
```

These are sibling definitions. Each operation owns its schema and selected inputs. Reuse the complete definition when input selection, validation, defaults, and behavior are identical. Share fragments when only part of the editor is common. Selecting `sharedUserInputs.name` fixes membership; spreading the map deliberately includes future additions.

`submit` is optional in `FormDefinition` and preserved by `defineForm`. A definition containing it binds directly to both Form and DialogForm. A definition without it accepts a handler at binding time. The mounted model-bound case is specified in section 5.

`submit` receives the schema's parsed output. Its return type determines `submitted` event data. The constructor never executes or wraps it. Its result retains the supplied function reference. Resource composition wraps the effective function for operation policy; a later component-level override replaces that wrapped operation entirely. An override therefore does not inherit the replaced function's access or invalidation behavior.

An operation-local adjustment uses explicit composition:

```ts
email: {
  ...emailInput,
  props: { ...emailInput.props, readonly: true },
}
```

Requiredness and domain transformations are not duplicated in these fragments; the schema owns them.

### 2.5 Complete display reuse

Expose `DisplayField<TRecord, TValue = unknown>` publicly. It contains only `label`, `read`, `renderer`, `props`, and `format`. `read(record)` is a pure synchronous accessor. The constructor infers the value from its return type; without `read`, the entry reads its record property.

```ts
const statusDisplay = {
  renderer: 'chip',
  props: { options: statusCatalog },
} as const

const timestampDisplay = { format: 'datetime' } as const

const userDisplay = {
  statusCode: statusDisplay,
  createdAt: timestampDisplay,
  updatedAt: timestampDisplay,
} satisfies Record<string, DisplayField<User>>

export const usersTable = defineTable({
  schema: userRecordSchema,
  labels: userLabels,
  columns: {
    name: { sortable: true },
    email: {},
    statusCode: { ...userDisplay.statusCode, align: 'center' },
    createdAt: userDisplay.createdAt,
  },
})

export const userDetail = defineDetail({
  schema: userRecordSchema,
  labels: userLabels,
  fields: {
    name: {},
    email: {},
    ...userDisplay,
  },
})
```

`User` is the output of `userRecordSchema`. `satisfies` checks fragment shape without discarding its specific inferred properties. Destination constructors still check record/value compatibility and renderer-specific props. [R4]

A table column adds sorting, alignment, and table classes. A detail entry adds span and emphasis. Neither duplicates the accessor, renderer, renderer props, format, or label dictionary. Maps are explicit reusable data, not resource registries. No `defineDisplay`, projection conversion, or resource lookup is required.

### 2.6 Relation names instead of identifiers

The following is the required relation-display test fixture. Its read model explicitly contains joined role records; it does not assert that the existing users endpoint returns this shape.

```ts
const userRoleReadSchema = z.object({
  id: z.string(),
  roleIds: z.array(z.string()),
  roles: z.array(z.object({ id: z.string(), name: z.string() })),
})
type UserRoleRead = z.output<typeof userRoleReadSchema>

const userRoleDisplay = {
  roleIds: {
    read: (user: UserRoleRead) =>
      user.roles.map(role => role[roleChoice.view]).join(', '),
  },
} satisfies Record<string, DisplayField<UserRoleRead>>

const userRolesTable = defineTable({
  schema: userRoleReadSchema,
  labels: userLabels,
  columns: { roleIds: userRoleDisplay.roleIds },
})

const userRolesDetail = defineDetail({
  schema: userRoleReadSchema,
  labels: userLabels,
  fields: { roleIds: userRoleDisplay.roleIds },
})
```

The role-name accessor is defined once and consumed unchanged by both surfaces. `roleChoice` also supplies the role input's identity/label properties. Input selection and read-only display share that metadata, not their entire configuration.

The loader owns required relation data. Preserve existing joined response values. For an ID-only response that needs labels, enrich the read model in its loader adapter with batched relation loading before rendering. Do not fetch per cell, infer joins from input sources, mutate identifiers into labels, or perform network work in `read`.

Keep current screen membership and endpoint shapes during migration. Apply the shared accessor pattern to actual relations, including existing `createdBy`/`updatedBy` relation readers; use the fixture above to prove parity without inventing backend properties.

## 3. Public contracts

### 3.1 Form types

`FormDefinition<TInput, TOutput, TResult = unknown>` has required `schema` and `fields`, and optional `labels`, `validators`, and `submit`. Inputs and outputs are finite object contracts. `submit` is `(output: TOutput) => MaybePromise<TResult>`.

`defineForm` infers input/output from the raw schema and result from the awaited handler return. Its result preserves submit presence: a supplied function remains required in the returned type; an omitted function remains absent (`submit?: never`). Retain this refinement through object composition. Do not widen a submitting definition to an optional handler and then require an assertion at `v-bind`.

Infer callbacks from the schema, not the reverse. An incompatible submit function must fail instead of widening `TOutput`. A component's effective submit prop determines its result type, including an override returning a different result.

| Form-input member | Contract |
|---|---|
| `label` | Label override. |
| `renderer` | Registered input key; safely inferred when omitted. |
| `props` | Renderer-specific control/presentation props. |
| `source` | Explicit input source resolved by its adapter. |
| `span` | Managed input-grid span. |
| `initialValue` | Per-session zero-argument editable-value factory. |
| `behavior` | Reactive input behavior. |

`behavior` supports `visible`, `disabled`, `props`, `presentation`, `derived`, and `resetWhen`. Its context is `{ draft, value, context }`; `draft` is `Partial<TInput>` and `value` includes the unset state. Retain the current dependency tracking, derived-value updates, and reset-on-identity-change behavior. `presentation` changes only renderer, label, props, span, and the conditional `required` hint. A replacement renderer must accept the same editable value type.

Fields are an ordered map of top-level schema input keys. A selected field has no second `key`; computed display keys are not form inputs. Composite inputs edit nested structures; issues retain nested paths. Reject numeric index-like keys, prototype-sensitive keys, reference arrays, unknown field keys, and a second selection list.

Field-level domain `validate`, `write`, and form-side record `read` accessors are removed. Schema/validators own domain rules; input adapters own control-shape checks; the draft loader maps records to editable inputs.

### 3.2 Display, table, and detail types

`TableDefinition<TRecord>` contains required `schema`, required ordered `columns`, and optional `labels`. `DetailDefinition<TRecord>` contains required `schema`, required ordered `fields`, and optional `labels`. Their schema describes returned records, not query values or mutation inputs.

`TableColumn` extends `DisplayField` with `sortable`, `sortKey`, `align`, `class`, and `headerClass`. `DetailField` extends it with `emphasis` and `span`. Reject table-only members on details and input-only members on every display field. FormInput does not extend DisplayField. Renderer-authored props exclude runtime-owned value/model, record/draft, field identity, setter, and event plumbing; the primitive supplies those members.

A record-key entry reads that property by default. An entry outside the record keys requires `read(record)`. A sortable entry with a custom accessor requires an explicit `sortKey`; a direct property column defaults to its property key. Validate `sortKey` against the record keys and the bound query contract. An accessor does not make client-side sorting authoritative for a server-paginated collection.

Every constructor checks named fragments and spreads, not only fresh literals. Type-check accessor records, accessor results, renderer value contracts, and renderer-specific props. Apply shape/configuration guards at runtime for JavaScript callers; static type information is not a runtime record validator.

### 3.3 Renderer registration and display execution

Use two registries: `form` and `display`. Table and Detail use the same display registry and the same internal `DisplayValue` component. Remove separate table/detail renderer registration paths.

```ts
app.use(FrameworkPlugin, {
  adapters: appAdapters,
  inputProps: appInputProps,
  renderers: {
    display: appDisplayRenderers,
  },
})
```

Retain built-in form registration. Add an augmentable `DisplayRendererComponents` map alongside the input renderer contract. Registered component value/props types determine valid display configurations. A dual-use component is registered separately for input and display; this does not join their field contracts.

The single display pipeline is `record -> read/property -> format -> renderer -> surface layout`. With no renderer, render a scalar as text and a nullish value as `-`. Dates require explicit date formatting; structured values require a renderer or an accessor/formatter that produces displayable text. Never emit `[object Object]`. Reject unknown renderer/formatter keys and non-displayable fallback values with a field-specific diagnostic. Custom renderers retain their declared runtime prop validation; erased value types are checked statically, not reconstructed at runtime.

Accessors and formatters are pure. They do not modify records, invoke input hydration, submit, navigate, or load data. Renderer implementations may normalize their own presentation values without writing them back. Preserve deliberate asset rendering and sanitized/text-only HTML behavior.

Exports reuse the resolved visible columns, accessors, and formats. They do not render Vue components. Retain existing export `mapValue`, exclusions, filenames, and pagination. Export-specific textual captions reference the same business catalog rather than copying its labels.

## 4. Schemas and value ownership

### 4.1 Compilation and validation

Accept raw schemas from the repository's installed Zod dialects. One internal compiler supplies parsing, finite input-key discovery, input-kind metadata, required-state hints, and normalized issues. Primitives invoke it; constructors use its context-free checks. Resources never adapt schemas. Public pre-wrapped validation schemas and `fromZod` authoring are removed.

Form schemas expose discoverable finite object input and object output. Inspect supported object wrappers and input-side pipes; reject an undiscoverable input shape. Do not execute defaults, refinements, or transforms to infer controls. Parse asynchronously so async refinements work. Input and parsed-output types remain distinct. [R3]

Additional validators are descriptors `{ validate, triggers?, path? }`. Triggers are `blur` and `submit`, defaulting to submit. They run after a successful schema parse and return issues, not replacement data. The context is `{ data, draft, initial, context, field, signal }`: parsed output, read-only input snapshots, caller context, blur target, and cancellation signal. Thrown operational failures block submission and become visible operational issues.

### 4.2 Inference and requiredness

Infer `text` for strings, `number` for numbers, `switch` for booleans, `date` for Date inputs, and `select` with options for finite string enums. Objects, arrays, unresolved unions, and unknown kinds require an explicit input renderer. Use the schema's input side, not transformed output, for this decision.

Schema metadata supplies static required indicators. The runtime passes them to controls. Reject application `props.required`, including reactive props patches. Conditional requiredness uses `behavior.presentation.required` as a visual hint; the schema remains authoritative. Remove global behavior selected solely by a property name.

### 4.3 Drafts, defaults, and records

```text
record --explicit loader mapping--> editable input
editable input --schema parse--> submitted output
submitted output --submit function--> operation result
```

Draft models, initial data, input slots, and behavior use `Partial<TInput>`. A draft loader returns `Partial<TInput> | undefined`. It selects input properties explicitly; it does not invert schema transformations or cast a full record into an update draft. Unknown keys never enter the editable or submission candidate maps. Keep valid schema values intentionally provided without a rendered control. Bind contextual parent identities in command closures.

Initial precedence is `input factory < initialData < loaded draft < user edit`. An own property containing `undefined`, `null`, `false`, `0`, or `''` is explicit and suppresses a lower-precedence factory. Factories run per session; clone editable arrays/plain objects while retaining opaque files/services. Schema defaults run during parsing, not UI initialization. Share a business constant when both schema and UI need it.

A controlled model is authoritative. Emit initialized values instead of mutating its supplied object. Input adapters hydrate only the active form session. Preserve stored asset objects and selected records when required by the schema; retain the users form's role-selection-to-ID transform. There is no universal ID serialization rule.

## 5. Form and DialogForm runtime

### 5.1 Form props, state, and events

`FormProps<TInput, TOutput, TResult>` extends FormDefinition with `modelValue`, `initialData`, `load`, `id`, `resource`, `namespace`, `searchParameters`, `context`, `normalizeError`, `disabled`, `submitLabel`, and `submittingLabel`.

A mounted Form requires a function-valued submit or a present controlled draft. A model-bound form can also submit. Enforce these two valid binding states in compact public types and runtime guards. Detect actual model-prop presence, including present `undefined`. Passing only `open` to DialogForm does not satisfy the draft-model requirement.

The default model is the draft. Events are `update:modelValue`, `submitted(result)`, `error`, and `reset`. Expose `draft`, `dirty`, `submitting`, `validating`, `inputPending`, `validate`, `submit`, `reset`, and `refresh`. `validate()` returns normalized issues and parsed output without invoking a mutation. Definition bags contain no mutation listeners or slot registries.

Only Form calls `useFormSession`. Wrappers render one Form and delegate; no wrapper allocates another session. Track draft initialization, touched/dirty state, behavior, hydration, issue placement, cancellation, pending inputs, and submission there.

Identity, schema identity, and selected-input-key changes reset the session and invalidate stale work. Label/layout/compatible prop changes update presentation without clearing edits. Late loads update untouched keys only; reset restores the loaded/initial baseline, refresh retains dirty edits, and failed writes retain the draft. Ignore stale load/validation responses after identity changes or unmounting.

### 5.2 Submission

For each accepted attempt:

1. Block concurrent attempts, disabled forms, initial loading, and pending input work such as uploads.
2. Settle behavior and snapshot the draft generation and effective submit function.
3. Build the candidate from schema input keys. Omit currently hidden controls; retain intentional schema values without controls.
4. Run input control-shape checks, then parse that candidate once.
5. Run submit-trigger validators on the parsed output. Discard stale results. If the draft or submit binding changed during async validation, stop this attempt without dispatching.
6. Invoke the captured `submit(parsedOutput)` exactly once. Emit one success or normalized error event. Never retry mutations automatically.

Schema defaults/transforms can add output properties after candidate filtering. Visibility is not an output whitelist; schemas encode required output omission. Hidden-required failures surface at form level. Wrappers/resources do not parse the output again. Server validation is independent.

### 5.3 Slots and accessibility

Keep `input:<key>`, `loading`, `load-error`, and `actions` slots. An input slot receives typed value/draft, `setValue`, field identity/label, issue state, and disabled state. Form owns labels, descriptions, issue focus, and a stable per-instance DOM ID prefix. Custom slots replace controls, not the editing runtime. Retain the managed grid and `span`; add no layout language.

### 5.4 DialogForm parity

DialogForm adds `open`, `title`, `description`, `closeOnSubmitted`, `beforeClose`, and `cancelLabel` to all Form props. Its default model remains the draft; `v-model:open` controls visibility. Without that model, visibility starts closed and is owned locally.

Share runtime Form prop declarations/key coverage with the wrapper. Forward the full reactive Form subset and preserve presence, including explicit undefined/false. Use explicit forwarding with `inheritAttrs: false`; `$attrs` is not the public Form contract. Apply class/style to the dialog root; forward native-form accessibility/data/name/autocomplete attributes to Form. Reject removed prop names before attribute fallthrough.

Forward all Form events once, all Form slots with unchanged context, and all exposed methods/state. Add `update:open`, `open`, and `close` events; `trigger`, `title`, `description`, `header`, and `footer` slots; and `requestClose`/`checkingClose` on the exposed API. Augment action-slot context with `requestClose`.

`closeOnSubmitted` defaults to true. Close after successful completion; validation/write failure keeps the session open. User cancel/dismiss calls `beforeClose({ reason, dirty, submitting, validating })`. False/rejection prevents closing; duplicate pending close requests are ignored. Block user close during validation/submission. Successful automatic closing bypasses the cancel/dismiss guard.

A controlled parent setting `open=false` is authoritative. Closing unmounts the editing session; reopening creates fresh defaults and reloads. A controlled draft retains what the parent supplies. Unmounting cancels local work, not an already-dispatched server mutation.

## 6. Resource composition

### 6.1 Declaration and result

Use one declaration object. Schema, fields, and validators belong to surfaces, not an aggregate resource-schema argument.

```ts
export const users = defineResource({
  key: 'users',
  identity: (record: Pick<User, 'id'>) => record.id,

  list: {
    permission: 'view-users',
    route: { name: 'settings-users' },
    title: 'Users',
    table: { ...usersTable, load: usersActions.list },
  },

  create: {
    permission: 'create-users',
    route: { name: 'settings-users-create' },
    title: 'Create user',
    form: createUserForm,
  },

  detail: {
    permission: 'view-users',
    route: {
      name: 'settings-users-detail',
      params: id => ({ userId: String(id) }),
    },
    detail: ({ id }) => ({
      ...userDetail,
      load: context => usersActions.detail({ ...context, id }),
    }),
  },

  update: {
    permission: 'update-users',
    route: {
      name: 'settings-users-edit',
      params: id => ({ userId: String(id) }),
    },
    title: 'Edit user',
    form: ({ id }) => ({
      ...updateUserForm,
      load: async context => {
        const record = await usersActions.detail({ ...context, id })
        if (!record) return undefined
        return { name: record.name, statusCode: record.statusCode }
      },
      submit: payload => usersActions.update(id, payload),
    }),
  },
})
```

| Declaration | Returned member |
|---|---|
| `list.table`: static definition plus required loader | `resource.list`: stable ListView props |
| `create.form`: static definition plus required submit | `resource.create`: stable FormView props |
| `detail.detail(binding)`: definition plus required record loader | `resource.detail(binding)`: DetailView props |
| `update.form(binding)`: definition plus required draft loader and submit | `resource.update(binding)`: FormView props |
| `delete.run(id)`: command without a surface | `resource.delete(id)` |
| `actions`: existing named custom command declarations | Typed custom commands with access and invalidation |

Every standard operation declares `permission: string | null`; null means no client permission-code requirement. Preserve explicit permission arrays on custom commands, visibility policies, row-operation checks, typed routes, and route-access registration. Absent operations produce no result member. Commands retain `run`; form components do not accept it.

`binding = { id: TIdentity; record?: TIdentityRecord }`. Identity is required for detail/update/delete; optional record context supports row checks. The identity function declares the identity-bearing record contract. List/detail records and mutation results must satisfy that contract, but a mutation result need not contain display-only joined relations. Retain full supplied records and operation metadata for row-access checks; do not project them down to identity fields. Check each display's loader result against its own record schema independently. Preserve operation-specific result types.

Bound return types retain required loader/submit members; extraction needs no non-null assertion. Expose `key`, the declared `permissions` map, and `invalidate({ id? })`. Preserve scalar/composite identities and canonical key encoding. Factories are pure, synchronous, and do not load data.

### 6.2 Binding responsibilities

Resource binding owns only operation compatibility, access, identity, cache namespaces, successful-mutation invalidation, and sibling page actions/navigation targets. Strip declaration-only metadata from result bags. It does not inspect fields, labels, schema metadata, renderer selection, or input adapters.

Capture identity in record bindings; reject a conflicting loader-context identity. Resolve and recheck access when an operation executes, retaining existing row-operation behavior. Backend authorization remains authoritative. Capture the executing app runtime across async work; definitions can be imported before plugin installation. Do not memoize an unbounded history of identity/record bindings.

The binder wraps the effective submit function once, including one already in FormDefinition, without mutating that definition. A successful mutation invalidates resource collections and affected record/draft caches. Identity-less invalidation covers the resource. Mapped form drafts use operation-specific load cache namespaces and never populate raw record caches. Mutation results remain unchanged by display configuration.

Extracted `resource.create.form.submit` and `resource.list.table.load` retain these guards and cache effects. Their functions contain no navigation, dialog closing, or page-toast policy. Replacing a bound function is an explicit new operation; the caller owns its policy.

### 6.3 Navigation and transport

FormView handles successful completion through `afterSubmit({ result, defaultTo, navigate, preventDefaultNavigation })`, then applies default navigation unless prevented. `defaultTo: false` disables it. Post-submit callback/navigation failures do not repeat the write or become form validation failures.

Derive create/update destinations from the declared detail route, then list route. Explicit operation navigation overrides derivation. Detail back navigation defaults to its sibling list route. Preserve typed route names/parameters and the page leave guard.

Module `.schema.ts` files export raw record/query/create/update schemas. Remove application `defineSchema`, Loom `WebResourceSchema`, and UI-wide derived aliases. Keep endpoint types in Hono/SDK adapters; check form output when assigning submit, record types when assigning loaders, and identity during composition. Do not change backend contracts to satisfy a UI abstraction.

## 7. Collections, views, and composite inputs

### 7.1 Table, TreeTable, and Detail

TableProps extends TableDefinition with existing collection/query, identity/reorder, column sizing/visibility, and preference controls. DetailProps extends DetailDefinition with record-load controls. Exactly one `data` or `load` supplies each primitive; enforce typed binding states and runtime presence checks. Controlled empty values remain valid.

`schema` is the record schema. Table query validation uses `querySchema`, handled by the shared schema compiler. Preserve one Collection/query owner; TableContent is loaded-row presentation. TreeTable keeps its hierarchy, `children`, `treeColumn`, expansion, and row metadata while forwarding the new table contract. Display schemas describe the actual normalized loader result. They provide typing/metadata, not rendering-time record transformations.

ListView receives `table`, optional `filters`, export settings, and existing page action props (`createRoute`, `detailRoute`, `updateRoute`, `can`, `deleteRecord`). Table owns loading; the custom collection slot receives the same loaded rows and controls. Query values live in `table.query`; forward `update:query` without an outer query alias. Standalone Table retains `v-model:query`.

Extracting `list.table` retains columns, query settings, loader, and cache/access behavior. It does not acquire page headings, filter controls, export buttons, or page action menus. FormView and DetailView render their nested primitive directly and forward its slots/events without another load, schema adaptation, or session.

### 7.2 Filters

`ListView.filters` consumes a submit-free FormDefinition whose parsed output is a partial query. ListView owns the controlled filter draft and calls Form's `validate()`. This slot rejects a supplied submit function; it is not a mutation editor.

Commit only the latest successful parsed filter result to the filter-owned query keys, reset pagination, and remove keys when cleared. Invalid/stale results do not trigger loading. Keep search/sort/page controls separate unless explicitly present in the filter contract. Filter defaults never inherit create-form behavior by property name.

### 7.3 TableInput

```vue
<TableInput
  v-model="rows"
  :table="rowTable"
  :form="rowForm"
  :to-draft="rowToDraft"
/>
```

Editable mode requires separate table/form definitions and `toDraft(row): Partial<TRowInput>`. The form schema output is the stored row type. For identical shapes, explicitly use `row => row`; the session clones editable values. Construct the reusable row definition without submit.

TableInput owns row data and commit functions. Its table rejects data/load bindings; its form rejects submit/load/model bindings. Express the submit-free form slot as FormDefinition with `submit?: never`, not a second definition API. Reject conflicts rather than silently executing/replacing a supplied business mutation.

Add/edit mount flat DialogForm with the row definition, mapped initial data for edit, and the locally supplied insert/replace submit function. A row form remains independently usable in another dialog. Read-only mode requires only table/model and prohibits editor members. Preserve disabled behavior, stable row identity, and reorder events.

### 7.4 Lookup, option, and location inputs

LookupInput receives its own table definition. Its controller owns result loading/selection and supplies controlled table rows; the table definition rejects a second loader. Scalar identity hydration uses an explicit `loadDetail`; it is input behavior, not display-field fetching.

```ts
const roleLookupInput = {
  renderer: 'lookup',
  source: {
    load: roles.list.table.load,
    loadDetail: (context: RecordLoadContext<string> & { id: string }) =>
      roles.detail({ id: context.id }).detail.load(context),
  },
  props: { table: roleLookupTable, ...roleChoice },
} as const
```

Standard option sources are `{ load, namespace? }`; static choices use existing renderer data/options props. Preserve contextual `searchParameters`, cancellation, scalar hydration, and multi-selection contracts. Adapters consume explicit loaders; they never inspect a resource, call `.list()`, extract `.run`, or derive lookup columns from another surface.

Remove lookup cross-form setters (`formDataSetter`, `onSelectData`, `formData`) and the field-mapping transform shortcut. Use the owning form's derived behavior for dependent draft values and its schema for command conversion.

LocationInput's model-bound editor receives a raw location-input schema and a normal Form definition. Retain its location operations, coordinate conversions, and cancellation; remove its schema-free field-catalog path. Asset/file/image inputs retain upload-pending behavior and file-manager integration.

## 8. Implementation ownership

| Target | Responsibility |
|---|---|
| `packages/loom/src/contracts/{forms,tables,details,display,labels}.ts` | Separate public contracts; DisplayField shared only by read-only surfaces. |
| `packages/loom/src/contracts/schema.ts` | Compact raw-schema input/output boundary. |
| `packages/loom/src/forms/{defineForm,compileForm,useFormSession,behavior,props}.ts` | Construction, shared checks, one session, input behavior, complete runtime prop coverage. |
| `packages/loom/src/schemas/compileSchema.ts` | Raw Zod adapter, metadata, parsing, normalized issues. |
| `packages/loom/src/labels/resolveLabel.ts` | Explicit label precedence. |
| `packages/loom/src/display/{resolveDisplay.ts,DisplayValue.vue}` | Shared reads/formats/renderer execution. |
| `packages/loom/src/tables/defineTable.ts`, `details/defineDetail.ts` | Surface-specific authoring checks. |
| `packages/loom/src/renderers/{registry,displayContracts}.ts` | One display registry, separate input registry, typed registration. |
| `packages/loom/src/resources/{defineResource,bindResource,operations}.ts` | One-object declarations, primitive bags, retained operation mechanics. |
| `apps/web/src/configs/{labels,input-presets,display-presets}.ts` | Explicit common labels and reusable input/display fragments. |
| `apps/web/src/configs/statuses.ts` | Shared status catalog and explicit editable subsets. |
| `apps/web/src/framework/display/renderers.ts` | App display component registration, replacing mixed field registration. |

Move retained logic to these owners; do not keep duplicate copies. Remove Loom `src/fields/`, `resources/actionResource.ts`, and the application `framework/fields/` after relocating needed behavior/presets/renderers. Resources no longer import field defaults or input hydration. Plugin installation supplies registries to primitive consumers directly.

Small modules keep labels, fragments, surface definitions, and resource composition together in `.resource.ts`; raw schemas remain in `.schema.ts`, transport calls in `.actions.ts`. Shared catalogs live at their existing business owner when one exists. Do not create one file per definition.

## 9. Blast radius and removal

### 9.1 Required migration inventory

Inventory callers, imports/re-exports, generated code, templates, fixtures, and agent pointers before implementation. Follow aliases and dependent prop types. The following groups are mandatory; other discovered consumers are equally in scope.

| Area | Source targets and required work |
|---|---|
| Public types/exports | Loom `contracts/{fields,components,schema,validation,index}.ts`, root `index.ts`, renderer/resource barrels, public API tests, package export paths. Remove universal types and export the new constructors/contracts. |
| Field/schema runtime | Entire Loom `fields/`, `validation/{zod,select,index}.ts`, form renderer/input contracts and adapters. Relocate retained behavior; remove wrapped-schema and writer paths. |
| Primitive components | `components/core/{Form,Table,TableContent,TreeTable,Detail,Collection}.vue`, `useCoreData.ts`, `useTablePreferences.ts`. Adapt contracts, display pipeline, data-source guards, query ownership, and caches. |
| Wrappers/views | `components/composites/DialogForm.vue`; `components/views/{FormView,ListView,DetailView}.vue`, their helpers, browser fixtures, TS and Vue type fixtures. Remove alternate bags and duplicate runtime work. |
| Nested inputs | `TableInput.vue`, `tableInput.types.ts`, `LookupInput.vue`, `LocationInput.vue`; selection/option source handling, control-shape/asset adapters, dependent-value logic, and renderer prop tests. |
| Resource operations | `resources/{actionResource,defineResource,runtime,identity,routeAccess,index}.ts`; scalar/composite identities, route registration, custom commands, row policies, guards, mutation invalidation. |
| Plugin integration | `adapters/plugin.ts`, project adapters, renderer registry/inputProps, plugin tests, resource runtime registration, and `apps/web/src/main.ts`. Remove field-default installation and table/detail registry duplication. |
| Export pipeline | `services/{export,excel}.ts` and tests. Replace ResolvedSurfaceField with resolved columns/shared display reads. Preserve visible-column and query/export behavior. |
| App defaults | `configs/defaults.ts`, its tests, dictionary uses, `framework/fields/{presets,renderers}.ts` and tests. Split actual label/input/display meaning; migrate timestamp helpers, status metadata, relation readers, and assets. Relation accessors return their declared captions instead of relying on implicit object display. |
| App boundaries | `framework/schema.ts`, `framework/hono/contracts.ts`, action/type tests, `framework/inputs/registry.ts` and tests. Remove AppResourceContract/UI-wide schema aliases; preserve transport endpoint inference. |
| Settings modules | Users, roles, permissions, `roles/[roleId]/detail/permissions/role-permissions`, `users/[userId]/detail/role-assignments`: all `.resource.ts`, `.schema.ts`, action adapters, and `.route.vue` consumers. Keep current field membership, permissions, context filters, and named set commands. |
| App regression fixtures | `framework/acceptance/QueryOwnershipFixture.*`, asset-form fixtures, route-resource/schema-import/identity tests, router guard/nested-navigation tests, browser/E2E routes, and generated route contracts. |
| Adjacent integrations | File/image inputs, FileManager/AssetPicker and their adapters/tests: verify stored asset and preview behavior after runtime changes. Preserve unrelated provider `operations.list()` APIs; these are not resource surface bags. |
| Generators/checkers | `scripts/scaffold-bounded-module.mjs`, `module-ui-check.mjs`, their tests, `test-support/bounded-fixture.mjs`, integration/verification/evidence scripts, module-tooling/module-skills tests, and Python module-skill checks. |
| Agent/documentation entrypoints | Root `AGENTS.md`, `DESIGN.md`, Loom README/public docs, `docs/ui/{forms,collections}.md`, web architecture docs, custom-field and file-manager references, and all active references to the removed model. |
| Skills | `build-resource-form`, `web-ui-surfaces`, `migrate-web-resource`, `implement-schema-first-zod`, `carta-module-{design,plan,development}`, `verify-carta-module`, their references/scripts/tests. Replace universal-field and writer instructions, including `frontend-field-contract.md` and `web-query-cache.md`. |
| Tooling configuration | Loom/web effective Vue type-check configs, explicit browser-test include lists, package validation scripts, and CI entrypoints. Register new gates instead of leaving tests undiscovered. |

Generator output must contain raw operation schemas, independent surface constructors, the one-object resource declaration, static list/create bags, and identity-bound update/detail pages. Replace universal UI field normalization with input/display fragment and surface-map emitters; update manifest parsing and fixtures accordingly. Keep backend schema metadata separate from UI fragments.

An update-only module loads its draft through the endpoint adapter inside `update.form`. It does not fabricate a visible detail operation or inject a flat page-level loader. Generated route code and fresh scaffold fixtures must compile without casts that bypass the new boundaries.

Static UI checks inspect assembled fragments, relation accessors, renderer/format choices, and surface membership. Port `fields/displayRequirement.ts` to `display/requirements.ts` and make its tests and the static checker enforce the same display rules. Plain references/spreads used in the target examples must not create false failures.

### 9.2 Delete replaced paths

| Remove | Replacement |
|---|---|
| `defineFields`, FieldDefinition/FieldCatalog/FieldsInput/ResolvedField | Independent surface definitions and resolved input/column/detail types. |
| FieldReference/FieldOverride, symbol payloads, `.override()` | Direct reusable objects and spread. |
| FieldDisplay/Form/Table/DetailProjection, FieldLayer, projection merging | FormInput and shared DisplayField with surface extensions. |
| `resolveFields`, `toCatalog`, readField/readFields universal wrappers | Form compilation and pure display resolution. |
| Two-argument defineResource and standard operations under actions | Section 6's declaration and result shape. |
| `resource.list()`/`resource.create()` surface factories | Static list/create bags. |
| Form/DialogForm `run`, structural `{ run }` submits, nested `form` | Flat Form props with function-valued submit. |
| Flat action props and `formProps` aliases on views | Nested primitive bags. |
| Table.fields and shared TableInput/LookupInput.fields | Columns and independent composite definitions. |
| Mixed appFieldDefaults/framework field-default injection and caches | Explicit dictionaries, business catalogs, input/display fragments. |
| Separate table/detail renderer registries | Shared display registry and DisplayValue. |
| Public fromZod/pre-wrapped schemas, application defineSchema/WebResourceSchema | Raw local schemas and direct operation type checks. |
| Form field read/write/domain validate; lookup cross-form writers | Draft mapping, schema transforms/validators, derived behavior. |
| Resource renderer-driven record hydration | Transport-owned read models and form-owned input hydration. |

No compatibility aliases, old-signature overloads, dual-shape unions, feature flags, fallback resolvers, dead implementations, or parallel legacy/v2 directories remain. New constructors cannot call the old implementation under a new name. Keep obsolete design prose outside active agent discovery; executable old code is deleted, not archived beside the replacement.

## 10. Type and runtime verification

### 10.1 Type boundaries

Infer schema input/output and display records before checking callbacks/loaders. Use non-inference positions for consumers that would otherwise widen those types. Retain specific field keys, accessor results, renderer props, handler presence, and operation results while exporting compact named types rather than the complete Zod/resource generic graph.

Use generic Vue SFCs with compact imported prop contracts; Vue's AST-based prop conversion does not support arbitrary whole-props conditional types. Keep expensive authoring checks outside the SFC declaration. [R2] Do not introduce public `any` facades, bivariant callback escapes, `@ts-ignore`, `@vue-ignore`, or suppressed TS2590. Expected-error assertions belong only in negative tests.

Enable `checkUnknownProps` and retain `strictTemplates` in effective Loom/web configs. Put TS/Vue contract fixtures under included `__type-tests__`; Loom excludes ordinary `__tests__` from its normal checker. Verify with the repository's pinned `vue-tsc`, not a standalone tsc substitute.

Required positive fixtures include every expression in section 1, a submit-free definition bound to a typed handler, model-only forms, an overridden handler with a different result type, shared display accessors, and transformed input/output. Required negative fixtures cover incompatible handler/draft/read types, cross-surface properties through spreads, invalid renderer props, old view bags, `Form :form`, `DialogForm :form`, and composite-owned binding conflicts.

### 10.2 Runtime diagnostics

Run configuration guards in production. Include component/surface, field key when applicable, invalid member, and expected contract. Use stable codes: `FORM_SCHEMA_REQUIRED`, `FORM_SCHEMA_INPUT_UNSUPPORTED`, `FORM_BINDING_REQUIRED`, `FORM_FIELD_UNKNOWN`, `SURFACE_OPTION_INVALID`, `INPUT_RENDERER_REQUIRED`, `RENDERER_NOT_REGISTERED`, `DISPLAY_VALUE_INVALID`, `SURFACE_DATA_SOURCE_INVALID`, `RESOURCE_IDENTITY_INVALID`, and `COMPOSITE_BINDING_CONFLICT`.

Reject removed top-level attributes before wrapper fallthrough. Configuration exceptions are distinct from user validation issues and loader/mutation failures. Runtime guards validate available structure/registry contracts; they do not pretend to recover erased TypeScript proofs.

### 10.3 Decisive integration tests

Register `components/composites/__tests__/SurfaceParity.browser.spec.ts` in Loom's explicit browser-test include list. Test one definition containing submit, labels, fresh mutable defaults, a dependent input, an async validator, and a non-idempotent schema transform through Form, DialogForm, FormView, and extracted resource forms.

Assert identical labels, inputs, defaults, behavior, validation, and output for identical edits. Count one session per mounted editor, one transform per validation attempt, and one mutation per accepted submit. Repeat with an equivalent plain object. Override submit after `v-bind` and assert the original function is never called. Verify typed completion results, all forwarded props/events/slots/ref methods, and independent draft/open model presence.

Add display parity coverage using section 2.6's joined-role fixture and shared status/date fragments. Table, TreeTable, Detail, and extracted resource bags must show the same names/captions/formats. Assert zero accessor-driven network requests, no record mutation, correct export accessor/format reuse, and acceptance of mutation results without display-only joins.

| Gate | Required behavior |
|---|---|
| Session isolation | Simultaneous shared-definition dialogs have independent drafts/defaults/errors/pending work and unique DOM IDs. |
| Initial/load state | Preserve owned empty/undefined values; late loads retain edits; identity/schema changes discard stale results; reset/refresh/reopen follow section 5. |
| Submission | Hidden/unrendered values follow candidate rules; async/stale validation and uploads block dispatch; errors preserve drafts; concurrent attempts do not duplicate writes. |
| Value contracts | Asset objects, selection records, role-ID transforms, and nested rows retain schema-defined input/output. |
| Display reuse | Changing one shared accessor/renderer/format updates both read-only surfaces without changing edited/submitted values. Label dictionaries affect labels only. |
| Resource extraction | Guarded loads/submits keep permission, identity, row policy, and invalidation. Denied calls dispatch nothing. Navigation remains shell-owned. |
| Composite ownership | Row display/edit selections differ correctly; filters do not mutate; lookup has explicit loading and no resource introspection; LocationInput uses a typed model form. |
| Existing UI | Preserve query namespaces, collection slots, exports, preferences/resizing, tree behavior, typed routes, custom commands, dirty-page guards, and asset/file-manager behavior. |
| Generator/removal | Fresh generated modules pass structural/type checks. Old imports/exports/declarations/templates/instructions are absent. |
| Toolchain | Pinned workspace checks complete without new type suppression, TS2590, or OOM. |

Create `scripts/check-surface-architecture.mjs`, test it, and invoke it from normal repository validation. Use syntax-aware checks for aliased imports and context-sensitive component props. Legitimate command `run`, new form/detail `fields`, and unrelated provider `.list()` calls are not violations. Allow removed names only in negative-test literals and removal/history prose—not executable code, exports, generated templates, or current examples.

## 11. Execution and completion

| Step | Completion condition |
|---|---|
| Inventory/baseline | Every affected consumer group has an entry; current failures and one cold type-check baseline are recorded. |
| Contracts/compilers | Surface constructors, schema/compiler, labels, DisplayField, registries, and submit-presence types pass focused checks without old field imports. |
| Primitives/wrappers | One form session and one display implementation serve all wrappers; actual Vue binding/parity tests pass. |
| Operations/composites | Resource extraction, identity/access/cache effects, filters, nested inputs, and exports work on the new contracts. |
| Callers/tooling/removal | All modules, routes, adapters, generators, docs, and skills use the target shape; replaced implementations are deleted. |
| Integration | All gates below pass in a configured environment; no migration scaffolding remains. |

Use installed package-local tools and repository environment setup. Run:

```sh
node scripts/check-surface-architecture.mjs
pnpm --filter @southneuhof/loom type-check
pnpm --filter @southneuhof/framework-web type-check
pnpm --filter @southneuhof/loom test
pnpm --filter @southneuhof/loom test:browser
pnpm --filter @southneuhof/framework-web test
pnpm test:module-tooling
pnpm type-check
pnpm test
pnpm lint
pnpm build
pnpm --filter @southneuhof/framework-web test:e2e
```

Measure one cold baseline and one cold candidate for Loom/web type-checking using the same pinned toolchain, disabled incremental reuse, and checked scope. Record elapsed time, types/instantiations, checker memory, and peak process memory. Report unavailable metrics explicitly; do not infer improvements.

The implementation report records changed areas, removed APIs, executed commands/exit status, test results, baseline versus candidate failures, and measurements. Blocked checks are not passes. Completion requires a functioning new architecture with no executable old path.

## Technical references

These references explain language/tool constraints; the contracts above define Carta's target behavior.

- R1 — Vue binding order: `https://v3-migration.vuejs.org/breaking-changes/v-bind.html`
- R2 — Vue TypeScript/SFC prop conversion: `https://vuejs.org/guide/typescript/composition-api.html`
- R3 — Zod input/output and asynchronous parsing: `https://zod.dev/basics`
- R4 — TypeScript satisfies: `https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html`

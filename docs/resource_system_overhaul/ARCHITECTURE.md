# Carta surface architecture

Implementation specification for Loom, Carta web integration, application consumers, generators, tests, and agent instructions. Frontend baseline: `resource_system_overhaul`, commit `223fc622d9a897014fcbad48df838a19cec398db`.

Implement one coordinated frontend breaking change. Completion requires the replaced implementations and public paths to be absent. Preserve backend contracts, server authorization, transport envelopes, storage behavior, unrelated features, and dependency versions. The contracts below specify the required end state.

## 1. Target contract

| Public API | Owns | Consumer |
|---|---|---|
| `defineForm` | Input schema, selected inputs, labels, validators, optional submit function. | `Form`, `DialogForm` |
| `defineTable` | Record schema, selected columns, labels. | `Table`, `TreeTable` |
| `defineDetail` | Record schema, selected detail entries, labels. | `Detail` |
| `DisplayField` | Reusable read-only accessor, renderer, renderer props, format, label override. | Table columns and detail entries |
| `defineResource` | Operation binding, identity, access, cache invalidation, page composition. | `ListView`, `FormView`, `DetailView`; extracted primitives |
| `AssetAdapter` | App-scoped canonical asset reading, upload, and preview URLs. | Direct/managed asset inputs and asset-aware previews/display |

Components own their canonical props, supported native attributes, models, events, and defaults. Definitions compose those contracts; they do not introduce alternative component configuration. A valid authored prop bag has identical meaning in direct and managed usage.

Definitions are transparent, read-only objects. Mounted primitives own mutable state. Resources bind operations without interpreting fields. Vue object binding is the composition mechanism; no conversion call is required.

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
type DialogFormProps<
  I extends object,
  O extends object,
  R,
  K extends Extract<keyof I, string> = Extract<keyof I, string>,
> = FormProps<I, O, R, K> & DialogPresentationProps

type FormViewProps<
  I extends object,
  O extends object,
  R,
  K extends Extract<keyof I, string> = Extract<keyof I, string>,
> = {
  form: FormProps<I, O, R, K>
  title?: string
  description?: string
  backTo?: RouteLocationRaw
  defaultTo?: RouteLocationRaw | ((result: R) => RouteLocationRaw | undefined) | false
  afterSubmit?: (context: AfterSubmitContext<R>) => MaybePromise<void>
  successMessage?: string | false
}
```

`Form` and `DialogForm` consume flat Form props. DialogForm adds presentation and lifecycle without a nested `form` prop. `FormView.form`, `ListView.table`, and `DetailView.detail` are complete primitive prop bags. Page metadata stays outside them. No flat action-bag variants exist on views.

### 1.3 Authority and permitted derivation

| Concern | Sole owner |
|---|---|
| Accepted props, native forwarding, default values, model shape, local control validity | The component |
| Input keys, business validity, required-state metadata, explicit input-to-command transformation | The form schema |
| Draft tracking, managed model/validity bindings, validation scheduling, submission | Form |
| Asset interpretation, upload results, preview URL resolution | One application-configured AssetAdapter |
| Read-only value access and formatting | Explicit shared DisplayField definitions and the shared display runtime |
| Access checks, bound identity, invalidation | The resource operation |
| Page navigation and dialog lifecycle | Their respective wrappers |
| Collection query state | Controlled parent; Collection owns the uncontrolled case |
| HTTP query spelling, encoding, and response normalization | The existing frontend transport adapter |

Form derives requiredness from the schema and supplies the component's canonical `required` prop. It does not infer a renderer, synthesize enum choices, rename props, normalize sources, or coerce a component's model. Explicit schema transformations, display accessors/formats, the global asset service, and transport encoding retain their declared boundaries. Internal composables reuse mechanics without creating a second public contract.

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

Dictionaries contain labels only. They travel with definitions; no resource injection or implicit global property-name lookup supplies missing behavior. A label change cannot affect a renderer, format, requiredness, initial value, loader, or submitted value.

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
  props: {
    ...roleChoice,
    load: roles.list.table.load,
    namespace: roles.list.table.namespace,
    searchParameters: { active: true },
  },
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
const updateContactInputs = {
  email: {
    ...emailInput,
    props: { ...emailInput.props, readonly: true },
  },
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

`FormDefinition<TInput, TOutput, TResult = unknown, TKeys = Extract<keyof TInput, string>>` has required `schema` and `fields`, and optional `labels`, `validators`, and `submit`. Constrain `TKeys` to input string keys. Inputs and outputs are finite object contracts; selected keys remain known after construction. `submit` is `(output: TOutput) => MaybePromise<TResult>`.

`defineForm` infers input/output from the raw schema, selected keys from the field map, and result from the awaited handler return. Supplied submit remains required in the returned type; omitted submit remains absent (`submit?: never`). Preserve this refinement through composition and `v-bind`. An effective submit override determines the completion-result type.

After authoring checks, return the compact named contract, not the complete Zod implementation, validator tuple, or recursively retained configuration literal. Preserve field/component-prop correlations needed for reuse. Callback types cannot widen the schema's own input/output to make an incompatible configuration pass.

```ts
type FormDraft<I extends object> = {
  [K in keyof I]?: I[K] | null
}
```

FormDraft represents editing, not validated input. Undefined is unset; null is an explicit clear. Models, initial data, draft loaders, slot values, and behavior/validator snapshots use this contract. Preserve empty states unchanged; the original schema still rejects null when non-nullable. Nonempty incompatible values are not admitted by this allowance.

| Form-input member | Contract |
|---|---|
| `label` | Label override. |
| `renderer` | Required registered component key, including on shared fragments. |
| `props` | The selected component's canonical authored props and supported native attributes. |
| `span` | Managed input-grid span. |
| `initialValue` | Per-session zero-argument editable-value factory. |
| `behavior` | Reactive input behavior. |

`props` is required when the selected component has required authored props; it is optional when that contract has none. Preserve discriminated configurations, defaults, and model cardinality. There is no field-level `source` or separate `attrs` bag.

`behavior` supports `visible`, `disabled`, `props`, `presentation`, `derived`, and `resetWhen`. Its context is `{ draft, value, context }`, using detached read-only draft values. Retain dependency tracking, derived-value updates, and reset-on-identity-change behavior. `presentation` changes renderer, label, props, span, and the conditional `required` hint. A replacement renderer must accept the same editable value contract; its complete effective props must satisfy that component.

Fields are an ordered map of top-level schema input keys. A selected field has no second `key`; computed display keys are not form inputs. Composite inputs edit nested structures; issues retain nested paths. Reject numeric index-like keys, prototype-sensitive keys, reference arrays, unknown field keys, and a second selection list.

Field-level domain `validate`, `write`, and record `read` are absent. Schema/validators own domain rules, components own local validity, and the declared draft loader maps records to editable inputs.

### 3.2 Display, table, and detail types

`TableDefinition<TRecord>` contains required `schema`, required ordered `columns`, and optional `labels`. `DetailDefinition<TRecord>` contains required `schema`, required ordered `fields`, and optional `labels`. Their schema describes returned records, not query values or mutation inputs.

`TableColumn` extends `DisplayField` with `sortable`, `sortKey`, `align`, `class`, and `headerClass`. `DetailField` extends it with `emphasis` and `span`. Reject table-only members on details and input-only members on every display field. FormInput does not extend DisplayField. Renderer-authored props exclude runtime-owned value/model, record/draft, field identity, setter, and validity plumbing; the primitive supplies those members. Required component props remain required after those exclusions; component-defaulted props remain optional.

A record-key entry reads that property by default. An entry outside the record keys requires `read(record)`. A sortable entry with a custom accessor requires an explicit `sortKey`; a direct property column defaults to its property key. Validate `sortKey` against the record keys and the bound query contract. An accessor does not make client-side sorting authoritative for a server-paginated collection.

Every constructor checks named fragments and spreads, not only fresh literals. Type-check accessor records, accessor results, renderer value contracts, and renderer-specific props. Apply shape/configuration guards at runtime for JavaScript callers; static type information is not a runtime record validator.

### 3.3 Renderer registration and execution

Use `form` and `display` registries. Form registration maps keys to the actual public input components, lazily where appropriate. Derive built-in keys from one runtime roster and retain custom component type augmentation. Register TextInput itself, not an alternative CoreTextRenderer. No `adaptVModelInput`, `controlledInput`, or renderer-specific `value/setValue` protocol exists.

Form binds the component's Vue model and validity events directly:

```vue
<component
  :is="inputComponent"
  v-bind="field.props"
  :model-value="fieldValue"
  :required="resolvedRequired"
  :disabled="resolvedDisabled"
  @update:model-value="setFieldValue"
  @validation:touch="touchField"
  @validation:error="reportFieldError"
/>
```

Supply managed identity/error/accessibility props through that same component contract. Requiredness and other managed bindings are applied after authored props. Resolved disabled state combines Form disabled, field behavior disabled, and authored component disabled; an authored false cannot enable a parent-disabled field. Authored props cannot replace model updates, validity plumbing, managed requiredness, error state, or field identity. Slot `value`/`setValue` is the custom-input interaction context, not another component-renderer API.

Check compatibility from the component's accepted and emitted model types, including explicit modes such as `multi`, `asWhole`, and numeric constraints. Every nonempty emitted value must fit the schema input. Preserve canonical clear/unset values in FormDraft. Refine inaccurate component types at the component owner; no independent renderer-to-Zod-kind matrix determines compatibility.

Table, TreeTable, and Detail use one display registry and `DisplayValue`. `DisplayRendererComponents` is augmentable; registered components determine their valid value and prop contracts. Register a dual-use component separately for input and display without joining their field contracts.

The display pipeline is `record -> read/property -> format -> renderer -> surface layout`. Without a renderer, render a scalar as text and a nullish value as `-`. Dates require explicit formatting; structured values require an explicit displayable representation. Reject unknown renderer/formatter keys and invalid fallback values; never emit `[object Object]`. Runtime guards use available component contracts, not invented reconstructions of erased generics.

Accessors and formatters are pure. They do not modify records, invoke input hydration, submit, navigate, or load data. Asset-mode renderers delegate to asset-aware components using the service in section 4.4. Preserve sanitized/text-only HTML behavior.

Exports reuse visible columns, accessors, and formats without rendering Vue components. Retain export `mapValue`, exclusions, filenames, and pagination. Text captions reference the shared business catalog. Reaching the page-safety limit reports an incomplete-export error, not a successful truncated export.

### 3.4 Canonical props and native forwarding

Publish supported native attributes in each component's public contract. Use the relevant Vue native/ARIA types for value types and select only attributes that reach that component's actual native target. Component-specific props win type-name collisions. Finite supported keys have component-owned runtime declarations; type checking and runtime acceptance use the same owner. Shared element-level declarations serve only genuinely identical forwarding destinations. [R5]

For TextInput, publish typed `name`, `autocomplete`, `inputmode`, `maxlength`, `minlength`, `pattern`, `readonly`, `placeholder`, `title`, `tabindex`, `id`, and supported ARIA attributes. The bounded fallthrough family `data-${string}` accepts string/number/boolean/null/undefined. A selector does not inherit text-input-only attributes merely because TextInput supports them.

```ts
const emailProps = {
  type: 'email',
  autocomplete: 'email',
  maxlength: 254,
  'data-testid': 'email',
} as const

const emailInput = { renderer: 'text', props: emailProps } as const
```

```vue
<TextInput v-model="email" v-bind="emailProps" />
```

The same emailProps is valid inside defineForm. Derive renderer-authored props from the component contract minus Form-owned plumbing. Preserve requiredness, defaulted optionality, and configuration unions. Do not apply blanket `Partial`, arbitrary string-index extras, or an unknown-props fallback when extraction fails. Named objects and spreads receive the same checks as literals. Reject misspellings and unsupported props; supported native attributes are not arbitrary extras.

Wrapped controls use `inheritAttrs: false`. Class/style target the presentation wrapper; id/name/autocomplete/ARIA and other supported native control attributes reach the focusable element. Forward documented events once. Evaluate current bindings during component updates; additions/removals after mount must work. An initial vnode snapshot or cached attrs-only map cannot determine future forwarding.

Keep attributes in the flat component prop bag. No field `attrs`, `nativeProps`, Form-owned DOM allowlist, or prop-renaming layer exists.

### 3.5 Explicit loaders and component models

```ts
const statusSelectProps = {
  data: [
    { code: 'draft', caption: 'Draft' },
    { code: 'active', caption: 'Active' },
  ],
  pick: 'code',
  view: 'caption',
} as const

const roleSelectProps = {
  load: roles.list.table.load,
  namespace: roles.list.table.namespace,
  pick: 'id',
  view: 'name',
  searchParameters: { active: true },
} as const

const assignmentForm = defineForm({
  schema: assignmentSchema,
  fields: {
    status: { renderer: 'select', props: statusSelectProps },
    roleId: { renderer: 'select', props: roleSelectProps },
  },
  submit: assignRole,
})
```

```vue
<SelectInput v-model="roleId" v-bind="roleSelectProps" />
<Form v-bind="assignmentForm" />
<DialogForm v-bind="assignmentForm" title="Assign role" />
```

Loaders already satisfy the component's argument, result, and cancellation contracts. Pass cache namespace and contextual parameters explicitly where needed; a function reference does not implicitly provide sibling metadata. Inputs never inspect a resource, discover an action, unwrap an alternate response envelope, or convert `source` to props. Shared loading composables retain cancellation/loading/error mechanics behind the component API.

Static choices use each component's actual contract. SelectInput uses `data`/`pick`/`view`; its invalid `options: string[]` representation is rejected. Chip's canonical `options` remains valid. Rules are component-specific, not global property-name bans.

Form forwards model values unchanged. Built-in DateInput uses string/null/undefined; a Date input schema cannot bind directly to it. Format record dates explicitly in the draft loader and transform input strings explicitly in the form schema when the command requires another shape. Do not restore Form-only date buffers or move the converter to a renderer wrapper. Custom Date-model controls remain valid with compatible schemas. Component-internal widget handling is shared by direct and managed usage.

## 4. Schemas and value ownership

### 4.1 Compilation and validation

Accept raw schemas from the repository's installed Zod dialects. One internal compiler supplies parsing, finite input-key discovery, required-state metadata, and normalized issues. Primitives invoke it; constructors use its context-free checks. Resources never adapt schemas. Public pre-wrapped validation schemas and `fromZod` authoring are removed.

Form schemas expose discoverable finite object input and object output. Inspect supported object wrappers and input-side pipes; reject an undiscoverable input shape. Metadata inspection executes no defaults, refinements, or transformations. Parse asynchronously so async refinements work. Input and parsed-output types remain distinct. [R3]

Additional validators are descriptors `{ validate, triggers?, path? }`. Triggers are `blur` and `submit`, defaulting to submit. They run after a successful schema parse and return issues, not replacement data. The context is `{ data, draft, initial, context, field, signal }`: parsed output, read-only input snapshots, caller context, blur target, and cancellation signal. Thrown operational failures block submission and become visible operational issues.

### 4.2 Requiredness

The schema owns static requiredness. Form resolves that metadata and passes the result to the actual input's `required` prop, outer label, and accessible required state. Reject authored `props.required`, including reactive prop patches. `behavior.presentation.required` supplies an explicit conditional hint; schema validation remains authoritative.

Schema metadata does not choose an interaction. Every form input requires an authored renderer. Enum validity supplies no implicit choices or captions. Components own their own default props; Form installs no parallel component-default table or property-name behavior.

### 4.3 Drafts, defaults, and records

```text
record --explicit loader mapping--> editable input
editable input --schema parse--> submitted output
submitted output --submit function--> operation result
```

Draft models, initial data, input slots, and behavior use FormDraft<TInput>. A draft loader returns `FormDraft<TInput> | undefined`. It selects input properties explicitly; it does not invert schema transformations or cast a full record into an update draft. Unknown keys never enter the editable or submission candidate maps. Keep valid schema values intentionally provided without a rendered control. Bind contextual parent identities in command closures.

Initial precedence is `input factory < initialData < loaded draft < user edit`. An own property containing `undefined`, `null`, `false`, `0`, or `''` is explicit and suppresses a lower-precedence factory. Factories run per session; clone editable arrays, plain objects, and Dates while retaining immutable File/Blob values and opaque services. Schema defaults run during parsing, not UI initialization. Share a business constant when both schema and UI need it.

A controlled model is authoritative. Emit initialized values instead of mutating its supplied object. Form performs no generic input hydration or model conversion. Preserve canonical asset objects and selected records; the explicit form schema owns the users role-selection-to-ID transform. There is no universal ID serialization rule.

### 4.4 Global asset service

Configure asset infrastructure once through the existing application adapter installation. File/image inputs and previews consume it themselves, irrespective of Form. This domain service is not a field converter or generic prop adapter.

```ts
interface AssetValue {
  kind: 'file'
  id: string
  url: string
  name: string
  size?: number
  mimeType?: string
  updatedAt?: string
  metadata?: Record<string, unknown>
}

interface AssetAdapter {
  read(value: unknown): AssetValue | null
  preview(value: AssetValue): {
    imageURL: string
    thumbnailURL: string
  }
  upload: UploadOperation<AssetValue>
}

app.use(FrameworkPlugin, {
  adapters: { ...appAdapters, assets: assetAdapter },
  renderers: { display: appDisplayRenderers },
})
```

AssetValue preserves the existing StoredAsset fields; relocate the input-only type to the shared assets contract. `read` is synchronous, scalar, and idempotent on a canonical value. Components handle cardinality with that scalar reader. `upload` returns AssetValue directly and retains the existing signal/progress/destination context. `preview` resolves display URLs without rewriting models. [R6]

Install `assets` through FrameworkAdaptersInput and the app-scoped adapter provider. One `useAssetAdapter` consumer serves asset-aware components. No last-installed singleton, per-field service prop, nested override provider, or second assets plugin exists. Validate method presence at bootstrap. Asset-dependent usage without a service throws `ASSET_ADAPTER_REQUIRED`; unrelated components and explicit URL-only previews remain usable.

```ts
const attachmentInput = { renderer: 'file' } as const
const photoInput = { renderer: 'image' } as const
```

```vue
<FileInput v-model="document" />
<ImageInput v-model="photo" />
<FileComponent :asset="document" />
<ImagePreview :asset="photo" />
<ImagePreviewMulti :assets="photos" />
```

FileInput/ImageInput use the service at their own boundary, including upload and FileManager selection. Remove their per-instance `upload`, `toModel`, and `imageURLResolver` props. Keep component-owned accept/size/count/multi/destination configuration. No field author repeats asset adapters; app display renderers pass assets to preview components instead of importing the app adapter.

Undefined remains uninitialized, null cleared, and `[]` an empty multi-selection. A nonempty value rejected by `read` produces visible invalid-asset state and `validation:error`; it is not silently cleared, filtered from an array, or restored through `read(value) ?? value`. A structurally invalid adapter result throws `ASSET_ADAPTER_INVALID_RESULT`. Asset models do not accept guessed ID, URL-string, or File alternatives.

Reading an existing value or resolving a preview emits no model update. Accepted user selection/upload emits canonical assets once. Input shape, draft shape, stored payload, and previews share this interpretation. Form adds no second asset pass. Direct previews do not require a prior input mount.

Asset-mode previews use `asset`/`assets`. Existing URL modes remain explicit, mutually exclusive contracts: ImagePreview uses imageURL/thumbnailURL, ImagePreviewMulti uses images, and FileComponent uses its URL/file presentation props. Supplying both source modes fails. Asset callers select asset mode instead of manually unpacking URLs. Preserve safe URLs/links/iframes, loading/error/empty states, accessible titles, and preview disposal. Clear ImagePreviewMulti timers on unmount and handle empty arrays without modulo-zero navigation.

Disabled components start no user mutation through picker, drop, paste, delete, replace, reorder, camera, or asset-picker commit. Guard handlers as well as native controls. An upload accepted while enabled may finish after disabling only for its still-current component/target token. It cannot revive a removed row, replace a newer value, or emit after disposal. Release pending state once. Disabling/unmounting is not server rollback.

FileManager's collection provider remains distinct from the asset value/upload/preview service. Preserve its product operations and unrelated provider `operations.list()` APIs. Two Vue apps with different assets registrations must remain isolated.

## 5. Form and DialogForm runtime

### 5.1 Form props, state, and events

`FormProps<TInput, TOutput, TResult, TKeys>` extends the corresponding FormDefinition with `modelValue`, `initialData`, `load`, `id`, `resource`, `namespace`, `searchParameters`, `context`, `normalizeError`, `disabled`, `submitLabel`, and `submittingLabel`. Preserve selected-key and result typing. Native form attributes belong to the Form component contract.

A mounted Form requires a function-valued submit or a present controlled draft. A model-bound form can also submit. Enforce both valid binding states in compact public types and runtime guards. Detect current model-prop presence, including present undefined. DialogForm's open model does not satisfy the draft-model requirement.

The default model is the draft. Events are `update:modelValue`, `submitted(result)`, `error`, and `reset`. Expose read-only `draft`, `dirty`, `submitting`, `validating`, `inputPending`, plus `validate`, `submit`, `reset`, and `refresh`. `validate()` returns normalized issues and parsed output without dispatching a mutation. Definition bags contain no mutation listeners or slot registries.

Only Form calls `useFormSession`. Its private draft is the sole writable editing state. Route component model updates, slot setters, controlled replacements, derived writes, resets, and load merges through tracked transitions. Refs, slots, emitted models, validator/behavior contexts, and baseline snapshots must not alias writable internal data. Detach outward Dates; freezing a Date does not prevent its setters. Public draft mutation is a type error and cannot alter the private session.

Every accepted edit advances the revision, including a same-value update that clears an error. A controlled-model echo is not a second edit; an external replacement is authoritative. Identity, schema identity, and selected-input-key changes start new state and invalidate obsolete work. Label/layout/compatible prop changes preserve edits. Late loads update untouched keys only; derived behavior settles after baseline changes. Reset restores the loaded/initial baseline; refresh retains dirty edits; failed writes retain the draft.

Controls that retain invalid local text emit `validation:error(message)` without inventing a model value; `validation:error(undefined)` clears it. Every error event invalidates pending validation, even when its message is unchanged. Form associates it with the field automatically. Active control errors block validation regardless of candidate-key presence. Hidden controls follow the omission policy; showing them restores their current validity. No Form-owned conversion buffer stores the invalid text.

### 5.2 Submission

A Save intent supersedes pending blur validation: obsolete the blur attempt and validate the latest settled draft for submit. Retain one active submit intent; repeated Save activations do not dispatch additional writes. Default Save controls are disabled for explicit disabled state, initial loading, pending inputs, mutation, and submit validation, not for blur validation alone.

For each accepted attempt:

1. Enforce the blocking states above; settle behavior.
2. Capture session generation, draft revision, effective submit function, and attempt ownership.
3. Build a candidate from schema input keys. Omit hidden controls; retain intentional schema values without controls.
4. Check visible component errors before candidate membership. Parse the candidate once and run submit-trigger validators on parsed output.
5. Discard stale results. A changed draft, session, or submit function during asynchronous validation cancels dispatch; do not retarget a validated snapshot.
6. Recheck disabled/loading/pending state and invoke the captured handler exactly once. Never retry mutations automatically.
7. After fulfillment/rejection and in finally, update state, issues, toasts, and completion events only when the mutation still belongs to the active mounted session. An old finally cannot clear a newer operation's state.

The original resource operation still completes its post-write invalidation after the form session changes. Its stale result cannot navigate, close a new dialog, overwrite current errors, or emit normal completion into the new session. Unmounting does not assert cancellation of an already-dispatched server mutation.

Schema defaults/transforms can add output after candidate filtering. Visibility is not an output whitelist; schemas encode required output omission. Hidden-required failures surface at form level. Wrappers/resources never parse the output again; server validation is independent.

### 5.3 Slots and accessibility

Keep `input:<key>`, `loading`, `load-error`, and `actions` slots. Derive input-slot names from selected keys. For key K, value and setter use FormDraft<TInput>[K], including its clear/unset states; outward nested values and the draft are read-only/detached. Supply field identity/label, issue state, and disabled state. Do not erase the public slot contract to unknown.

```vue
<DialogForm v-bind="personForm">
  <template #input:age="{ value, setValue }">
    <NumberInput :model-value="value" @update:model-value="setValue" />
  </template>
</DialogForm>
```

For a numeric age schema, a string setter argument fails. Form, DialogForm, and FormView share the same slot/ref contract. Wrappers add only their presentation context.

Form owns labels, descriptions, issue focus, and a stable per-instance DOM ID prefix. Custom slots replace controls, not the editing runtime. Retain the managed grid and span; add no layout language.

### 5.4 DialogForm parity

DialogForm adds `open`, `title`, `description`, `closeOnSubmitted`, `beforeClose`, and `cancelLabel` to every Form prop. Its default model is the draft; `v-model:open` controls visibility. Without an open model, visibility starts closed and is locally owned.

Derive runtime prop coverage and public types from Form. Forward the current reactive Form subset on every update, including newly added/removed props. Track current presence separately from value; never manufacture modelValue: undefined for an absent model. Do not snapshot vnode presence at setup. Native attributes follow Form's canonical contract and reach the native form; class/style stay on the dialog root.

Forward Form events once, all slots, and the same read-only exposed state/methods. Add `update:open`, `open`, and `close` events; `trigger`, `title`, `description`, `header`, and `footer` slots; and `requestClose`/`checkingClose` on the ref. Augment actions-slot context with requestClose. No second session exists.

`closeOnSubmitted` defaults to true. Close on successful completion of the active session; validation/write failure keeps it open. User cancel/dismiss calls `beforeClose({ reason, dirty, submitting, validating })`. False/rejection prevents closing. Capture dialog generation, managed Form identity, and close ownership before awaiting; recheck generation, visibility, validation/submission, and ownership afterward. Ignore obsolete approvals/rejections and duplicate pending requests.

Disable conflicting default actions during the close decision. An imperative submit starting during the await prevents that close from succeeding. Successful active-session completion bypasses the cancel guard. A controlled parent's open=false is authoritative. Closing unmounts the editing session; reopening creates defaults and reloads, retaining only the draft the parent supplies.

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
    filters: usersFilterForm,
    export: usersExportOptions,
  },

  create: {
    permission: 'create-users',
    route: { name: 'settings-users-create' },
    title: 'Create user',
    form: createUserForm,
    backTo: { name: 'settings-users' },
    afterSubmit: handlePageCompletion,
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
| `delete.run(id)`: command without a surface | `resource.delete(binding)`: bound can/run/route handle |
| `actions`: named custom command declarations | Typed run/can/route commands with explicit withContext binding |

usersFilterForm is a submit-free query form; usersExportOptions and handlePageCompletion use the canonical View contracts. These values are module-authored configuration, not resource-specific variants.

Define View props once in `contracts/views.ts`. SFCs and resource declarations import them. Resource declarations add permission/visibility/typed-route metadata and replace identity-bound primitive bags with factories; they do not maintain a handwritten subset of page props. Forward filters, export, backTo, afterSubmit, and every other supported View member. Strip only declaration metadata and insert generated sibling defaults. Explicit supported values win over derived defaults; explicit false disables a default where its View contract supports false. Cache identity and guarded functions remain binder-owned.

Every standard operation declares `permission: string | null`; null removes only the permission-code requirement. Always evaluate access, including snapshot row-operation restrictions, with that nullable permission. Preserve custom permission arrays, visibility policies, typed routes, and route-access registration. Absent operations produce no result member. Commands retain run; form components do not accept it.

`binding = { id: TIdentity; record?: TIdentityRecord }`. Identity is required for detail/update/delete. The identity function declares the identity-bearing contract. Each display loader also satisfies its own record schema. Mutation results need identity, not display-only joins; preserve their operation-specific result types.

Before factories or closures capture a binding, validate and copy scalar/composite identity into binder-owned immutable data. Detach the complete supplied record/policy context and verify its identity matches. Use the same identity snapshot for loading, mutation, checking, and cache keys. Caller mutation cannot redirect a handle. New row metadata requires a fresh binding; it is not supplied by mutating a retained object.

Bound return types retain required loader/submit members; extraction needs no non-null assertion. Expose `key`, the declared `permissions` map, and `invalidate({ id? })`. Preserve scalar/composite identities and canonical key encoding. Factories are pure, synchronous, and do not load data.

### 6.2 Binding responsibilities

Resource binding owns operation compatibility, access, identity, cache namespaces, mutation invalidation, and sibling page actions/navigation targets. It does not inspect fields, labels, schema metadata, renderers, or asset services.

Reject conflicting loader-context identity. Re-evaluate current permissions, visibility, and the bound snapshot's row policy each time an operation executes. Preserve the access adapter's distinction between absent and malformed explicit row metadata; malformed restrictions cannot silently grant access. Backend authorization checks current server state. Capture the executing app runtime across async work; definitions remain importable before plugin installation. Do not memoize unbounded identity histories.

Wrap the effective submit function once, including a definition's default, without mutating it. Validate successful create/update result identity at this boundary, independently of routes; update results must identify the captured target. Keep the original valid result unchanged. Invalidate collections and affected record/draft caches once. Draft loads use operation-specific namespaces and never populate raw record caches.

A malformed successful result is `RESOURCE_RESULT_INVALID`, a non-retryable post-write protocol failure. Invalidate the known update target and collections; invalidate the whole resource when create identity is unavailable. Explain that the operation may have completed. Do not fabricate identity, retry, claim rollback, navigate, or emit normal Form success. Cache invalidation failure after a successful write is likewise a post-write failure, not rejected validation/permission. Stale form sessions do not stop the operation's invalidation.

Extracted `resource.create.form.submit` and `resource.list.table.load` retain these guards and cache effects. Their functions contain no navigation, dialog closing, or page-toast policy. Replacing a bound function is an explicit new operation; the caller owns its policy.

### 6.3 Commands and delete handles

For a resource declaring delete and a reject command:

```ts
const deletion = resource.delete({ id: record.id, record })
if (deletion.can()) await deletion.run()

const command = resource.actions.reject
await command.run(payload)

const rowCommand = command.withContext({ record })
if (rowCommand.can(payload)) await rowCommand.run(payload)
```

Delete retains a bound can/run/route handle; run targets the captured identity. Custom run/can accept exactly the business argument tuple. `withContext` is a pure binder returning the same command capabilities. Rebinding replaces context, not layers it, and applies identity/record snapshot rules. A record-dependent visibility policy explicitly denies absent record context; context-free commands remain callable without it.

Permission callbacks and run receive identical business arguments. Payloads containing record, default/rest/optional parameters, and zero-argument commands remain ordinary input. There is no Function.length inspection, trailer detection, inferred payload context, or extra framework argument on run. Runtime authorization is rechecked even when can previously succeeded.

Form context is explicit caller data. Resources do not inject context.operation or context.permission. Bind parent IDs and workflow data deliberately; a query parameter never grants authority.

### 6.4 Navigation and transport

FormView handles successful completion through `afterSubmit({ result, defaultTo, navigate, preventDefaultNavigation })`, then applies default navigation unless prevented. `defaultTo: false` disables it. Post-submit callback/navigation failures do not repeat the write or become form validation failures.

Derive create/update destinations from the declared detail route, then list route. Explicit operation navigation overrides derivation. Detail back navigation defaults to its sibling list route. Preserve typed route names/parameters and the page leave guard.

Module `.schema.ts` files export raw record/query/create/update schemas. Remove application `defineSchema`, Loom `WebResourceSchema`, and UI-wide derived aliases. Keep endpoint types in Hono/SDK adapters; check form output when assigning submit, record types when assigning loaders, and identity during composition. Do not change backend contracts to satisfy a UI abstraction.

## 7. Collections, views, and composite inputs

### 7.1 Table, TreeTable, Detail, and page views

TableProps extends TableDefinition with collection/query, identity/reorder, column sizing/visibility, and preference controls. DetailProps adds record-load controls. Exactly one data or load supplies each primitive; typed states and runtime presence checks enforce that boundary. Controlled empty values remain valid. Schema describes records; rendering does not parse or transform loaded records.

Table owns one Collection/query lifecycle; TableContent presents loaded rows. TreeTable preserves hierarchy, children/treeColumn, expansion, and row metadata. Its default indentation column renders DisplayValue inside the tree wrapper using original-record context. Do not interpolate away a renderer or apply read/format twice. Explicit cell slots remain deliberate overrides.

ListView accepts the complete table bag, filters, export, and canonical page actions. Parent table.query owns controlled values; forward it without a writable shadow copy and emit update:query once. Without a controlled query, Collection owns namespaced query and URL synchronization. ListView reads the exposed/slot query and calls updateQuery/replaceQuery for toolbar requests. Table does not emit again when the underlying Collection already emits. Exposed query values have the same shape through both refs.

```vue
<ListView
  :table="{ ...users.list.table, query }"
  @update:query="query = $event"
/>
```

Observe current query-prop presence and namespace changes, not initial mode snapshots. Never mutate the parent query. Parent replacements and browser-back navigation update filters/toolbars without echo loops. Custom collection slots, exports, sort/search/page controls, and the default table use the same query owner. Standalone Table retains v-model:query.

Extracting list.table retains columns, query settings, loader, and cache/access effects, not page headings, filters, export buttons, or page action menus. FormView and DetailView render their complete nested primitive bags without another load, schema compiler, or session.

FormView reads submitLabel/submittingLabel from form and forwards the standard actions slot with its Form context. Its default actions add page navigation controls. Outer action-label props and form-actions aliases are absent. Preserve afterSubmit, leave guards, navigation, and success policy at the page owner.

### 7.2 Filters

`ListView.filters` consumes a submit-free FormDefinition whose parsed output is a partial query. ListView owns the controlled filter draft and calls Form's `validate()`. This slot rejects a supplied submit function; it is not a mutation editor.

Synchronize the filter draft on authoritative query replacement and browser-back navigation, cancelling stale validation. Commit only the latest successful parsed result to filter-owned query keys, reset pagination once, and remove cleared keys. Invalid/stale results trigger no load. Keep search/sort/page controls separate unless explicitly included. Filter defaults do not inherit editor behavior by property name.

### 7.3 TableInput

```vue
<TableInput
  v-model="rows"
  :table="rowTable"
  :form="rowForm"
  :to-draft="rowToDraft"
/>
```

Editable mode requires separate table/form definitions and `toDraft(row): FormDraft<TRowInput>`. The form schema output is the stored row type. For identical shapes, explicitly use `row => row`; the session clones editable values. Construct the reusable row definition without submit.

TableInput owns row data and commit functions. Its table rejects data/load bindings; its form rejects submit/load/model bindings. Express the submit-free form slot as FormDefinition with `submit?: never`, not a second definition API. Reject conflicts rather than silently executing/replacing a supplied business mutation.

Add/edit mount flat DialogForm with the row definition, mapped initial data for edit, and the locally supplied insert/replace submit function. A row form remains independently usable in another dialog. Read-only mode requires only table/model and prohibits editor members. Preserve disabled behavior, stable row identity, and reorder events.

### 7.4 Lookup, option, and location inputs

LookupInput owns result loading/selection and supplies controlled rows to its independent table definition. That definition cannot install another loader. Scalar label hydration uses explicit loadDetail and preserves the selected identity; it is component-owned data loading, not model-shape conversion.

```ts
const roleLookupInput = {
  renderer: 'lookup',
  props: {
    table: roleLookupTable,
    ...roleChoice,
    load: roles.list.table.load,
    namespace: roles.list.table.namespace,
    loadDetail: (context: RecordLoadContext<string> & { id: string }) =>
      roles.detail({ id: context.id }).detail.load(context),
  },
} as const
```

Track committed-value hydration separately from staged user edits. A response may enrich an unchanged committed selection but cannot overwrite staging edited after the request began. Parent replacements, clearing, stage edits, close/reopen, and disposal obsolete relevant work. Late hydration of A cannot replace chosen B.

Option components consume their own load/data/pick/view/namespace/searchParameters props and preserve cancellation and multi-selection contracts. No field source, resource introspection, inferred lookup columns, or response-shape guessing remains.

Dependent draft values use Form's derived behavior; command conversion uses its schema. Lookup cross-form setters and field-mapping transform shortcuts are absent.

LocationInput uses a raw input schema and a model-bound normal Form definition with explicit renderers. Retain component-owned location operations/coordinate behavior; stale geolocation/error callbacks cannot alter cancelled, disposed, or replaced state. Asset/file/image inputs use section 4.4's global service and pending-input ownership.

### 7.5 Frontend transport query boundary

The canonical Collection query remains page/limit/search/sort_by/sort plus endpoint-specific filters. One module-authored raw query schema defines it; shared pagination/search/direction fields are ordinary schema fragments.

```ts
const api = createHonoResourceActions(rpc.users, {
  querySchema: usersQuerySchema,
})

export const usersActions = {
  list: api.list,
  detail: api.detail,
  create: api.create,
  update: api.update,
}
```

The existing Hono factory requires that frontend querySchema and parses asynchronously once per list call, including direct option-loader usage. Its private encoder maps sort_by to wire sort and directional sort to wire order, then uses the existing HTTP serializer. Check encoded keys/types against the endpoint contract. Do not expose another query constructor or frontend wire mode.

Parse the authored query; merge searchParameters with parsed query values winning on explicitly present keys; encode reserved sort members; serialize. Do not mutate inputs. Preserve false/zero, existing empty-value omission, arrays/objects, signal identity, contextual filters, and response envelopes. Invalid query values prevent HTTP dispatch. Never feed wire spellings back into Collection.

Standard Hono resource bags bind load directly and do not also install the same querySchema on Table. The adapter is their sole list-query parse owner. Standalone Table retains querySchema for loaders whose query validation Table explicitly owns; no loader-introspection marker selects a mode. Form schema parsing, filter parsing, and transport query validation remain distinct declared boundaries.

Remove module-local sort conversion, duplicate wire-query schemas, and checkedHonoQuerySchema after migrating its callers. Retain endpoint-specific allowed sort keys and filters. A genuinely different endpoint protocol keeps its explicitly named transport implementation; there is no automatic protocol detection. Backend request contracts stay unchanged.

## 8. Implementation ownership

| Target | Responsibility |
|---|---|
| `packages/loom/src/contracts/{forms,tables,details,display,labels,views}.ts` | Canonical public contracts, FormDraft, typed slots/refs, complete View props; shared DisplayField. |
| `packages/loom/src/contracts/schema.ts` | Compact raw-schema input/output boundary. |
| `packages/loom/src/forms/{defineForm,compileForm,useFormSession,behavior,props}.ts` | Transparent construction, form checks, tracked session, schema-required hints, complete runtime prop coverage. |
| `packages/loom/src/components/inputs/**` and composite-input contract owners | Actual component props/native targets/defaults/models/validity; no parallel Form contract. |
| `packages/loom/src/schemas/compileSchema.ts` | Installed Zod dialects, finite input metadata, parsing, normalized issues; no UI synthesis. |
| `packages/loom/src/labels/resolveLabel.ts` | Explicit label precedence. |
| `packages/loom/src/display/{resolveDisplay.ts,DisplayValue.vue,requirements.ts}` | Shared pure display resolution, rendering, and checker policy. |
| `packages/loom/src/tables/defineTable.ts`, `details/defineDetail.ts` | Surface authoring checks using private shared display compatibility. |
| `packages/loom/src/renderers/{registry,form,formContracts,displayContracts}.ts` | Actual component registration and component-derived types; no converter registry. |
| `packages/loom/src/assets/{contracts,provider,index}.ts` | Canonical AssetValue and one app-scoped service consumer. |
| `packages/loom/src/adapters/{projectAdapters,plugin}.ts` | Existing adapter installation, including assets. |
| `packages/loom/src/resources/{defineResource,bindResource,operations,identity,runtime}.ts` | Complete page binding, immutable identities, explicit command context, operation policies. |
| `apps/web/src/configs/{labels,input-presets,display-presets,statuses}.ts` | Explicit reusable labels, canonical input/display props, business catalogs. |
| `apps/web/src/framework/adapters/assets.ts` | Single app asset read/upload/preview implementation. |
| `apps/web/src/framework/display/renderers.ts` | Display registration delegating asset values to asset-aware components. |
| `apps/web/src/framework/hono/{actions,contracts,collectionQuery}.ts` | Existing transport factory, common query-schema fields, private HTTP encoding. |

Keep shared internals only where they own real mechanics. Delete old copies after relocation. Remove Loom fields/, validation wrappers, actionResource.ts, controlValues.ts, renderers/inputProps.ts, and app framework/fields/ and framework/inputs/registry.ts. Resources depend on operation services, not fields or asset hydration. Primitives consume component registries and domain services directly.

Small modules keep labels, fragments, surfaces, and resource composition together in .resource.ts; schemas stay in .schema.ts, transport calls in .actions.ts. Shared business catalogs stay with their business owner. Do not create one file per definition or a generic workflow/conversion engine. General resource-runtime multi-app/SSR redesign is outside this scope; app-level asset isolation is required.

## 9. Blast radius and removal

### 9.1 Required migration inventory

Inventory imports/re-exports, caller aliases, templates, generated code, fixtures, and agent pointers before changing an owner. The following groups are mandatory; discovered dependent callers are equally in scope.

| Area | Source targets and required work |
|---|---|
| Public types/exports | Loom contracts, root/subpath barrels, renderer/resource exports, public API tests. Publish component-native contracts, FormDraft, AssetValue, and View types; remove proof/legacy exports. |
| Form/schema runtime | forms/{defineForm,compileForm,useFormSession,behavior,props,controlValues}.ts, schemas/compileSchema.ts, old fields/validation paths. Remove inference/converters; implement tracked transitions and component-validity events. |
| Actual controls | TextInput, NumberInput, DateInput, SelectInput, RadioGroupInput, CheckboxGroupInput, CheckboxInput, PasswordInput, YearInput and all registered controls. Publish required/defaulted props, supported native targets, mode-specific models, validity/events; preserve direct usage. |
| Primitives/query | components/core/{Form,Table,TableContent,TreeTable,Detail,Collection}.vue, useCoreData.ts, useFormInputState.ts, useTablePreferences.ts, query/useNamespacedQuery.ts. Fix model/session/query ownership and shared tree rendering. |
| Wrappers/views | DialogForm; FormView/ListView/DetailView and FormView.types.ts. Canonical View/Form types, current presence forwarding, typed slots/refs, inherited actions, session-bound completion/closing. |
| Composite inputs | TableInput/tableInput.types.ts, LookupInput/lookupInput.types.ts, LocationInput/MultiLocationInput. Direct loader props, explicit row mapping, staging generations, no source/field-writer paths. |
| Asset input/value | inputs/{assetValue,optionalAssetProvider,useUploadMutation}.ts; FileInput/ImageInput/CameraInput. Shared AssetValue, injected assets, invalid/empty handling, disabled entrypoints, accepted-upload tokens. |
| Asset previews | FileComponent; ImagePreview/ImagePreviewMulti; lightboxes/iframe/list preview callers; app display renderers. Explicit asset mode, global preview service, safe URL mode, timers/disposal, no app-adapter imports per consumer. |
| FileManager integrations | file-manager/**, AssetPicker/provider, composites/form-inputs/FileManager/**. Route asset ingestion/preview through the service; preserve collection provider/product operations. |
| Resource operations | resources/{defineResource,bindResource,operations,identity,runtime,routeAccess,index}.ts. Immutable context/identity, null-permission row checks, explicit withContext, complete View props, post-write result checks, dead-alias removal. |
| Plugin/bootstrap | adapters/{plugin,projectAdapters}.ts, renderer registry/inputProps, app main.ts and framework/adapters/bundle.ts. Install assets once, remove inputProps/default injections, retain existing runtime services. |
| Export pipeline | services/{export,excel}.ts and tests. Shared accessor/format, explicit textual maps, query ownership, incomplete-export error at safety limit. |
| App defaults/display | configs/{defaults,labels,input-presets,display-presets,statuses}.ts and framework/fields/display owners. Explicit native props/loaders/renderers; shared timestamps/statuses/relations; no implicit object rendering or property-name behavior. |
| App transport/types | framework/schema.ts, framework/hono/{actions,contracts,index,collectionQuery}.ts, framework/inputs/registry.ts. Remove aggregate UI schema/adapter paths, consolidate query encoding/parse ownership, preserve endpoint inference. |
| Settings modules | Users, roles, permissions, roles/[roleId]/detail/permissions/role-permissions, users/[userId]/detail/role-assignments: all schema/action/resource/route files. Preserve current membership, permissions, parent filters, and named set commands; migrate command context and input models. |
| App regression consumers | framework/acceptance/QueryOwnershipFixture.*, asset-form/route-schema/identity type fixtures, router guards/nested-navigation/query tests, browser/E2E routes, generated route contracts. |
| Generators/checkers | scripts/{scaffold-bounded-module,module-ui-check,check-surface-architecture,verify-module,integrate-bounded-module,module-evidence}.mjs, test-support/bounded-fixture.mjs, manifest parsing, generator/module/skill/Python tests. Emit only target contracts. |
| Agent/documentation entrypoints | Root README.md/AGENTS.md/DESIGN.md; Loom/web READMEs; architecture/UI forms/collections docs; asset/custom-field/file-manager guides. Remove conflicting examples and implicit-context promises. |
| Skills | build-resource-form, web-ui-surfaces, migrate-web-resource, implement-schema-first-zod, carta-module-{design,plan,development}, verify-carta-module; nested frontend-field-contract.md/web-query-cache.md and scripts/tests. Compile canonical examples and follow active pointers. |
| Verification/CI | Loom/web TS and Vue fixtures, effective strict configs, vitest.browser.config.ts include list, package scripts, .github/workflows/web-validation.yml and related path triggers. Explicitly run framework unit/browser and tooling suites. |

Generated modules contain raw operation schemas, explicit input renderers, canonical data/load/pick/view/loadDetail props, global-service file fields, shared display fragments, complete one-object resources, static list/create bags, and identity-bound detail/update pages. Emit one frontend query schema and the Hono factory binding, not local wire converters.

An update-only module loads its draft inside update.form through the endpoint adapter; it does not fabricate a visible detail operation or a flat page loader. TableInput always supplies separate table/form plus toDraft and a submit-free row form. Context is explicit; no generated code assumes reserved operation/permission injection.

Use actual generated output and a small set of compiled canonical examples for documentation. Static checks resolve fragments/spreads and share display requirements with the runtime; do not add a documentation interpreter. Preserve backend schema metadata separately from UI fragments.

### 9.2 Delete replaced paths

| Remove | Required replacement |
|---|---|
| defineFields, universal FieldDefinition/FieldCatalog/FieldsInput/ResolvedField | Independent surface definitions and resolved surface types. |
| FieldReference/FieldOverride, hidden symbols, field override methods | Ordinary reusable objects and spread. |
| Universal projections/FieldLayer, resolveFields/toCatalog/readField/readFields | Form configuration checks and pure shared display resolution. |
| Two-argument defineResource, standard operations under actions, list()/create() surface factories | Complete one-object resources with static list/create bags. |
| Form/DialogForm run, structural action submit targets, nested form prop | Flat canonical Form props and function-valued submit. |
| Flat action View bags, formProps, outer form-action labels, form-actions | Nested complete primitive bags; Form-owned labels/actions slot. |
| Table.fields and shared TableInput/LookupInput fields | Columns and independent row/lookup definitions. |
| Field source and source normalizers | Canonical component props.load/loadDetail/data/namespace. |
| inferredRenderers, enum-choice synthesis, renderer-to-schema-kind tables | Required explicit renderer and component-derived model/prop checks. |
| InputPropsRegistry/InputPropsAdapter, createInputPropsRegistry, adapter injection/defaults/hydration, FrameworkPlugin.inputProps, appInputProps | Component-owned contracts/defaults/validity plus the named app assets service. |
| adaptVModelInput, controlledInput, CoreTextRenderer, Form-only controlValues/date conversion | Actual component registration and direct Vue models. |
| Blanket Partial prop types, arbitrary extra-prop indexes, Form-native allowlists | Component-owned required/defaulted props and typed native forwarding. |
| Per-instance asset upload/toModel/imageURLResolver, input-only asset alias | Global assets service and shared AssetValue; explicit asset preview props. |
| Mixed field defaults, field-default injection/caches, table/detail registry duplication | Explicit catalogs/fragments and one display registry. |
| Public fromZod/pre-wrapped schemas, defineSchema/WebResourceSchema UI aggregate | Raw operation schemas and compact direct compatibility checks. |
| Form field read/write/domain validate, lookup cross-form setters | Explicit draft mapping, schema rules, component validity, derived behavior. |
| Resource-renderer hydration | Transport-owned read models; component-owned asset interpretation. |
| Command arity/trailing-context inference, splitCustomContext | Explicit withContext; unchanged business run/can tuple. |
| Dead checkIdentityDeclaration helpers and identical operation-runtime aliases | One identity-value validator and existing resource runtime. |
| Module-local sort encoders, duplicate wire schemas, checkedHonoQuerySchema | One querySchema-bound Hono list adapter. |
| Public construction guards/intermediate proof types | Private checks and compact useful public contracts. |

No compatibility aliases, old-signature overloads, dual-shape fallbacks, feature flags, dead implementations, or parallel legacy/v2 directories remain. Correctness cannot depend on old implementations hidden behind renamed constructors. Historical prose stays outside active agent discovery; executable old code is deleted.

Removal checks are syntax-aware. Legitimate Chip options, provider operations.list(), new form/detail fields, CSS source properties, typed native attributes, command run, explicit schema/display behavior, global asset methods, and transport encoding are not violations. Removed names are allowed only in negative-test literals and historical/removal prose, never current examples or executable exemptions.

## 10. Type and runtime verification

### 10.1 Type boundaries

Infer schema input/output and display records before checking consumers. Callbacks/loaders cannot widen those authorities. Preserve selected keys, field/component correlations, accessor results, required submit/load presence, command argument tuples, and effective submit-result overrides. Export compact named contracts instead of complete schema/resource implementation graphs; keep construction guards private.

Check whole value/identity unions non-distributively. Check all action-map members and reject any invalid key; reject reserved names whenever their intersection with present names is nonempty. A valid string branch cannot hide an object branch from a string-only renderer. Preserve intentional nullish/empty handling at its owning contract, not by dropping incompatible nonempty union members. Table/detail share the same private compatibility checks.

Use generic Vue SFCs with compact imported props/slots/ref types. Keep expensive authoring checks outside whole-SFC-props conversion. [R2] No public any facade, bivariant callback escape, blanket extras, @ts-ignore, @vue-ignore, or TS2590 suppression is permitted. Component-contract extraction failure is not a reason to accept unknown configuration.

Enable checkUnknownProps and strictTemplates in effective Loom/web configs. Put TS/Vue fixtures under included __type-tests__; verify with the pinned vue-tsc. Required positives cover section 1, submit-free/model-only forms, result-changing overrides, required/defaulted/native props, numeric selections, typed slots, shared accessors, explicit dates, global assets, and minimal mutation identities without joins.

Negatives mix valid and invalid union/action members and also include valid controls. Reject incompatible models/handlers/accessors, unknown/misspelled props, missing component-required props, field source, missing renderer, select options, wrong input-slot names/setters, managed-prop overrides, old bags, and composite-owned binding conflicts. Runtime absence checks prove only runtime export removal; type-only exports require compiler assertions.

### 10.2 Runtime diagnostics

Run configuration guards in production with component/surface, field key when applicable, invalid member, and expected contract. Retain stable codes: FORM_SCHEMA_REQUIRED, FORM_SCHEMA_INPUT_UNSUPPORTED, FORM_BINDING_REQUIRED, FORM_FIELD_UNKNOWN, SURFACE_OPTION_INVALID, INPUT_RENDERER_REQUIRED, RENDERER_NOT_REGISTERED, DISPLAY_VALUE_INVALID, SURFACE_DATA_SOURCE_INVALID, RESOURCE_IDENTITY_INVALID, and COMPOSITE_BINDING_CONFLICT. Add RESOURCE_RESULT_INVALID, ASSET_ADAPTER_REQUIRED, and ASSET_ADAPTER_INVALID_RESULT at their declared boundaries.

Reject removed top-level attributes before fallthrough. Required props and supported native keys are checked at the component owner, not an alternate Form list. Erased static proofs are not runtime record validators. Distinguish configuration errors, user/schema/control issues, loader failures, and post-write failures; only the originating active session presents its operational result.

### 10.3 Decisive integration tests

Register real browser fixtures in Loom's explicit include list. Bind one definition containing submit, labels, a fresh mutable default, a dependent input, an async validator, and a non-idempotent schema transform through Form, DialogForm, FormView, and extracted resource forms. Repeat with equivalent plain configuration. Assert one session per mounted editor, identical form behavior, one transform per validation attempt, one effective handler per accepted submit, and correct shell-specific completion.

Use actual TextInput/SelectInput/DateInput/file controls. Custom-slot spans prove slots, not built-in controls. Test a canonical select prop bag unchanged standalone/in Form/in DialogForm, and reject missing-renderer/enum-inference paths. Verify native attributes on the actual element, including additions/removals after mount. Override submit after v-bind and assert the original is never called.

Display parity uses section 2.6's joined-role fixture plus status/date/asset fragments. Place a renderer on TreeTable's indentation column itself. Compare Table, TreeTable, Detail, and extracted bags; assert one accessor/format pass, no per-cell network work or record mutation, and correct export text. Asset parity installs one global adapter and covers direct/managed inputs and independent previews.

| Gate | Required counterexamples |
|---|---|
| Draft isolation | Root/nested/array/Date outward mutation cannot change private draft/baseline or another dialog; canonical null/undefined remain preserved. |
| Input validity | Invalid local text blocks even with no candidate key; repeated/same-value validity changes cancel stale validation; hide/show retains the omission policy. |
| Save ownership | Real focus/blur/click with deferred blur preserves one Save intent; repeated Save writes once; changed draft/handler cancels dispatch. |
| Mutation lifecycle | A success/error/finally after switching A to B cannot affect B; A's resource invalidation still completes. |
| Initial/load state | Owned empty values win; late loads retain edits; reset/refresh/schema/identity/derived behavior follow their owners. |
| Wrapper parity | Every current Form prop/model presence/event/slot/ref survives all wrappers; standard labels/actions remain intact. |
| Close/staging | Deferred close approval cannot close a reopened/busy session; lookup hydration of A cannot replace staged B. |
| Component truth | Required/defaulted/native props and complete model unions work directly and managed; requiredness reaches the component; no Form conversion is needed. |
| Assets | One bootstrap service; app isolation; missing-service error; exact null/invalid handling; disabled handlers; accepted-upload token; previews never mutate models. |
| Identity/access | Caller mutation cannot retarget scalar/composite bindings; null permission still checks rows; denied operations dispatch nothing. |
| Commands/results | Default/rest/record-bearing payloads remain intact; withContext is separate; malformed successful identities cause post-write invalidation/error without retry. |
| Page/query | Complete resource View props survive; parent query replacement/browser-back/filter reset produce one event/load; namespaces and uncontrolled state remain isolated. |
| Display/export | Shared names/renderers/formats work in the tree column and exports; safety-limit termination reports incompleteness. |
| Composite/value | Row form/data ownership, mandatory toDraft, LocationInput cancellation, selections, assets, and explicit date/schema transforms remain correct. |
| Types | Mixed-invalid unions/maps fail; positive controls compile; slots are key-specific; compact returns retain default-submit/result inference. |
| Transport | Exact existing wire requests, signal identity, endpoint sort restrictions, one query parse; direct loader extraction cannot bypass validation. |
| Generation/guidance | Fresh generated modules and canonical doc examples compile without casts, hidden context, field source, or asset prop wiring. |

Test installed Zod wrapper/input-discovery edge cases without running defaults/transforms during metadata inspection. Report previously unverified integration behavior as observed outcomes, not assumed passes. Keep service/network mocks at boundaries; do not mock the compiler, control, or state transition being proved. Avoid sleeps, tautological type-export checks, unrelated property-order assertions, and whole-implementation snapshots. Field/column order remains a real contract.

Extend the existing check-surface-architecture script to cover section 9 through aliases, generated templates, and active examples. Verify test discovery and include positive syntax cases. A removal allowlist cannot exempt executable old paths.

### 10.4 CI and active examples

The web workflow explicitly runs Loom unit tests, web unit tests, module-tooling, architecture checks, Loom browser parity, and both package type checks. Dependency build tasks do not substitute for tests. Path triggers include framework/app code, generator/checker/test-support and skill scripts, root/current architecture/UI docs, package/lock/config, and workflow files. Loom-only and generator-only changes run their suites.

Keep a small compiled example set: canonical direct/managed select, default/overridden submit, global file/preview, shared relation display, row editor, complete resource extraction, and controlled query. Generator tests compile actual emitted code. Active docs/skills point to those examples and publish the same contracts. Keep historical execution records separate from current instructions.

## 11. Execution and completion

| Sequence | Completion condition |
|---|---|
| Inventory and regressions | Every affected owner/caller is recorded; baseline behavior and red counterexamples distinguish failures from missing infrastructure. |
| Session ownership | Tracked private state, transient FormDraft, component validity, Save precedence, and session-bound completion work. |
| Global assets | One app service serves direct/managed inputs and previews before generic asset wiring is deleted. |
| Canonical components | Explicit renderers/native props/direct loaders/models/requiredness work; generic source/prop/value adapters are absent. |
| Operations and wrappers | Snapshot identities, explicit command context, complete View props, live forwarding/query/display/close/staging behavior pass. |
| Types and transport | Whole-union guards, typed slots, compact returns, and the single Hono query boundary pass real consumer checks. |
| Tooling and removal | All application callers, generated code, active guidance, exports, and CI use the target; no executable legacy path remains. |
| Integration | All required gates have executed evidence in the configured environment. |

Use installed package-local tools and existing environment setup. Preserve unrelated work; do not upgrade dependencies or redesign backend behavior to satisfy a frontend abstraction. Run:

```sh
pnpm test:surface-architecture
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
pnpm module:preflight
pnpm --filter @southneuhof/framework-web test:e2e
```

Before narrowing public types, record one cold baseline; run one comparable candidate afterward with the same pinned toolchain, generated route state, checked scope, incremental reuse disabled, and resource limits. Capture elapsed time, types/instantiations, checker memory, peak RSS, and exit status. Record unavailable metrics without inferring improvements.

The implementation evidence ledger connects every requirement and audit finding to its production owner, regression fixture, command, and outcome. Record versions, passed/skipped counts, baseline versus candidate failures, and blocked prerequisites. Setup-script probes and extracted guard tests are not pinned Vue/browser evidence. A blocked check is not a pass.

Completion requires a functioning canonical frontend architecture, verified direct/wrapper parity, app-wide asset behavior, and absence of replaced executable paths. No approval follows solely from compiling successfully.

## Technical references

These references explain language/tool constraints; the contracts above define Carta's target behavior.

- R1 — Vue binding order: `https://v3-migration.vuejs.org/breaking-changes/v-bind.html`
- R2 — Vue TypeScript/SFC prop conversion: `https://vuejs.org/guide/typescript/composition-api.html`
- R3 — Zod input/output and asynchronous parsing: `https://zod.dev/basics`
- R4 — TypeScript satisfies: `https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html`
- R5 — Vue attribute forwarding: `https://vuejs.org/guide/components/attrs`
- R6 — Vue app-level dependency provision: `https://vuejs.org/guide/components/provide-inject`

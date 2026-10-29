# Forms

Read this file for form schemas, input maps, defaults, labels, and custom
actions. Read [DESIGN.md](../../DESIGN.md#actions-and-forms) before selecting
the form surface or action placement.

## Form definition

Use a raw input schema with `defineForm`. Keep the selected inputs in that
form's own ordered `fields` map. Use schema keys for direct fields and explicit
bindings for controls that edit several keys. A display map does not configure
form inputs.

```ts
const createUserForm = defineForm({
  schema: createUserSchema,
  labels: userLabels,
  fields: {
    name: { renderer: 'text' },
    email: { renderer: 'text', props: { type: 'email' } },
    active: { renderer: 'switch', initialValue: true },
  },
  submit: usersActions.create,
})
```

Every input declares its `renderer`. Its flat `props` object follows that
component's public contract, including its supported native attributes. Use the
same prop bag when the component is standalone and when Form renders it.
Component-required props stay required. The schema supplies requiredness to the
real control; it does not select a renderer or create choices. A field may be a
plain configuration or a function that returns its complete configuration
from `FormFieldContext<TInput, TContext>`. That context contains the read-only
draft and typed `context` prop. Keep `span` and `visible` on the field;
`visible` defaults to true. Put authored disabled state in `props.disabled`.
Only `behavior.derived` remains for a value computed from the draft.

Set `initialValue` to a value or a zero-argument factory. Form clones mutable
values for each session. Use a factory for values computed when the session
starts, such as a timestamp or UUID. `initialData` overrides field defaults.
Do not add hidden inputs only to satisfy a schema.

A direct field uses the control's model value. For a control that edits several
schema properties, use a [field binding](../resource_system_overhaul/ARCHITECTURE.md#field-bindings)
with paired read and write functions. Keep the draft in the schema shape.
For example, DateInput uses a string model. Use a string input schema and an
explicit schema transform when the operation needs another value. Fields, field
defaults, `initialData`, controlled values, and edit loaders use schema input.
The schema parses that input before `submit` receives parsed output. The
`submitted` event reports the submit callback's result. A transform may add,
remove, or rename top-level keys. Map loaded records to input explicitly; Loom
does not invert a transform. Keep validation issue paths tied to editable input
when a field error needs a path. Keep business validators in the form definition
when they belong to the client workflow, and enforce the same rule on the
server.

## Session values and validation

The session owns one writable draft. Form refs, slots, emitted models, and
validator or behavior contexts receive detached read-only snapshots. Arrays and
plain objects are copied and frozen at the snapshot boundary. Date values are
cloned because a frozen Date can still change through its setters. A control
update or a slot's `setValue` changes the session; direct mutation of a snapshot
does not.

Use `FormDraft<TInput>` for initial data, controlled models, loaders, and slot
values. Every input key is optional and can be `null`. An absent or `undefined`
key is unset; `null` is an explicit clear. These edit values do not change the
schema's accepted input. A non-nullable schema still rejects `null`.

An input that keeps invalid local text emits `validation:error` with a message
and emits `validation:error(undefined)` when the text becomes valid. Form
blocks submission on that event even when the input has not emitted a model
value. Each error event cancels validation that is already running. A Save
click starts submit validation against the latest settled draft, even when blur
validation is pending. Repeated clicks share one submit attempt.

A mutation belongs to the form session that started it. If the form switches
record or closes while a mutation is pending, its result, error, toast, and
pending-state cleanup do not affect the new session. The operation can finish
its own cache work; Form does not retry it or claim that the server rolled it
back.

## Resource forms

Call `create()` to bind a create form. Pass runtime context or request
parameters only when the form uses them. Update binds identity and loads its
draft in the resource form factory. Select update values explicitly in that
loader:

```ts
const updateForm = defineForm({
  schema: updateUserSchema,
  labels: userLabels,
  fields: { name: { renderer: 'text' }, active: { renderer: 'switch' } },
})

export const users = defineResource({
  key: 'users',
  identity: (record: Pick<User, 'id'>) => record.id,
  create: {
    permission: 'create-users',
    form: createUserForm,
  },
  update: {
    permission: 'update-users',
    form: ({ id }) => ({
      ...updateForm,
      load: async context => {
        const record = await usersActions.detail({ ...context, id })
        return record ? { name: record.name, active: record.active } : undefined
      },
      submit: output => usersActions.update(id, output),
    }),
  },
})
```

The route calls the binding and passes the resulting page bag to `FormView`:

```vue
<FormView v-bind="users.create()" />
<FormView v-bind="users.update({ id: String(route.params.userId) })" />
```

The extracted update value is a page bag. Its `form` member is the complete
flat prop bag for the primitive. Use that same bag for a direct Form or a
DialogForm:

```ts
const editPage = users.update({ id: String(route.params.userId) })
```

```vue
<Form v-bind="editPage.form" />
<DialogForm v-bind="editPage.form" title="Edit user" />
<FormView v-bind="editPage" />
```

`Form` and `DialogForm` accept flat Form props. `FormView` accepts one nested
`form` bag and keeps page navigation and completion settings beside it. Do not
pass a nested `form` prop to Form or DialogForm.

Create and update declarations use the complete `FormView` props around the
nested form. Set `backTo`, `defaultTo`, `afterSubmit`, and `successMessage` on
the page declaration. The binder forwards them and keeps `form.submit` bound to
the resource access and invalidation policy. Set `defaultTo: false` or
`backTo: false` to disable the corresponding derived destination.

The update form owns its technical load and write. Do not add a page loader or
show a fake detail operation to load the draft.

## Dialog forms

Use `DialogForm` for a short contextual form. Its trigger opens the form and it
owns ordinary visibility and completion:

```vue
<DialogForm :key="record.id" v-bind="items.update({ id: record.id })" title="Edit item">
  <template #trigger>
    <Button>Edit</Button>
  </template>
</DialogForm>
```

`DialogForm` forwards the current Form props, events, input/loading/action
slots, and exposed methods. It adds only visibility and presentation members.
Supported form attributes such as `name`, `autocomplete`, ARIA, and `data-*`
reach the native form. `class` and `style` target the dialog presentation.

Use one keyed dialog for each record action. Use `v-model:open` only when
another page control must coordinate visibility. Validation and rejected writes
keep the dialog and draft available. A successful write closes the dialog
before `submitted` listeners run.

For a custom submit, keep the callback limited to the write. Start later refresh
work from `submitted`. Report a refresh failure as stale data. Do not run the
write again.

`FormView` reads `submitLabel` and `submittingLabel` from its nested `form`.
Its `actions` slot receives the Form action scope: `submit`, `reset`,
`submitting`, `submitPending`, `validating`, `dirty`, and `inputPending`. The
default actions add page navigation controls. Use the normal `actions` slot for
a replacement.

The FormView ref exposes the managed Form's read-only `draft`, `dirty`,
`submitting`, `submitPending`, `validating`, and `inputPending` state. It
forwards `validate`, `submit`, `reset`, and `refresh` to that Form.

## Select a field implementation

Use a registered input renderer, a framework composite, or `TableInput` for
editable row arrays. Build a local custom field only for a named requirement
that these controls do not support. Form owns validation state, the visible
label, required state, and grid span. BaseInput renders helper and error text
after the control. It shows both when both are present. A custom input slot
renders its control and binds the supplied `controlBindings` to that control.
Do not render another validation message or nest a second message-bearing
BaseInput in the slot.

```vue
<Form v-bind="profileForm">
  <template #input:name="{ value, setValue, controlBindings }">
    <input
      v-bind="controlBindings"
      :value="value ?? ''"
      @input="setValue(($event.target as HTMLInputElement).value)"
    />
  </template>
</Form>
```

`controlBindings` carries the control ID, disabled and required state, and
current message links. Bind it to the actual focusable control. It keeps the
Form label linked to that control and keeps its descriptions current when
messages change.

`TableInput` keeps its table definition and submit-free row form separate. Pass
`toDraft` to map a stored row into the row form's input shape. TableInput owns
row insert and replacement:

```vue
<TableInput
  v-model="rows"
  :table="lineItemsTable"
  :form="lineItemForm"
  :to-draft="lineItemToDraft"
/>
```

Check renderer props against the component contract. Use a `satisfies`
expression with the exported renderer prop type when a separate prop object
needs a check. A misspelled or unsupported prop must fail type checking. Keep
input and display renderer registries separate.

## Relations and dependencies

Keep the submitted relation value separate from its display label. Put a
component's loader in its field `props`. SelectInput, RadioGroupInput, and
CheckboxGroupInput use `load` with explicit `pick` and `view` props. A
resource-bound loader carries its resource and request identity, so do not copy
`resource` or `namespace` from the resource. Keep request-changing values in
`searchParameters`. A standalone loader can set an explicit resource owner when
it needs resource invalidation. Use `data` for static choices. For example:

```ts
const roleInput = {
  renderer: 'select',
  props: {
    load: roles.list().table.load,
    pick: 'id',
    view: 'name',
  },
} as const
```

A display `read` accessor or display renderer shows the returned name in table
and detail surfaces. Return the relation data needed for display from the API.
Do not fetch one label per row. The form schema accepts the control value and
does not infer choices from schema metadata.

Use a field function when its full configuration depends on the current draft
or supplied context. It runs in Form's reactive path and returns a complete
field configuration. Set `visible: false` to hide a field. Keep hidden fields
out of the form schema unless the submit contract needs their values. The
server remains the authority for relation access and validation.

## Local files

Use `mode: 'file'` when the draft needs local bytes. The model is `File` or,
with `multi: true`, `File[]`. A transform still returns a `File`. This mode
does not upload the selection and does not need `adapters.assets`.

For an import action, read the file in submit and build the endpoint payload
there:

```ts
const sourceFile = z.custom<File>((value): value is File =>
  typeof File !== 'undefined' && value instanceof File,
)

const importForm = defineForm({
  schema: z.object({ source: sourceFile }),
  fields: {
    source: { renderer: 'file', props: { mode: 'file', accept: ['.json'] } },
  },
  submit: async ({ source }) => importAction({ fileText: await source.text() }),
})
```

The browser file byte limit and an endpoint's text length limit measure
different values. Keep each check at its own boundary. Do not pass a `File`
where the endpoint expects a string.

## File transforms and uploads

`mode` selects the model value. `transform` runs before either value is
committed: asset mode passes its returned `File` to the configured asset
service, while file mode commits that same `File` locally. A transform must
return a `File`; the input validates both the selected and transformed files.

```ts
import type { AssetValue } from '@southneuhof/loom/assets'

const addTimestamp = async (
  file: File,
  { signal }: { signal: AbortSignal },
): Promise<File> => fileActions.addTimestamp(file, { signal })

const assetForm = defineForm({
  schema: z.object({ photo: z.custom<AssetValue | null>() }),
  fields: {
    photo: {
      renderer: 'image',
      props: { transform: addTimestamp, destination: 'profile-photos' },
    },
  },
})

const localForm = defineForm({
  schema: z.object({ photo: z.custom<File | null>() }),
  fields: {
    photo: {
      renderer: 'image',
      props: { mode: 'file', transform: addTimestamp, accept: ['image/*'] },
    },
  },
})
```

Asset mode uses `adapters.assets.upload` by default. Set `upload` to replace
only that transport. It receives the `File` and upload context with
`destination`, `signal`, and `onProgress`, and it must return a canonical
`AssetValue`. The installed asset adapter remains required for `read` and
`preview`, including validation and display of the returned value.

```ts
import type { UploadOperation } from '@southneuhof/loom'
import type { AssetValue } from '@southneuhof/loom/assets'

const uploadReceipt: UploadOperation<AssetValue> = async (
  file,
  { destination, signal, onProgress },
) => {
  const stored = await receiptActions.upload(file, { destination, signal, onProgress })
  return {
    kind: 'file',
    id: stored.id,
    url: stored.url,
    name: stored.name,
    size: stored.size,
    mimeType: stored.mimeType,
  }
}

const receiptForm = defineForm({
  schema: z.object({ receipt: z.custom<AssetValue | null>() }),
  fields: {
    receipt: {
      renderer: 'file',
      props: { destination: 'receipts', upload: uploadReceipt },
    },
  },
})
```

Use file mode when an action needs local text or bytes. Put application-specific
responses and JSON payload construction in that action. Do not use the upload
hook to return arbitrary results.

## Stored assets

Omitting `mode` keeps the stored asset behavior. A single field stores one
canonical `AssetValue` or `null`; a multi field stores an array. Keep that
shape through read, edit, and submit. Do not add client identity conversion or
an input writer. Shared form readiness blocks submission while transforms or
uploads remain pending. The boundary example is
[`assets.form.spec.ts`](../../apps/web/src/framework/adapters/assets.form.spec.ts).

Register `adapters.assets` once through `FrameworkPlugin` for asset mode.
FileInput, ImageInput, CameraInput, and DrawingCanvas use that service for
stored values and default uploads. The controls also support local File mode.
Asset-mode FileComponent, ImagePreview, and ImagePreviewMulti consumers use
the service. Keep URL-only preview props for URL sources; do not combine them
with the `asset` or `assets` source.

## Verification

Use `$build-resource-form` and [UI verification](../../.agents/skills/web-ui-surfaces/references/verification.md).
Choose a check that can fail on the changed behavior, such as draft loading,
dependency reset, a selected relation, or failed-save recovery. Do not add tests
that repeat input order, labels, renderer names, or standard framework behavior.

## Executable examples

Use the [Loom contract fixtures](../../packages/loom/README.md#executable-examples)
for real standalone and managed controls, date models, shared assets, and row
editing. The current [users resource](../../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts)
and its list, detail, and edit routes compile in the Web type check.

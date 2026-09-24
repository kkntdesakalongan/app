# Forms

Read this file for form schemas, input maps, defaults, labels, and custom
actions. Read [DESIGN.md](../../DESIGN.md#actions-and-forms) before selecting
the form surface or action placement.

## Form definition

Use a raw input schema with `defineForm`. Keep the selected inputs in that
form's own ordered `fields` map. The keys must belong to the schema. A display
map does not configure form inputs.

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

Use `initialData` for a fixed draft value. Use an input's `initialValue` only
when that input needs a fresh value for each form session. Do not add hidden
inputs only to satisfy a schema. The schema owns requiredness and the submitted
shape.

The draft uses control values. The schema parses that draft before `submit`
runs. Use schema transforms for input-to-output conversion. Keep business
validators in the form definition when they belong to the client workflow, and
enforce the same rule on the server.

## Resource forms

Create uses one static form bag. Update binds identity and loads its draft in the
resource form factory. Select update values explicitly in that loader:

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

The route passes the resulting page bag to `FormView`:

```vue
<FormView v-bind="users.update({ id: String(route.params.userId) })" />
```

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

Use one keyed dialog for each record action. Use `v-model:open` only when
another page control must coordinate visibility. Validation and rejected writes
keep the dialog and draft available. A successful write closes the dialog
before `submitted` listeners run.

For a custom submit, keep the callback limited to the write. Start later refresh
work from `submitted`. Report a refresh failure as stale data. Do not run the
write again.

## Select a field implementation

Use a registered input renderer, a framework composite, or `TableInput` for
editable row arrays. Build a local custom field only for a named requirement
that these controls do not support. The outer form owns the visible label,
required state, error, help text, and grid span. A custom input renders the
control only.

Check renderer props against the component contract. Use a `satisfies`
expression with the exported renderer prop type when a separate prop object
needs a check. Keep input and display renderer registries separate.

## Relations and dependencies

Keep the submitted relation value separate from its display label. A form
source loads choices; a display `read` accessor or display renderer shows the
returned name in table and detail surfaces. Return the relation data needed for
display from the API. Do not fetch one label per row.

Use pure synchronous behavior for dependencies. Keep hidden fields out of the
form schema unless the submit contract needs their values. The server remains
the authority for relation access and validation.

## Assets

Keep the stored asset object shape through read, edit, and submit. A single
asset field stores one object or `null`; a multi asset field stores an array.
Do not add client identity conversion or an input writer. Use shared upload
readiness so a form cannot submit while upload work remains pending. The
boundary example is
[`assets.form.spec.ts`](../../apps/web/src/framework/adapters/assets.form.spec.ts).

## Verification

Use `$build-resource-form` and [UI verification](../../.agents/skills/web-ui-surfaces/references/verification.md).
Choose a check that can fail on the changed behavior, such as draft loading,
dependency reset, a selected relation, or failed-save recovery. Do not add tests
that repeat input order, labels, renderer names, or standard framework behavior.

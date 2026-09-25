# Surfaces and operations

Read `docs/ui/collections.md` when a surface has filters, tabs, tables, or card
collections. Read [DESIGN.md](../../../../DESIGN.md#actions-and-forms) before
choosing page structure or action placement.

## Surface map

| Need | Use |
|---|---|
| Standard list | `ListView` with `resource.list` |
| Standard detail | `DetailView` with `resource.detail({ id })` |
| Standard create | `FormView` with `resource.create` |
| Standard update | `FormView` with `resource.update({ id })` |
| Custom collection | `Table` or `ListView #collection` |
| Custom record | `Detail` |
| Custom form | `Form` or `DialogForm` |
| Tree | `TreeTable` |
| List query controls | `ListView` filters, `Form`, or `ChipFilter` |
| Dialog, confirmation, button, card, feedback | Existing framework component |

## Independent definitions

Keep raw schemas in the module schema file. Define input and display maps
independently:

```ts
const statusDisplay = { renderer: 'chip', props: { options: statusLabels } }

const itemsTable = defineTable({
  schema: itemRecordSchema,
  columns: {
    name: { sortable: true },
    status: { ...statusDisplay },
  },
})

const itemDetail = defineDetail({
  schema: itemRecordSchema,
  fields: { name: {}, status: { ...statusDisplay } },
})

const createForm = defineForm({
  schema: itemCreateSchema,
  fields: { name: { renderer: 'text' } },
  submit: api.create,
})
```

Table columns and detail fields use record keys. Form inputs use form schema
keys. Share display objects with ordinary references and object spread.

## Resource declaration

Declare only the operations the module supports. Keep standard operations at
the resource top level and custom commands under `actions`:

```ts
export const items = defineResource({
  key: 'items',
  identity: (record: Pick<Item, 'id'>) => record.id,
  list: {
    permission: 'view-items',
    route: { name: 'items' },
    table: { ...itemsTable, load: api.list },
  },
  create: {
    permission: 'create-items',
    route: { name: 'items-create' },
    form: createForm,
  },
  detail: {
    permission: 'view-items',
    route: { name: 'items-detail', params: id => ({ itemId: String(id) }) },
    detail: ({ id }) => ({ ...itemDetail, load: context => api.detail({ ...context, id }) }),
  },
  update: {
    permission: 'update-items',
    route: { name: 'items-edit', params: id => ({ itemId: String(id) }) },
    form: ({ id }) => ({
      ...updateForm,
      load: async context => {
        const record = await api.detail({ ...context, id })
        return record ? { name: record.name } : undefined
      },
      submit: output => api.update(id, output),
    }),
  },
  delete: { permission: 'delete-items', run: api.delete },
  actions: { export: { run: api.export, permission: 'export-items' } },
})
```

The `list` and `create` results are static bags. `detail` and `update` bind an
identity. The loader belongs inside the bound detail or form bag. An update
loader selects draft values explicitly; a record is not an editable draft.
Every standard operation declares a permission string or `null`.

Use route names from `apps/web/route-map.d.ts`. Keep inherited parent scope in
the request parameters and cache context. File-route permission metadata owns
direct route access; do not create dummy records for child pages.

## Use the operation bags

```vue
<ListView v-bind="items.list" />
<DetailView v-bind="items.detail({ id })" />
<FormView v-bind="items.create" />
<DialogForm :key="record.id" v-bind="items.update({ id: record.id })" title="Edit item">
  <template #trigger>
    <Button>Edit</Button>
  </template>
</DialogForm>
```

`DialogForm` owns ordinary visibility and completion. Render one keyed dialog
per record action. Bind `open` only when another page control must coordinate
visibility.

## Custom commands and controls

Custom commands declare `run` and `permission` under `actions`. `run` and `can`
take the command's business arguments. For a row policy, bind the record first:

```ts
const command = resource.actions.review.withContext({ record })
if (command.can(payload)) await command.run(payload)
```

The record is policy context. It does not become another command argument. A
row-dependent `visible` policy returns false when there is no bound record.
Keep API authorization on the server. Standard operation bags do not expose a
generic `run` method.

For a custom collection, keep one loader and use the `ListView #collection`
slot. It receives ready rows and the page's standard action callbacks. Do not
start a second load or rebuild route/access checks. Use a custom surface only
when the standard Views and supported slots do not meet a named requirement.

## Filters and tabs

Use the `filters` prop for the standard Filter button and popover. Use the
`#filters` slot for a separate filter section. Keep query state with the route
or collection owner. Use `ChipFilter` for a collection query and state whether
selection is optional or required. Use framework `Tabs` for a local surface;
use app routing tabs for route navigation.

## Check changes

Run the source checker on the changed module directory:

```sh
node scripts/module-ui-check.mjs --sources 'apps/web/src/routes/(authenticated)/<module>'
```

Review display messages and template findings. This check does not prove visual
acceptance or API access.

# Display and input maps

Keep the form input schema and record display schema separate. Use
`defineForm` for input fields, `defineTable` for columns, and `defineDetail`
for detail fields. Each constructor checks its map against its own schema.

```ts
const statusDisplay = { renderer: 'chip', props: { options: statusLabels } }

const usersTable = defineTable({
  schema: usersRecordSchema,
  labels: userLabels,
  columns: {
    name: { sortable: true },
    statusCode: { ...statusDisplay },
  },
})

const userDetail = defineDetail({
  schema: usersRecordSchema,
  labels: userLabels,
  fields: {
    name: {},
    statusCode: { ...statusDisplay },
  },
})

const createForm = defineForm({
  schema: usersCreateSchema,
  labels: userLabels,
  fields: { name: { renderer: 'text' } },
  submit: usersActions.create,
})
```

Use ordinary object references and spread for reusable fragments. Configure
form inputs with input renderers. Configure Table columns and Detail fields
with display definitions.

## Display values

With no display renderer, Loom renders scalar values as text and nullish values
as `-`. Dates need an explicit format. Structured values need a renderer or an
accessor/formatter that returns displayable text. Check the actual API result;
do not return an object to a text display.

An accessor handles a value supplied by the record schema, such as a joined
relation:

```ts
const relationDisplay = {
  read: record => record.relOwner.name,
}

const ownerDetail = defineDetail({
  schema: itemRecordSchema,
  fields: { ownerName: { ...relationDisplay } },
})
```

Return the joined relation data from the API. Do not fetch one label per row
or display a stored ID when the task needs the name. The display key may be a
derived key when it has a `read` accessor. Its accessor properties must exist
in the record schema.

Use app display presets only when they express the required behavior. Keep a
shared fragment for values used by both table and detail. Keep each surface map
limited to its visible keys. Run `module-ui-check.mjs --sources` after resource
changes; it checks map membership, relation accessors, and display choices.

## Form values

Use a form schema that accepts the control value. Keep the draft in input
shape and use the schema transform for output conversion. Do not add a generic
field writer. Use `initialData` for a fixed draft value and an input
`initialValue` factory only for a fresh omitted-key default.

Every authored input names its renderer. Its `props` match the selected
component's public props, including supported native attributes. For
database-backed relation inputs, pass loaders in `props`: option inputs use
`load` and optional `namespace`; lookup also uses `loadDetail(context)` for
scalar identity hydration and its own table definition in `props.table`.
Delegate those loaders to the owning resource's `list.table.load` and
`detail({ id }).detail.load(context)`. Static choices use the renderer's `data`
prop. Keep filters in `searchParameters` and relation labels in the table/detail
display maps.

The raw form schema defines the selection value and any conversion to operation
input. Multi-choice controls can emit selected record objects; accept that
shape or transform it in the raw schema when the operation takes identities.
The users form shows this pattern for role selections.

For form dependencies or a custom input, read
[$build-resource-form](../../build-resource-form/SKILL.md). For value choices,
read [the form guide](../../../../docs/ui/forms.md).

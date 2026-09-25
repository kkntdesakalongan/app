# Collections and selection controls

Read this file for tables, card collections, collection states, `ChipFilter`,
and `Tabs`.

## Collection states

`Table` owns loading, error, empty, and ready states for its collection. The
standard empty state is the application empty state.

A custom collection slot receives only ready, non-empty records. It changes
record presentation and does not replace loading, error, or empty content.

## Table and card views

Read [DESIGN.md](../../DESIGN.md#page-structure) before adding a presentation
switch, and use its [labels and spacing](../../DESIGN.md#text-and-spacing).
Framework `Tabs` uses stable string values and parent-owned state.

The presentation switch does not start another loader or own route query
state.

## Query ownership

Pass `table.query` when the parent owns query values. Handle `update:query` by
replacing the parent value. ListView search, filters, sorting, and pagination
use that same round trip:

```ts
const query = ref({ page: 1, limit: 25 })
```

```vue
<ListView
  :table="{ ...users.list.table, query }"
  @update:query="query = $event"
/>
```

The component does not change the parent's query object. Each request emits one
`update:query`; the parent replacement drives the next load. Omit `query` when
the collection should own its namespaced query and URL state. Do not pass
`query: undefined` as a substitute for omission. The collection restores its
own state on browser back and keeps separate namespaces independent.

ListView synchronizes filter inputs from the current query. Search and
successful filter changes reset the page once. Clearing a filter removes its
query keys. A stale or invalid filter result does not load records.

Resource list declarations use the complete `ListView` prop contract. Keep
filters and export options beside the table, then pass the resulting bag to
`ListView`:

```ts
const users = defineResource({
  key: 'users',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'view-users',
    table: usersTable,
    filters: usersFilters,
    export: usersExport,
  },
})
```

The binder adds the table loader and row actions. It keeps filters, export,
headings, and explicit route settings on `users.list`.

## ChipFilter

Use `ChipFilter` when a selection changes one collection query. Each use states
its selection contract explicitly:

- `selection="optional"`: selecting the current chip clears the value.
- `selection="required"`: selecting the current chip keeps the value.

The parent supplies the initial value for a required selection. `ChipFilter`
does not select an arbitrary first option and does not add an `All` option.
The route owns query state and resets paging when the filter changes.

## Tabs

Use framework `Tabs` for a local surface or presentation with exactly one
selected item. Use the app routing Tabs component for route navigation. Tabs
are not clearable and do not own router query state.

A required query filter remains a `ChipFilter`; its required selection does
not turn it into a tab surface.

## Display values

`defineTable` owns an ordered `columns` map. `defineDetail` owns an independent
`fields` map. Reuse plain display fragments with object spread when several
surfaces need the same renderer, accessor, or format. Keep a column or detail
field in the map only when it belongs on that surface.

Scalar values can use their default text display. Dates need a date format.
Structured values need a renderer or an accessor/formatter that returns
displayable text. Do not show `[object Object]`. Use a named relation value,
not its stored ID.

Table, TreeTable, and Detail use the same display rendering contract. A
TreeTable renderer belongs on the `treeColumn`; the default tree cell keeps
that renderer inside its indentation and expansion controls. Use `tree-cell`
only when the whole cell needs custom rendering.

Resource extraction keeps a complete primitive bag intact. Pass
`users.list.table` to Table, `users.update(...).form` to Form or DialogForm,
and the full `users.update(...)` page bag to FormView. The page views add
layout and navigation; they do not start a second load or form session.

The [display parity fixture](../../packages/loom/src/components/core/__tests__/DisplayParity.browser.spec.ts)
uses one joined-relation accessor in Table, TreeTable, Detail, and extracted
resource bags. The [export fixture](../../packages/loom/src/services/__tests__/export.spec.ts)
checks the same accessor and format in workbook output.

Run the source checker after resource changes:

```sh
node scripts/module-ui-check.mjs --sources 'apps/web/src/routes/(authenticated)/<module>'
```

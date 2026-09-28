# Surfaces and operations

Read [DESIGN.md](../../../../DESIGN.md#actions-and-forms) for page and action
placement, and [collections](../../../../docs/ui/collections.md) for collection UI.

## Select operations

Declare only supported operations in one `defineResource` object. Standard
operations are top-level; custom commands live under `actions`. An update
loader does not require a visible detail operation. Use the architecture's
[current examples](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#direct-module-authoring)
for declaration syntax and [transport](../../carta-module-development/references/web-query-cache.md#reads-and-queries)
for partial endpoints.

| Task | Binding |
|---|---|
| List | `ListView` with `resource.list` |
| Detail | `DetailView` with `resource.detail({ id })` |
| Create | `FormView` with `resource.create` |
| Update | `FormView` with `resource.update({ id })` |
| Contextual input | `DialogForm` with the operation’s `.form` |
| Custom collection or record | Extracted `table` or `detail` bag |

List/create bags are static; detail/update bags bind identity. Keep loaders
inside their primitive bags. A standalone Collection, Table, TreeTable, or
Detail takes exactly one of `data` or `load`; omit the other property entirely.

## Custom commands and controls

`run` and `can` take only the command's business arguments. Bind row policy
separately with `withContext({ record })`. Standard operation bags have no
generic `run`. Use [route access](file-routing.md#route-access) for routed commands.

For custom collections, use `ListView #collection` with its ready rows and
standard callbacks. This preserves loading, access, navigation, and delete
outcome handling. Use the supplied guarded delete callback in custom slots;
a direct resource call bypasses the View's local repeat-write protection.
Standalone ListView deletion requires `recordIdentity`; a bound resource
supplies it. For custom mutation UI, read
[post-write handling](../../carta-module-development/references/web-query-cache.md#submit-overrides-and-failures).

## Filters and tabs

Use `filters` for the standard Filter button/popover or `#filters` for a separate
section. A filter is a submit-free form with explicit `queryKeys` and `toDraft`:

- `queryKeys` names only the query keys its parsed output can set or clear.
- `toDraft` maps raw URL values to input values, including missing or malformed
  values. It does not parse the whole query or assume typed query input.
- An omitted output clears an owned key. Other keys stay intact; ListView resets
  `page` to `1`, so exclude `page` from `queryKeys`.

Keep one query owner: the parent when controlled, otherwise Collection. Let
ListView handle validation, query replacement, and hydration. Use the
[filter contract](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#72-filters)
for transformed filters and defaults.

Use `ChipFilter` for a collection query, framework `Tabs` for local content,
and app routing tabs for navigation.

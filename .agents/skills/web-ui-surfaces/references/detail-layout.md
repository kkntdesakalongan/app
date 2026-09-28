# Workflow detail layout

Read [DESIGN.md](../../../../DESIGN.md#page-structure) for detail composition.
`DetailView` exposes controls and `value:<key>` slots. Check these extension
points before selecting the lower-level `Detail` component. Use the
[field contract](fields.md) to configure attachment display.
Use the [file-routing convention](file-routing.md) when a detail page owns
child routes, tabs, or Back behavior.

## Loading and updates

Start from `resource.detail({ id })`. For custom loading or refresh, use the
[query and mutation contract](../../carta-module-development/references/web-query-cache.md).
Keep identity and query context reactive when the page can remain mounted.

## Actions

Follow [action placement](../../../../DESIGN.md#actions-and-forms).
Show only actions allowed for the current record. Use server
capabilities for record decisions, and repeat authorization on submit.

Each action has its own input
schema and field set. If the clicked action fixes a value, do not ask for that
value again.

Keep load and write failures visible
through the existing error formatter. A custom body must supply loading,
error, unavailable-record, and retry behavior that a standard View would own.

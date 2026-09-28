---
name: build-resource-form
description: Build or review Carta forms, including value conversion, relation sources, dependent inputs, custom controls, uploads, and child writes.
---

# Build resource forms

Read [DESIGN.md](../../../DESIGN.md) before selecting layout or controls.
Apply [discovery reuse](../carta-module-development/SKILL.md#discovery-reuse).
Trace each changed value from its control through schema parsing and the API,
then back through display and edit loading.

## Define values

Use raw operation schemas and `defineForm` with selected input keys. Keep
record, input draft, and parsed output distinct. Use a separate schema for a
distinct custom action. Read the
[field contract](../carta-module-development/references/frontend-field-contract.md)
for draft mapping, defaults, relations, dates, or assets.

Account for each required write value: editable input, fixed context supplied
through `initialData` or the operation closure, or server-owned data excluded
from client schemas. Match conditional requiredness to the server rule,
including retained values. Supply record and parent context explicitly;
resource binding does not inject operation or permission context.

Use pure synchronous field behavior. `visible` controls presence and submission,
`disabled` controls editing, and `derived` calculates a non-editable value.
The schema must accept the intended result when hidden fields are omitted.
Pass dependent query values through component `searchParameters`; let the
control own selection validity.

## Select controls

Use framework forms for CRUD and custom actions. Read
[field choices](references/form-field-types.md) before selecting a new control.
Components own props and emitted values; schemas own domain conversion. Declare
a renderer for every input. For a separate prop object, use
`satisfies FormRendererProps<'renderer-key'>` from
`@southneuhof/loom/renderers/formContracts`. Keep supported native attributes
flat in that prop bag.

Use `table`/`TableInput` for form-owned row arrays. Use the
[custom field contract](references/custom-field-contract.md) only when registered
controls and existing composites cannot express the required value. The outer
form owns label, required state, error, help, and grid span.

## Configure relation sources

Complete the relation's [display data](../web-ui-surfaces/references/fields.md)
with its input. Read [backend form contract](references/backend-form-contract.md)
when source or write behavior changes.

Pass loaders in component `props`. For resource-backed SelectInput,
RadioGroupInput, and CheckboxGroupInput, pass the owner together with the loader:

```ts
props: {
  resource: roles.list.table.resource,
  load: roles.list.table.load,
  namespace: roles.list.table.namespace,
}
```

`resource` owns invalidation; `namespace` identifies the query instance. A
standalone loader can omit `resource`; static choices use `data`. Lookup uses
its own table and `loadDetail(context)` for selected-record hydration. Match
the loader to the picked key, which may differ from the resource identity.

Accept the selected control's model in the raw schema. Multi-choice inputs can
emit record objects; transform them only when the operation needs identities.
A filtered source does not authorize a write; the server checks membership,
state, and actor access.

## Connect the operation

Apply [framework-first composition](../web-ui-surfaces/SKILL.md#framework-first-composition).
Pass the operation bag to `FormView`; pass its `.form` to `Form` or
`DialogForm`. For ordinary contextual forms, use a `DialogForm` trigger slot
and one keyed form per record action. Let the form
own draft, validation, pending state, and completion. Use controlled visibility
only when another control must coordinate it; read
[dialog forms](../../../docs/ui/forms.md#dialog-forms) for that path.

For custom submission or completion, read the
[query and mutation contract](../carta-module-development/references/web-query-cache.md#submit-overrides-and-failures).
Preserve the operation guard, invalidation, and post-write outcome. Keep coupled
parent/child writes atomic on the server. Give a child its own resource only
when it has independent screens or permissions.

## Verify

Use [UI verification](../web-ui-surfaces/references/verification.md). Test the
changed application rule or coordination through its real schema and owners.
Reuse framework proof for unchanged controls; configuration copies do not
prove behavior. Check server rejection of forged relations when that boundary
changes.

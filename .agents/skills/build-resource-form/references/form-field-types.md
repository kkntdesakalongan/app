# Field choices

Read [the app form guide](../../../../docs/ui/forms.md) for control selection.
Use the [runtime roster](../../../../packages/loom/src/renderers/form.ts) for
renderer keys and the selected component for props and model rules. Built-in
types derive from that roster.

Choose the control by the editable value and interaction:

- Use `number` for numeric input, including currency. A text control remains a
  string input; convert domain values in the schema.
- Use static choices for a small closed set; use searchable owner list/detail
  sources for database relations. Follow the
  [source contract](../SKILL.md#configure-relation-sources).
- Match prop-dependent models, such as multi-selection or asset cardinality,
  to the schema. A dynamic `multi` value can produce either shape.
- Use the [asset contract](../../carta-module-development/references/frontend-field-contract.md#asset-fields)
  for files, images, and File Manager values.
- Use `TableInput` for form-owned row arrays: separate table and submit-free
  form definitions, plus `toDraft`. It owns row data and commits; its nested
  table has no source and its row form has no loader or submit.

A switch edits the draft. An immediate server action needs an explicit operation.
Use a [custom field](custom-field-contract.md) only for a value or interaction
that existing controls cannot express.

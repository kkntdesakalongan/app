---
name: build-resource-form
description: Build or review Carta form values, validation, relation sources, dependent inputs, custom action inputs, custom fields, inline uploads, and child writes.
---

# Build resource forms

Read [DESIGN.md](../../../DESIGN.md) before selecting form layout or controls,
including when this skill is used directly for a custom action.

Apply [discovery reuse](../carta-module-development/SKILL.md#discovery-reuse).
Trace the changed value through its API schema, resource and route; reuse
current pattern decisions from the plan. Read the field contract in
`packages/loom/README.md` when its shape is unresolved, and
`apps/web/src/framework/inputs/registry.ts` when renderer registration or defaults
are unresolved. Use [web-ui-surfaces](../web-ui-surfaces/SKILL.md) for changed
page composition and `docs/ui/forms.md` for an unresolved app form default.

## Define the value contract

Use raw schemas for record, query, create, and update operations. Export the
schemas and inferred types from the module schema file. Do not add a resource
schema wrapper. A form definition selects its own input keys with
`defineForm({ schema, fields, ... })`. Keep custom action schemas separate
from standard operation schemas.

For file/image fields in standard or custom actions, read the
[asset-object contract](../carta-module-development/references/frontend-field-contract.md#asset-fields)
before selecting the write schema. Use that contract to resolve an input mismatch.

Define form inputs, table columns, and detail fields independently with
`defineForm`, `defineTable`, and `defineDetail`. Each map uses keys from its own
schema. Reuse plain display fragments with object spread in the table and
detail maps. A display fragment does not define an input. Use schema transforms
for input-to-output conversion and display definitions for read-only values.

For state-dependent inputs, supply the current record through form context.
Match required state and submit validation to the server predicate, including
previously retained values. Help text alone does not enforce a required input.

Account for every required write value: user input, fixed parent context, or
server-owned data. Show editable required fields. Supply fixed values through
`initialData`; keep server-owned values out of client write schemas. Do not add
hidden controls merely to satisfy a schema.

Use an input `initialValue` factory only for a fresh omitted-key default. Use
`initialData` for a fixed draft. Loaded values and explicit `false`, `null`, or
empty values must win. The draft stores control values; the schema parses the
draft before submit. A failed submit must preserve the draft.

## Select controls

Custom business operations use the same framework forms and controls as CRUD.
Give the operation its own schema and action; let the form own input, validation
and pending state. Use local UI code only for a named requirement that registered
renderers and existing composites cannot meet. Record that gap in the existing
work record before implementing the exception.

Read [field choices](references/form-field-types.md) when selecting a new control
or resolving a value mismatch.
Use the registered renderer, then an existing composite. Use `table`/`TableInput`
for form-owned row arrays. If those cannot express one domain value, use the
[custom field contract](references/custom-field-contract.md).

The outer form owns label, required state, error, help, and grid span.

Use `defineForm` to infer its selected input keys and renderer props. For a
separate prop object, use `satisfies FormRendererProps<'renderer-key'>` from
`@southneuhof/loom/renderers/formContracts`. Known props keep their
component types; extra props remain open. Broad field annotations do not prove
prop validity. Check extra prop names against the component; type checks cannot
detect those spelling errors. These checks do not validate runtime data.

Apply the [framework-first composition rule](../web-ui-surfaces/SKILL.md#framework-first-composition)
once per form pattern. Select the form surface from
[DESIGN.md](../../../DESIGN.md#actions-and-forms).
Pass the standard action bag directly. Use a `DialogForm` trigger slot without
`v-model:open` for ordinary contextual forms, and render one keyed form per
record action. Let the form own draft, validation, pending state, visibility,
and completion. Use controlled visibility only when another page control must
coordinate it. Read [the dialog form contract](../../../docs/ui/forms.md#dialog-forms)
for that advanced path.

For a custom submit, trace write success, form completion and data refresh in
order. Start later refresh work from `submitted`; keep it separate from the
write so refresh rejection reports stale data and does not retry the write.
Use the supported loading and invalidation path from
the [query-cache contract](../carta-module-development/references/web-query-cache.md).
Report a failed write separately from a failed refresh after a successful write.

## Configure relation sources

For each new or changed relation, use the
[display and form pattern](../web-ui-surfaces/references/fields.md).
Complete its API display data and list/detail projection with the form, rather
than leaving display work for a later assignment.

Pass explicit loaders in `source`: standard option inputs use
`{ load, namespace? }`, such as `roles.list.table.load` and its namespace.
Lookup adds `loadDetail(context)` that delegates to the owner's detail loader;
its props include a separate table definition. Use renderer `data` props for
static choices. Pass filters through `searchParameters`; the owner endpoint
owns their contract.

For a parent-dependent field:

```ts
behavior: {
  disabled: ({ draft }) => !draft.divisionId,
  props: ({ draft }) => ({ searchParameters: { divisionId: draft.divisionId } }),
  resetWhen: ({ draft }) => draft.divisionId,
},
```

Use pure synchronous behavior. `visible` controls field presence and submission;
`disabled` controls editing; `derived` calculates a non-editable value. Hidden
fields are omitted, so the schema and server must agree on conditional values.
If several dependencies can invalidate a child, the reset key must reflect
each one; a truthy `a || b` expression can hide changes to `b`.

Use `context` for stable screen information. Standard create/update actions
supply reserved `context.operation` and `context.permission`. Where the source
requires action scope, use that permission rather than a hard-coded create
permission. The server validates it; a query parameter grants no authority.

Match multi-selection values to the raw form schema. Multi-choice controls can
emit selected record objects; accept that input shape or transform it in the
raw schema when the operation takes identities. The `users` form shows this
contract for role selections.

## Connect writes

Read [backend form contract](references/backend-form-contract.md) when a source
or write contract changes. Use a custom action for a distinct domain operation,
not another options endpoint. Give it only its actual input fields. Keep state
checks and atomic parent/child writes on the server. A child with independent
screens or permissions needs its own resource; a row owned by one form does not.

Continue authorized implementation choices. Ask only for a missing decision
that changes business behavior, access, or transaction semantics. A framework
package change needs explicit scope; a supported local custom field does not.

## Verify

Use [UI verification](../web-ui-surfaces/references/verification.md). Select a
check that can fail on the changed value or interaction: dependency reset,
selected-record hydration, conditional submit, row edit, or failed-save recovery.
Check server rejection of a forged relation when the write boundary changes.
Do not add tests that merely copy field order, labels, renderer names, or action
objects. Reuse existing evidence for unchanged framework behavior.

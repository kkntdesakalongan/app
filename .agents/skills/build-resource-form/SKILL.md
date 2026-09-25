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
`packages/loom/README.md` when its shape is unresolved, and the built-in roster
in `packages/loom/src/renderers/form.ts` when renderer registration is unclear.
Use [web-ui-surfaces](../web-ui-surfaces/SKILL.md) for changed
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
`@southneuhof/loom/renderers/formContracts`. The prop bag follows the selected
component's public API. Component-required props stay required, unsupported
props and misspellings fail type checking, and supported native attributes stay
flat in the same bag. Form supplies schema-derived requiredness to the control.
Runtime data still needs normal validation.

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

Pass each loader in the selected component's `props`: option inputs use
`load` and optional `namespace`, such as `roles.list.table.load` and its
namespace. Lookup also uses `loadDetail(context)` and its own table definition.
Use component `data` props for static choices. Pass filters through
`searchParameters`; the owner endpoint owns their contract. Declare a renderer
for every authored input. The schema does not create choices or select a
renderer.

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

Pass stable screen information through the form's explicit context. Resource
operations do not add `context.operation` or `context.permission`. Bind parent
IDs and workflow data deliberately. A query parameter does not grant authority;
the server checks each write.

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

# Custom field contract

Read this file only after `docs/ui/forms.md` selects a module-owned custom
field. The selection decision belongs in that UI contract. Use
[form-field-types.md](form-field-types.md) only to confirm that no registered
renderer or composite expresses the value.

## Ownership

The outer framework form field owns the label, required state, error, help
text, and grid span. The custom component owns one domain value and its control
layout. Keep the outer field as the single label owner.

Use the form field slot `input:<field-key>` for one-form use. Consume the
slot's `value`, `setValue`, `disabled`, `error`, and draft context. Keep one
clear value flow from the slot into the component and back through `setValue`.

For a resource renderer used by several fields, expose the framework controlled
form contract. A `modelValue` component uses `adaptVModelInput` at the registry
boundary.
Use module augmentation to map its key to `typeof Component` in `FormRendererComponents` from
`@southneuhof/loom/renderers/formContracts`, then register it under the same
runtime key. The component owns prop types; no separate prop interface is needed.

## Composition

Compose registered framework inputs and composites. Existing controls continue
to own selection, upload, date, number, disabled, error, and accessibility
behavior. Forward the field ID and accessible description to the actual
control; emit the touch event expected by the form. The custom component owns only the domain layout, conditional
sections, and coordination that no selected renderer or composite expresses.

An editable row array uses `TableInput`. A custom field can compose
`TableInput`; it does not build another row-editor pattern.

## Verification

Add one focused component or form test that proves:

- the complete domain value moves through the owning form field;
- disabled and error state reaches each applicable control;
- the visible label identifies the editable control; and
- the submitted value matches the schema contract.

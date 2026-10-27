---
name: build-resource-form
description: Build or review Carta forms, value conversion, relation sources, and submission.
---

# Build resource forms

Read [DESIGN.md](../../../DESIGN.md) for layout. Use the [form guide](../../../docs/ui/forms.md)
for controls and composition, and the [value contract](../../../docs/resource_system_overhaul/ARCHITECTURE.md#4-schemas-and-value-ownership)
for drafts, defaults, and schema input/output. Identical input contracts can
share schemas.

Use [custom fields](references/custom-field-contract.md) for interactions
existing controls cannot express.

Use a plain field object for static input. Use a field function when the full
configuration depends on typed Form context or the read-only draft. Return the
whole field configuration. Put visibility and span on the field. Put authored
disabled state in the input props. Only `behavior.derived` remains for values
computed from the draft.

For file selection, imports, or preprocessing, use the existing FileInput,
ImageInput, CameraInput, or DrawingCanvas. Omitted mode keeps stored
`AssetValue` behavior. Set `mode: 'file'` for local bytes and build the
endpoint payload in the application action. Read the
[local file guide](../../../docs/ui/forms.md#local-files) for draft and wire values.
For preprocessing before upload or local use, or a custom asset transport,
read [file transforms and uploads](../../../docs/ui/forms.md#file-transforms-and-uploads).
Choose mode independently of the transform. Check these contracts before
creating a custom file control.

For relations, use authorized owner sources with display labels. Read the
[web/API connection](references/backend-form-contract.md) when changing that
boundary. A loader from `resource.list()` carries resource ownership and bound
request parameters. Pass it with `pick` and `view`; do not repeat its resource
or namespace. Put values that change the returned choices in
`searchParameters`. For hydration and dependencies, read the
[input source contract](../../../docs/resource_system_overhaul/ARCHITECTURE.md#74-lookup-option-and-location-inputs).

Submit overrides replace access and invalidation. Follow the
[binding](../../../docs/resource_system_overhaul/ARCHITECTURE.md#11-required-consumption)
and [post-write contracts](../../../docs/resource_system_overhaul/ARCHITECTURE.md#52-submission).

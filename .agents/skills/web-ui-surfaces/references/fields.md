# Display values

Define table columns and detail fields independently against their record schema.
Share plain display fragments with object spread. Keep form inputs in
`defineForm`; use [$build-resource-form](../../build-resource-form/SKILL.md) for
input behavior and sources.

For each visible value, choose its display from the actual API result:

- Scalars can use default text; nullish values display as `-`.
- Dates and units need an explicit format.
- States use labelled chips; assets use previews or named links.
- Relations use names supplied in the returned record.
- Structured values need a renderer or an accessor/formatter that produces
  readable content.

A pure synchronous `read` accessor can define a derived display key; the
properties it reads must exist in the record schema. Return joined relation
labels from the API or enrich the loaded record in a batch. Keep network calls
out of cells and accessors.

Share the same accessor, format, and renderer where table and detail show the
same value. Add only surface-specific sorting or layout to each map. A display
accessor does not define a server sort key. Use the current
[display contract](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#25-complete-display-reuse)
for unresolved configuration or export behavior.

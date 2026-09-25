# Frontend schema and surface contract

Read this file before a Carta web resource or form edit. The approved detail is
in [resource system architecture](../../../../docs/resource_system_overhaul/ARCHITECTURE.md).

## Surface owners

Export raw operation schemas and their inferred types from the module schema
file. Do not wrap schemas in an app or Loom resource schema.

| Surface | Constructor | Map | Schema |
|---|---|---|---|
| Form | `defineForm` | `fields` | Form input schema |
| Table | `defineTable` | `columns` | Record schema |
| Detail | `defineDetail` | `fields` | Record schema |

Each map is independent, ordered, and checked against its own schema. A form
input is not a display definition. Reuse plain display fragments with object
spread. Table/detail fields use `read`, `renderer`, `props`, and `format` where
needed; form inputs use their input renderer contract.

Use one-object `defineResource`. Put standard operations at the resource top
level. `list` and `create` are static bags. `detail` and `update` factories
bind identity. Keep their loaders inside the returned bag. An update loader
must map record values to `FormDraft<TInput>` explicitly.

## Value flow

```text
API record --detail read accessor--> visible value
API record --update.form.load mapping--> editable input
editable input --raw schema parse--> submitted output
submitted output --submit function--> operation result
```

Do not add generic field reads, writers, identity conversions, or hidden
controls. Use schema transforms for input-to-output conversion. The API schema
owns requiredness and the final write shape. The update loader selects draft
keys explicitly; it does not cast a full record into a draft.

## Relations and identifiers

Keep the submitted relation value separate from its display label. Standard
option inputs receive `load` and optional `namespace` in their component
`props`; lookup also takes `loadDetail(context)` and its own table definition.
Delegate these loaders to the owner's `list.table.load` and
`detail({ id }).detail.load(context)`. The table/detail accessor reads the
returned relation name. Include relation data in the record contract; do not
fetch one label per row. Static choices use the renderer `data` prop.

Editable row arrays use `TableInput` with separate `table` and submit-free
`form` definitions plus a required `toDraft` mapper. Do not use a shared
`fields` map or put the TableInput row editor submit function on its form.

Use the owner resource identity for detail, CRUD, and cache operations. A
lookup's `pick` and `view` keys configure the selection control; they do not
change resource identity.

The raw form schema defines the selection value and any conversion to operation
input. Multi-choice controls can emit selected record objects; accept that
shape or transform it in the raw schema when the operation takes identities.
The users form shows this contract for role selections. The API validates the
submitted identities at persistence.

## Assets

Use the same asset field name and object shape in API reads, the form draft,
and submitted writes. A single field holds `StoredAsset` or `null` when
allowed. A multi field holds `StoredAsset[]`. Preserve optional metadata and
array order. Do not add client ID conversion or a generic writer.

The API owns `storedAssetSchema` and its inferred `StoredAsset` type in
`apps/api/src/schema.ts`. Use the web operation schema that has the same
contract. Use `storedAssetInput` only on the server to extract storage IDs.
Project stored IDs with the existing
`apps/api/src/storage/assets.ts` owner before returning records.

Install `adapters.assets` once through `FrameworkPlugin`. File and image inputs
and asset previews use this app-scoped service. Keep canonical `AssetValue`
objects through load and submit. Do not add per-input adapters or an input
registry. Shared form readiness blocks submit while upload work is pending.
Do not persist client URLs as authority. The server validates ownership and
use. Removing a record association does not authorize deletion of the shared
file.

For a changed asset field, prove unchanged save, addition, allowed removal or
clear, retained metadata, and reload. Test omitted PATCH separately from an
empty array. Capture a real form submission and parse it through the server
input schema; a mocked action cannot prove the boundary. Reuse
[`assets.form.spec.ts`](../../../../apps/web/src/framework/adapters/assets.form.spec.ts)
and keep business checks local.

## Verification

Trace one changed value through schema, form input, submit, and stored result.
For a relation, check a prefilled selection and an invalid parent reference.
For a structured display, check a returned record with the relation data. Use
the [verification strategy](verification-strategy.md) to choose checks; field
configuration snapshots do not prove value flow.

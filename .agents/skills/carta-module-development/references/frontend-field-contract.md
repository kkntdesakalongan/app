# Field and value contract

Read this reference when a draft, relation, date, or asset shape changes.
The [resource architecture](../../../../docs/resource_system_overhaul/ARCHITECTURE.md)
owns the surface API. Use `$build-resource-form` for controls and
[display conventions](../../web-ui-surfaces/references/fields.md) for visible values.

## Surface and value ownership

Export raw operation schemas. Define form `fields`, table `columns`, and detail
`fields` independently with `defineForm`, `defineTable`, and `defineDetail`.
Reuse explicit input fragments and display fragments within their own surfaces.
Every input selects a renderer; component props own choices and loading.

```text
API record → explicit draft loader → schema input → parsed output → submit
API record → display accessor and format → visible value
```

An update loader returns `FormDraft<TInput> | undefined` and selects input keys
explicitly. Format record dates for the chosen control: built-in DateInput uses
strings, null, or undefined. Put conversion to command values in the raw schema.
Preserve explicit false, zero, empty, null, and undefined draft properties;
schema defaults do not initialize the visible form. Supply fixed context
explicitly; resource binding does not inject operation or permission context.

Use one-object `defineResource` with an identity function that accepts the
identity-bearing record. Standard operations are top-level declarations.
`list` and `create` return static bags; `detail({ id })` and `update({ id })`
return identity-bound bags. Load through `.table.load`, `.detail.load`, or
`.form.load` inside the relevant bag.

For a current complete example, read
[users.resource.ts](../../../../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts)
and its sibling `users.schema.ts`. Check only the changed contract in the
[compiled consumer examples](../../../../apps/web/src/framework/__type-tests__/plan067-consumer-contracts.type-test.ts).

## Relations and row inputs

Keep labels and submitted identities explicit. Return named relations from the
API; display accessors read those names without one request per row. Option
inputs receive `data` or `load`, plus `pick`, `view`, and applicable namespace
and search parameters. A function reference does not carry sibling metadata.
Lookup has an independent table and explicit `loadDetail` for label hydration.
Its picked key is not necessarily the resource identity; call a loader that
accepts that key.

The raw form schema owns selected-record conversion. Follow the actual input
model and API output contract; there is no universal conversion to IDs.
The users role schema is an example of an explicit transform.

TableInput uses separate table and submit-free form definitions plus `toDraft`.
It owns row data and commits; its table has no data/load and its row form has no
load/submit/model binding. List filters also use submit-free form definitions.

## Asset fields

Keep the canonical asset object through read, draft, and submit: `StoredAsset`
(or null when allowed) for a single value and `StoredAsset[]` for multiple values.
Preserve metadata and order. The server owns
[`storedAssetSchema` and `storedAssetInput`](../../../../apps/api/src/schema.ts);
only server persistence extracts storage IDs. Return projected assets through
[storage/assets.ts](../../../../apps/api/src/storage/assets.ts).

Reuse the app's [asset adapter](../../../../apps/web/src/framework/adapters/assets.ts),
installed once as `FrameworkPlugin`'s `adapters.assets`. Inputs and previews
consume that service directly. Use asset-mode preview props and shared upload
readiness. Keep file configuration local to its component; do not add field
converters, per-input adapters, or an input registry.

For ordinary PATCH collections, omission preserves the value, an included array
replaces it, and `[]` requests clearing. The server enforces access, allowed
files, and atomic writes. Client URLs are not authority. Removing an association
does not authorize deletion of the shared file.

For changed asset behavior, check unchanged save, add, allowed clear/removal,
metadata, order, and reload. Check omitted PATCH separately from an empty array.
Use the real form submission and server input schema when proving that boundary;
reuse [assets.form.spec.ts](../../../../apps/web/src/framework/adapters/assets.form.spec.ts).

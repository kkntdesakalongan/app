# Field and value contract

Use this reference for draft, relation, date, or asset changes. The
[resource architecture](../../../../docs/resource_system_overhaul/ARCHITECTURE.md)
owns the API; [$build-resource-form](../../build-resource-form/SKILL.md) owns
control selection and [display guidance](../../web-ui-surfaces/references/fields.md)
owns visible values.

## Draft and output

```text
API record → explicit draft loader → schema input → parsed output → submit
API record → display accessor and format → visible value
```

An update loader returns `FormDraft<TInput> | undefined` and selects input keys
explicitly. Match component models; for example, DateInput uses strings, null,
or undefined. Convert to command values in the raw schema. Multi-choice values
follow the selected component; there is no universal conversion to IDs.

Use `initialData` for fixed draft values and input `initialValue` factories for
fresh omitted-key defaults. Loaded values and edits take precedence. Preserve
explicit false, zero, empty, null, and undefined properties. Schema defaults
run during parsing; they do not initialize visible controls. A draft can hold
null without making the submit schema nullable.

Use [users.resource.ts](../../../../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts)
and its schema for a current mapping example. Keep form, table, and detail
definitions separate; reuse plain fragments within their own surfaces.

## Asset fields

Keep the canonical asset object through read, draft, and submit: `StoredAsset`
(or null when allowed) for one value and `StoredAsset[]` for multiple values.
Preserve metadata and order. The server's
[asset schemas](../../../../apps/api/src/schema.ts) validate input; persistence
extracts storage IDs and [asset projection](../../../../apps/api/src/storage/assets.ts)
returns public values.

Reuse the app's [asset adapter](../../../../apps/web/src/framework/adapters/assets.ts),
installed as `FrameworkPlugin`'s `adapters.assets`. Inputs, upload readiness,
and asset-mode previews use that service. File Manager listings use
`ManagedAsset`; its provider converts selected files to canonical `AssetValue`
at the boundary. Reuse the installed provider for FileManagerInput, FileInput,
and ImageInput rather than storing listing objects, IDs, or preview URLs.

For PATCH collections, omission preserves the value, an included array replaces
it, and `[]` clears it. The server checks access and allowed files and keeps
coupled writes atomic. Removing an association does not authorize shared-file
deletion.

When this boundary changes, prove the request through the real form and server
schema, including unchanged save, allowed clearing, and reload. Reuse
[asset form proof](../../../../apps/web/src/framework/adapters/assets.form.spec.ts)
for unchanged behavior.

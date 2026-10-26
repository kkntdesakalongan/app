# Public records and files

## Reads

Follow Sprindle's [conversion contract](../../../../packages/sprindle/docs/reference.md#file-routes).
Supply display data without per-row queries. Scope enrichment runs per record;
batch additional database or remote reads at list level.

`defineRoute` bypasses scope record enrichment; apply its public schema directly.
Exclude private columns.

## Selections

`selectionValues(exactItemSchema)` in `src/schema.ts` accepts objects with the
field's actual keys; `selectionQuery` accepts their JSON query value. Resolve
identity, membership, and current labels on the server. Picker filters and
client labels do not authorize writes.

## Stored assets

Use `storedAssetSchema`, `storedAssetInput`, and `uploadKey` from `src/schema.ts`
and conversions from `src/storage/assets.ts`. HTTP values use `z.input`;
persistence uses `z.output`. Reuse `storedAssetModel` and `publicRecord` where
applicable. Preserve canonical objects through
[stored asset forms](../../../../docs/ui/forms.md#stored-assets).

Use `src/storage/s3.ts` for storage. Signed URLs are not stored identities.
Removing an association does not authorize shared-object deletion. Database
rollback does not undo storage writes or removals.

## Local file workflows

Imports and external-service actions can use file contents without a stored
asset. Define the endpoint payload for the operation, such as JSON text or
multipart bytes. Validate that payload on the server. A selected browser
`File` does not require an asset schema or storage write. See
[local file forms](../../../../docs/ui/forms.md#local-files) for the client boundary.

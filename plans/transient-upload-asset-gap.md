# Transient playground upload vs symmetric asset contract

Status: finding recorded, decision deferred.
Source checkout: Carta at current tree; observed app at `/Users/gamer/Documents/projects/hk-training/my-app`.

## Observed behavior

The playground page uploads two test files through native controls, then submits storage keys:

- `apps/web/src/routes/(authenticated)/document-verification/playground/index.route.vue:132-142` renders a native `<select>` and two native `<input type="file">` controls.
- `apps/web/src/routes/(authenticated)/document-verification/playground/playground.actions.ts:28-32` uploads through `@/framework/adapters/storage` `uploadFile`, keeps `{ key: asset.id, name: asset.name }`, and discards the remaining asset object.
- `runPlayground` submits `{ document_type_id, subject_key, reference_key, instructions }`. The file values on the wire are key strings, not asset objects.

## Contract conflict

The current asset contract requires one symmetric asset shape through read, draft, and write:

- `.agents/skills/carta-module-development/references/frontend-field-contract.md#asset-fields` requires `StoredAsset` or `StoredAsset[]` in the live draft and the submitted write. Raw keys, URLs, partial objects, and client ID transforms are not asset values. The contract states that it applies to custom workflow actions as well as create and update.
- `.agents/skills/build-resource-form/references/backend-form-contract.md#submit` sends the server check to the same contract for uploads.
- `apps/web/src/framework/adapters/assets.form.spec.ts` proves the symmetric path: load canonical objects, edit through `FileInput`, submit complete objects, parse the write through the server input schema.

The playground keeps the upload transport but breaks the value contract at the next step. The native file control is therefore a symptom. The missing branch is the transient key-only upload.

## Implemented framework support

The escape-hatchable adapter architecture exists and covers the symmetric case:

- `apps/web/src/framework/adapters/assets.ts` owns read, preview, and upload through `StoredAsset`.
- `apps/web/src/framework/inputs/registry.ts` binds the `file` and `image` renderers to that adapter.
- `docs/ui/forms.md#select-a-field-implementation` orders the choice: registered renderer, framework composite, table rows, module-owned custom field composed from framework inputs, then a new framework primitive.

No step names the transient case: an upload that never becomes a stored record field and reaches the API only as a key string.

## Open decision

Two paths remain open:

1. Change the playground API to accept complete `StoredAsset` values. This keeps the symmetric contract and moves key extraction to the existing server owner.
2. Define a named transient-upload exception: compose `FileInput` for upload and preview, map to keys at the action boundary, and prove ownership, access, allowed files, metadata handling, and key reuse through the existing server persistence owner.

Useful evidence for that decision:

- Whether the playground run endpoint checks upload ownership and allowed files before use.
- Whether a submitted key can reference another user's upload.
- Whether the API needs the full asset object for future metadata or cost rules.
- Plan `015-symmetric-asset-fields` already reserves domain add and remove semantics for a separately approved API migration.

## Suggested check before a fix

Keep the file local and out of the module record until the API choice is set. A UI-only change to `FileInput` without the API decision preserves the same contract break in a shared control.

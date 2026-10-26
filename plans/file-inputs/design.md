# Local files and stored assets

Design: Approved
Implementation: Current

Automated implementation proof and remaining limits are recorded in [delivery.md](delivery.md#implementation-and-proof).

## 1. Purpose and scope

Developers need reusable file controls for local reads, transforms, external requests, and stored asset fields. A file selection must not require storage.

The current `FileInput` and `ImageInput` immediately upload through the asset service. Their models contain stored assets. The JSON import in `agentic-bi-eval` instead reads a local file and sends text. Its native input follows the current extension guidance.

Separate these two value contracts within the same components. Browser `File` represents local bytes. `AssetValue` represents stored identity. An optional `mode` prop selects the contract and defaults to `asset`, the common workflow. Do not create separate components for storage variants.

Included:

- Local file and image selection without an asset service or framework adapter registration.
- File and asset modes within the existing input components.
- Camera capture and drawing export through the same value and operation owner.
- Typed file transformation and asset upload hooks.
- Form contracts, component imports, current examples, and agent guidance for both value contracts.
- A breaking migration within Carta. Remove the previous contracts in the same delivery.

The consumer app supplies a concrete use case. Updating its framework copy is a separate sync operation. This design does not change its import endpoint.

Do not add a generic processing engine or callbacks that change the selected mode's model type. Application actions own arbitrary result types and endpoint payloads.

## 2. Functional requirements

| # | Capability | Users and access | Expected result |
|---|---|---|---|
| 1 | Select local files | Any caller, without storage registration | `FileInput` with `mode="file"` emits browser `File` values after validation and any configured transform. No automatic upload starts. |
| 2 | Select local images | Any caller | `ImageInput` adds local previews and image acceptance rules to the same local contract. |
| 3 | Edit stored assets | Callers with the app asset service | The same components with `mode="asset"` upload local selections or select existing assets. Only canonical `AssetValue` values enter their models. |
| 4 | Process selected files | Application actions | A caller reads, transforms, or sends a selected `File` without reimplementing selection UI. |
| 5 | Capture an image | Camera users with device permission | `CameraInput` acquires a local image, then applies the selected mode through the shared owner. Stream cleanup remains its responsibility. |
| 6 | Export a drawing | Drawing users | `DrawingCanvas` exports a PNG, then applies the selected mode through the shared owner. It does not call an arbitrary result callback. |
| 7 | Use managed forms | Form authors | `mode` and `multi` determine the exact model type. Reset, dirty state, validation, and pending submission remain valid. |

## 3. Data and business rules

### Public values and names

| Component | Form renderer | `mode="file"` | `mode="asset"` |
|---|---|---|---|
| `FileInput` | `file` | `File` | `AssetValue` |
| `ImageInput` | `image` | `File` | `AssetValue` |
| `CameraInput` | No new renderer required | `File` | `AssetValue` |
| `DrawingCanvas` | `canvas` | `File` | `AssetValue` |

`mode` defaults to `asset`. Omitting it has the same model, props, and behavior as `mode="asset"`. Use `mode="file"` to retain local files without automatic storage. File and image inputs support arrays through `multi`. Camera and drawing remain single-value controls.

Literal modes must enforce the corresponding model, events, and props in Vue and `defineForm`. A dynamic mode requires a model that can represent both contracts. Changing mode revokes pending work and releases previews. An incompatible supplied value reports an error until the caller replaces or clears it. Do not upload, download, or coerce a value because the mode changes.

`undefined` means uninitialized. `null` clears a single value. An empty array is the normal empty multiple value. Accept a boundary clear of `null` for multiple values and emit arrays after accepted edits.

Do not mix `File` and `AssetValue` in one model. Do not add a wrapper around `File`. UI row identities and preview URLs remain private.

The form renderer map changes independently of the display renderer map. The existing `file` display renderer continues to display stored assets.

### Selection configuration

| Field | Meaning | Rules |
|---|---|---|
| `accept` | Allowed extensions and MIME types | Use the same matching rules for picker and drop. This is a client selection rule, not server validation. |
| `maxSize` | Maximum size per selected file in MB | Use decimal MB, equal to 1,000,000 bytes. Default to 10 MB for both families. This replaces the inconsistent current conversions and defaults. |
| `multi` | Single or multiple value | Defaults to single. Literal values retain exact model checking. |
| `limit` | Maximum collection count | Optional for both local and asset collections. Count owned pending uploads toward capacity. |
| `destination` | Asset upload destination | Available only in asset mode. Maps to `UploadContext.destination`. Replaces `uploadPath` without an alias. |
| `transform` | Optional file transformation | Accepts `File` and an abort context. Returns `File` synchronously or asynchronously. Available in both modes. |
| `upload` | Optional asset upload override | Available only in asset mode. Uses `UploadOperation<AssetValue>`. Defaults to the app asset service upload. |

Validate the complete candidate batch before processing. Reject a batch if any candidate is invalid or the batch exceeds capacity. Validate transformed files again before commit or upload. Keep the previous committed value on failure. Single selection replaces the previous value only after processing succeeds.

`transform` can compress, crop, sanitize, inspect, or reject local files. Return the original file after inspection. Throw an error to reject the candidate. The hook cannot update the model directly or return an arbitrary result. Existing stored asset selections bypass `transform` and `upload` because they supply no local bytes.

Mode and transformation are independent. In asset mode, transform the acquired file before uploading and committing an asset. In file mode, apply the same transform before committing the local file. Adding or removing a watermark, timestamp, or metadata does not determine the mode. The intended value and automatic storage behavior determine the mode.

An `upload` override replaces only the transport operation. The input retains cancellation, progress, pending state, error reporting, and commit ownership. Read and preview still use the app asset service. Validate the override result through the same canonical asset boundary. A response such as JSON text or an external service receipt belongs in an application action with file mode.

Disabled controls start no selection, drop, remove, reorder, capture, retry, or file manager commit. Already accepted asynchronous work may finish if its owner is still current.

### Ownership

A private acquisition implementation owns picker reset, drop events, metadata validation, and selection errors. All input presentations use this implementation. It has no storage or content-processing policy.

One shared value and operation owner manages collections, transformations, pending jobs, and commits for each input instance. Mode-specific behavior remains internal. Image presentation owns object URLs and revokes them on replacement, removal, and disposal. Restored files receive new preview URLs. Neither object URLs nor private rows enter the model.

Asset mode adds asset reads, asset previews, existing asset selection, and upload to that owner. The existing global `AssetAdapter` remains the default storage boundary. File mode does not resolve or require that service.

File manager selection supplies stored assets. It does not supply local bytes. Local controls do not offer existing asset selection without a separate application download action.

Application actions own file reads, transforms that belong to submission, uploads on submit, and external requests. They build the endpoint's wire value. A `File` draft does not imply a JSON request containing that object.

### Asynchronous work and errors

Each processing job has one identity, owner generation, abort controller, progress value, and pending token. The same job covers transform and any subsequent upload. Only completed values enter the model. Removal, clear, target replacement, mode or hook replacement, and disposal revoke ownership and abort affected work. Late results cannot change the current value or error. Cancellation remains best effort for external side effects.

Release each pending token once on completion, failure, or revoked ownership. A managed form cannot submit while owned field work remains pending.

An upload failure preserves the previous committed value, removes its pending row, releases pending state, and reports an input error. The error blocks managed submission until a new accepted selection, clear, or reset clears the error. Offer clear even when the committed value is empty. Do not add retained retry rows in this redesign.

Preserve the current Form reset contract. A reset to an unchanged committed value can retain accepted pending work. A reset that changes the target invalidates obsolete work. Do not infer a reset from an equal model echo.

File mode without a transform commits accepted picker files synchronously. Transforms, camera conversion, and canvas export can be asynchronous. They use the existing form pending contract and reject stale completions. Local asynchronous errors require no data adapter.

### Camera and drawing

Camera acceptance creates `capture.png` with MIME type `image/png`. Drawing acceptance creates `drawing.png` with the same MIME type. Keep camera permission handling and media stream shutdown in the camera control.

Remove `DrawingCanvas.onSave` and its string result model. Restore pixels from a local file in file mode or the service preview in asset mode. Loading an asset never starts an upload. A remote image that cannot be decoded into an exportable canvas reports an input error. Clear removes the pixels. A stale decode cannot replace a newer drawing. Export failure preserves the previous committed value and reports an input error.

Camera and drawing feed local bytes to the same owner used by file and image selection. Do not add separate storage implementations or asset-specific source components.

## 4. User journeys and workflows

### Import JSON without storage

1. The form holds a browser `File` and uses the `file` renderer with `mode="file"`.
2. The user selects the JSON file. The control validates metadata and updates the draft.
3. The user submits. The submit function reads `await source.text()` and calls the existing import action.
4. The endpoint retains its `{ fileText: string }` request, strict parser, domain validation, and transaction.

The file byte limit and the endpoint's string length limit are different checks. Keep the endpoint check. Do not equate the two limits in documentation.

### Transform or send a local image

1. The user selects an image through `ImageInput` with `mode="file"` or accepts a camera capture in that mode.
2. Application code receives the local `File`.
3. An optional `transform` processes the file before commit. The application sends it through its chosen transport when the workflow requires that action.
4. The application owns its request result and failures. The input retains its local value contract.

### Edit a stored attachment

1. The form loads a canonical asset into `FileInput` or `ImageInput` with `mode="asset"`.
2. The user selects a local file or an existing stored asset.
3. The owner applies any transform and uploads the local file through the configured operation. Existing selections pass through the canonical asset reader.
4. The editor commits a canonical asset while it still owns the operation.
5. The form submits canonical assets through the existing stored-field contract.

| Trigger or condition | Result | Next step |
|---|---|---|
| Invalid candidate batch | Keep the previous value and show the selection error | Select a valid batch |
| Pending asset upload | Show progress and block managed submission | Await completion or remove the pending selection |
| Upload failure | Keep committed assets and show the input error | Select again, clear, or reset |
| Target changes during pending work | Revoke ownership and ignore late completion | Continue with the new target |
| Reset retains the same committed target | Preserve accepted work under the existing reset rule | Let that work complete |
| Camera permission or export fails | Keep the previous local value and report the source error | Repeat acquisition or cancel |

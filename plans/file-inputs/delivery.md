# File input redesign evidence and delivery

Design: Approved
Implementation: Current

## Execution checklist

- [x] Read the Principles section of poteto-mode.
- [x] Phase A: Frame.
- [x] Phase B: Design the workflow.
- [x] Phase C: Run the loop.
- [x] Phase D: Keep the audit trail.
- [x] Phase E: Verify and hand back.
- [x] Record the current contract and approval in this plan.
- [x] Capture the Loom type, diagnostics, and input-test baseline.
- [x] Implement shared file acquisition and value ownership. Prove local file mode without adapters.
- [x] Add asset mode upload, transforms, canonical results, and owned cancellation.
- [x] Move camera and drawing to the shared operation owner. Prove stream and decode cleanup.
- [x] Update renderer inference, direct component types, examples, and agent guidance.
- [x] Run focused unit, browser, type, diagnostic, and required package checks.
- [x] Review the full diff and record actual proof and remaining gaps.

The user approved the current mode design before implementation.

## Work record

- Read the poteto-mode Principles section.
- Phase A, Frame. Complete. Deliver a concrete architecture proposal for local and stored file values.
- Phase B, Design the workflow. Complete. Trace both repositories, compare two designs, obtain an independent verdict, and write the proposal.
- Phase C, Run the loop. Complete. Shared acquisition and operation ownership support local Files and canonical stored assets. Camera and drawing use the same owner.
- Phase D, Keep the audit trail. Complete. Decision and proof checkpoints are in `.audit/file-inputs.tsv`.
- Phase E, Verify and hand back. Complete. Package, browser, type, diagnostics, framework web, and surface architecture checks passed. This status covers automated proof in this working tree.
- Regression repair. Keep an upload or transform error active when an unrelated multi-file operation commits. A model write clears the Form control error as part of normal edit handling, so the shared owner re-emits its current error after the write. A new accepted selection clears the error before its work starts.
- Browser proof correction. The parent rerun reported 9 of 10 browser tests passing. The local-file form displayed the restored baseline, but its action assertion ran before browser `File.text()` completed. The test now waits for the submit action call with `vi.waitFor`; the focused case passed and the full browser command passed three consecutive runs. The failure screenshot and browser attachment are in `.audit/file-inputs-browser-failure/`.
- Test consolidation. Removed `upload-operations.spec.ts` with its private `useUploadMutation` hook. Its source-shape assertion no longer described the shared controller. Public input tests now cover upload context, destination, signal, progress, per-row progress, concurrent Form pending state, cancellation, late results, and visible failure behavior. The old helper's rejection contract was private and was replaced by the inputs' rendered error contract.

The initial design exploration and independent review covered separate components and a generic operation interface. The revised mode-based proposal incorporates the user's preference for one component per logical input and was approved by the user. The revised proposal did not receive a second independent design review.

The managed local-file checkpoint passed after the shared owner and public mode types were in place. It did not precede the full stored-editor migration, as the planned sequence required. That sequence deviation is recorded here.

## Baseline source evidence before implementation

| Source | Finding |
|---|---|
| `packages/loom/src/components/inputs/FileInput.vue` | Acquires files, creates private pending rows, and immediately calls the asset service. |
| `packages/loom/src/components/inputs/ImageInput.vue` | Adds image presentation while retaining the asset upload boundary. |
| `packages/loom/src/assets/contracts.ts` | `AssetValue` requires stored identity. `AssetAdapter` owns read, preview, and upload. |
| `packages/loom/src/contracts/upload.ts` | Upload is already generic and carries destination, abort, and progress context. |
| `packages/loom/src/components/inputs/useUploadMutation.ts` | Uses the data error normalizer and groups active controllers. |
| `packages/loom/src/forms/defineForm.ts` | Assigns asset model types to the `file` and `image` form renderers. |
| `packages/loom/src/forms/draftValues.ts` | Preserves non-plain objects, which permits local File draft identity in principle. |
| `packages/loom/src/components/core/Form.vue` | Reset remounts controls with current control errors. |
| `packages/loom/src/components/inputs/CameraInput.vue` | Converts capture to a file and uploads it. |
| `packages/loom/src/components/inputs/DrawingCanvas.vue` | Uses an unconstrained save callback with a string model. |
| `docs/resource_system_overhaul/ARCHITECTURE.md`, section 4.4 | Currently requires file and image controls to use the asset service. |
| `docs/ui/forms.md` | Permits a custom field for unsupported requirements and requires canonical values for stored fields. |
| `/Users/gamer/Documents/school/agentic-bi-eval/apps/web/src/routes/(authenticated)/test-runner/test-cases/create.route.vue` | Reads `File.text()` through a native picker. |
| `/Users/gamer/Documents/school/agentic-bi-eval/apps/api/src/routes/(authenticated)/test-cases/import/+server.ts` | Accepts text and invokes the domain import. No asset value is required. |

The source establishes the architectural restriction. It does not establish the original author's intent.

## Alternatives and verdict

Two independent candidates examined separate local and asset controls and a generic `FileOperation<T>` control. Both favored the separate contracts. An independent judge selected the same base.

The generic operation design supports conversion during selection. It also requires public rules for result descriptions, loaded values, operation replacement, and form inference. Existing application actions already own these operations. Reject that public design.

The user rejected duplicate components for storage variants. The revised proposal keeps separate value contracts behind an optional mode on the existing components. Asset mode is the default because asset upload is the common workflow. Use narrow `File` transformation and `AssetValue` upload hooks. Transformation applies independently in either mode. Do not expose arbitrary result processing through the input.

Reject new `LocalFileInput`, `AssetInput`, and `AssetImageInput` components. An optional mode selects the value contract without separate component imports.

Redesign from First Principles separates acquisition from storage policy. Model the Domain keeps local files, stored assets, and processing jobs distinct behind the same component API. Prove It Works limited the initial verdict to source evidence. Runtime and type inference proof now appear below.

## Delivery units

1. Implement shared acquisition and local controls. Prove standalone use and the managed local-file form checkpoint.
2. Connect asset mode and typed transform and upload hooks to the shared owner. Preserve asset service isolation, canonical values, and accepted-work ownership.
3. Change camera and drawing contracts. Prove source cleanup, restored drawing pixels, and stale export rejection.
4. Migrate form renderer contracts, model inference, imports, current examples, and diagnostics. Keep display renderers separate.
5. Update the architecture guide, forms guide, and applicable agent skills. Scope stored-asset symmetry to stored fields. Include local read, external send, and stored edit examples.
6. Run sufficient package checks and browser proof. Follow `test-audit` before any test edits or review. Sync the consumer app only through the authorized framework update procedure.

Use the repository skill-authoring rules when agent guidance changes. No compatibility aliases remain after migration. Do not turn this work into a ban on native controls.

## Implementation and proof

| Check | Result |
|---|---|
| `pnpm --filter @southneuhof/loom type-check` | Passed after final source changes. |
| `pnpm --filter @southneuhof/loom test:diagnostics` | Passed: 51 Loom contract cases, 14 TypeScript surface cases, and 8 Vue surface cases. |
| `pnpm --filter @southneuhof/loom test` | Passed after the shared error-ownership fix and regression test: 66 files and 560 tests. |
| `pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/FileInput.spec.ts src/components/inputs/__tests__/ImageInput.spec.ts src/components/inputs/__tests__/CameraInput.spec.ts src/components/inputs/__tests__/DrawingCanvas.spec.ts` | Passed after the shared error-ownership fix: 4 files and 62 tests. |
| `pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/FileInput.spec.ts -t "keeps a failed upload error after a sibling succeeds"` | Regression failed before the fix at the assertion that the upload error remains after sibling success. Passed after the fix: 1 test. It also proves that submit stays blocked until a new accepted selection clears the error. |
| `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/inputs/__tests__/FileInput.browser.spec.ts src/assets/__tests__/AssetParity.browser.spec.ts` | Parent first observed 9/10 passing because the test returned before browser `File.text()` completed. The test now waits for the action call. Focused local-file browser case passed, then this full command passed 3 consecutive runs, each with 2 files and 10 Chromium tests. It covers local File selection, baseline reset, text submission without `adapters.assets`, local drop, and app-scoped asset isolation. |
| `pnpm --filter @southneuhof/framework-web type-check` | Passed. Route generation and Vue type checks completed. |
| `pnpm run test:surface-architecture` | Passed: 34 static architecture tests and the surface scan. |

Focused unit checks pass for file, image, camera, and drawing behavior. They cover local transforms, source and transformed validation, default and override uploads, canonical upload validation, progress, abort on removal, stale completion, same-file reselection, atomic invalid and over-capacity batches, hook replacement, mode changes during pending work, preview URL cleanup, camera stream cleanup after mode changes, drawing restore/export, stale decode cancellation, pending drawing cancellation, form buttons that do not submit by default, and the unchanged pending-work reset rule.

The JSON import endpoint and `/Users/gamer/Documents/school/agentic-bi-eval` were not changed. Camera permission and physical device capture were tested with a mocked media stream; no physical camera was used. Only the Loom framework package changed. No other framework package or consumer app changed.

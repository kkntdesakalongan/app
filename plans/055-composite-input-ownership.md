# Plan 055: Give filters and composite inputs their own definitions and loaders

> Read architecture §§4.3, 7.2-7.4, and 10. Run the drift check first and update row 055 after review. Do not commit or push unless asked.
>
> **Drift check:** `git diff --stat 40afee2..HEAD -- packages/loom/src/components/composites/form-inputs packages/loom/src/components/views/ListView.vue packages/loom/src/renderers/inputProps.ts apps/web/src/framework/inputs/registry.ts`. Compare current-state excerpts; stop if ownership changed.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** HIGH; **Depends on:** 052, 053, 054; **Category:** migration; **Planned at:** `40afee2`, 2026-09-23.

## Why this matters

Nested editors and lookup controls still use universal fields. They also infer loaders from resources or write into another form. The target gives each composite one explicit surface definition and lets the owning form control its draft.

## Current state

- `packages/loom/src/components/composites/form-inputs/TableInput.vue:23-35` requires shared `fields` and optional table/form option objects.
- `.../LookupInput.vue:27-47` accepts `fields`, `load`, `loadDetail`, `transform`, `formDataSetter`, `formData`, and `onSelectData`; lines 51-53 resolve fields as a table.
- `.../LocationInput.vue:50-55` makes a schema-free `FieldCatalog<Coordinate, Coordinate>` for its editor.
- `packages/loom/src/components/views/ListView.vue:34-40` declares filter fields as `FieldsInput<TQuery,TQuery>`. Existing test patterns are `components/composites/__tests__/{TableInput,LookupInput,LocationInput}.spec.ts` and `LookupInput.browser.spec.ts`.

Current cross-form props (`LookupInput.vue:43-47`):

```ts
  onCommit: { type: Function as PropType<(data: RecordData[]) => unknown>, default: () => {} },
  formDataSetter: { type: Function as PropType<(newData: any) => void>, default: () => {} },
  hidePreviewTable: Boolean,
  formData: Object,
  onSelectData: Function as PropType<(formData: any, selectedData: RecordData[], setter: (data: any) => void) => void>,
```

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Types | `pnpm --filter @southneuhof/loom type-check` | new composite contracts clean; remaining app callers logged |
| Unit tests | `pnpm --filter @southneuhof/loom test` | composite and filter suites pass |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | lookup and nested editor paths pass |

## Scope

**In:** `packages/loom/src/components/composites/form-inputs/{TableInput,tableInput.types,LookupInput,LocationInput,MultiLocationInput}.*`, `components/views/ListView.vue` filter logic, `renderers/inputProps.ts`, related source adapters/tests/type fixtures. Modify `apps/web/src/framework/inputs/registry.ts` only when required to remove resource introspection; finish app wiring in Plan 056.

**Out:** resource operation implementation, app business schemas, backend endpoints, unrelated `FileManager` provider `operations.list()` APIs. Keep upload-pending and file/image behavior.

## Git workflow

Continue on `resource_system_overhaul` after Plans 052-054. Do not ship an intermediate state. Do not commit or push unless asked.

## Steps

1. Make filters an explicit submit-free `FormDefinition` with a raw query schema and selected inputs. ListView owns its controlled draft and calls Form `validate()`. Commit only the latest valid parsed partial query, clear removed keys, and reset page. Never run a mutation or inherit create defaults. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/components/views/__tests__/views.spec.ts --environment jsdom` exits 0 with filter reset, namespace, no submit dispatch, and stale-result cases.
2. Change TableInput to `table`, optional submit-free `form`, and `toDraft(row)`. TableInput owns row data; editor requires row form and mapping; read-only requires only table/model. Reject a table loader/data binding and a form submit/load/model binding with `COMPOSITE_BINDING_CONFLICT`. Mount a flat DialogForm with local insert/replace functions. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/components/composites/__tests__/TableInput.spec.ts --environment jsdom` exits 0; included type negatives cover conflicts.
3. Give LookupInput its own table definition and explicit `load`/`loadDetail` source. Keep controller-owned result loading, selection, scalar hydration, multi selection, search parameters, and cancellation. Remove resource `.list()` introspection, `transform`, `formDataSetter`, `formData`, and `onSelectData`; dependent draft updates use Form behavior. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/components/composites/__tests__/LookupInput.spec.ts --environment jsdom` exits 0; `pnpm --filter @southneuhof/loom test:browser` includes lookup coverage.
4. Give LocationInput a raw location schema and normal model-bound Form definition. Preserve map config, autocomplete/detail cancellation, coordinate conversion, and location operations. Confirm asset/file/image adapters still hold pending uploads until settled. **Verify:** `pnpm --filter @southneuhof/loom exec vitest run src/components/composites/__tests__/LocationInput.spec.ts src/components/inputs/__tests__/FileInput.spec.ts --environment jsdom` exits 0; included type fixture rejects old field catalog input.

## Test plan and done criteria

- Follow the cited composite suites for event/DOM setup; add included `__type-tests__` for conflict contracts.
- [ ] Composite-owned `data`, `load`, `submit`, and `model` conflicts fail both authoring checks and runtime guards.
- [ ] Lookup adapters receive functions, never a resource object.
- [ ] No cross-form writer props remain in executable composite code.
- [ ] `git diff --check` exits 0; dependent app failures are listed.

## STOP conditions

- A current composite workflow cannot represent its selected value in the form schema input/output contract.
- A loader must perform network work from a display accessor.
- The change would alter backend location, asset, or file-manager contracts.

## Maintenance notes

Use distinct types for stored row output and editable row input. A row form is reusable outside TableInput, so keep it submit-free and let the owner bind the mutation.

Plan 054 already migrated ListView filters to a submit-free Form definition and added stale parsed-result, transformed-key clearing, and reset coverage. Verify Step 1 against that implementation; do not create a second filter path. Plan 054's full Loom checks leave two failing `TableInput.spec.ts` cases, one failing `LookupInput.browser.spec.ts` case, and 33 diagnostics in input/composite files and fixtures for this plan. The browser run also warns that `FileInput` does not receive Form's ID and ARIA attributes through its fragment root; address that input integration while preserving its upload behavior.

## Review result

DONE after review. TableInput uses separate row table and submit-free form definitions with `toDraft`; its local array updates have mounted behavior tests. LookupInput owns loading, hydration, selection, and cancellation through an explicit source. LocationInput binds a raw schema through a submit-free Form definition. FileInput keeps its native control mounted for Form ID and error links and keeps the add controls available for sequential multi-file uploads. The unused lookup customization props and TableInput array wrappers were removed during review.

Independent checks after the final revision: Loom unit tests passed (71 files, 502 tests), Loom browser tests passed (10 files, 34 tests), and `git diff --check` passed. Loom type-check still reports only `Drawer.vue:66` and `Tabs.vue:28`, both assigned to Plan 058. The full browser run reports non-failing DialogContent title/description warnings outside the focused LookupInput suite.

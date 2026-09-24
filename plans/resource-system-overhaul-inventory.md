# Resource surface architecture inventory and baseline

Captured for Plan 051 on 2026-09-23, before its source changes.

## Migration inventory

| Group | Current paths and owner | Target plan | Proof |
|---|---|---|---|
| Public types/exports | `packages/loom/src/contracts/{fields,components,schema,validation,index}.ts`, `src/index.ts`, `src/renderers/index.ts`, `src/resources/index.ts`, public API tests, and `packages/loom/package.json`; Loom contracts and barrels own the exported surface. | 051 adds independent contracts; 058 removes old exports. | `contracts/fields.ts` defines the shared `Field*` catalog; `contracts/index.ts` and `src/index.ts` export it; `src/__tests__/public-api.spec.ts` covers the public package. |
| Field/schema runtime | `packages/loom/src/fields/`, `src/validation/{zod,select,index}.ts`, form renderer/input contracts and adapters; the Loom field catalog and Zod bridge own field resolution and wrapped validation. | 051 adds the raw schema compiler; 052 moves form compilation and behavior; 058 removes old runtime paths. | `fields/defineFields.ts`, `fields/resolve.ts`, `fields/schemaMetadata.ts`, `validation/zod.ts`, and their test directories. |
| Primitive components | `packages/loom/src/components/core/{Form,Table,TableContent,TreeTable,Detail,Collection}.vue`, `useCoreData.ts`, and `useTablePreferences.ts`; core components own mounted state and presentation. | 052 owns forms; 053 owns read-only surfaces; 058 removes replaced paths. | Core component files and `components/core/__tests__/` fixtures. |
| Wrappers/views | `packages/loom/src/components/composites/DialogForm.vue`, `components/views/{FormView,ListView,DetailView}.vue`, helpers, browser fixtures, and type fixtures; wrappers own page composition and forward to core components. | 052 owns DialogForm; 054 owns complete resource/view bags; 058 proves removal. | DialogForm, view components, their test directories, and `components/**/__type-tests__/`. |
| Nested inputs | `packages/loom/src/components/composites/form-inputs/{TableInput,LookupInput,LocationInput}.vue`, `tableInput.types.ts`, adapters, and tests; each composite currently owns input-specific behavior. | 055. | The listed components and `components/composites/__tests__/` cover row editing, lookup, and location behavior. |
| Resource operations | `packages/loom/src/resources/{actionResource,defineResource,runtime,identity,routeAccess,index}.ts` and tests; Loom resource modules own operation declarations, identity, access, and invalidation. | 054 adds the new declaration and result bags; 058 removes old paths. | `resources/defineResource.ts`, `resources/actionResource.ts`, and `resources/__tests__/`. |
| Plugin integration | `packages/loom/src/adapters/plugin.ts`, project adapters, renderer registry/input props, plugin tests, resource runtime registration, and `apps/web/src/main.ts`; plugin and adapter modules own app setup. | 051 adds `form` and shared `display` registries while retaining legacy `table` and `detail` registries only for existing unmigrated callers; 053/058 remove those legacy registries; 054 migrates resource registration; 058 removes duplicate paths. 053 resolves formatter keys after app configuration and accepts configured custom formatter names; 051 constructors only validate that `format` is a string because they have no app formatter context. | `renderers/registry.ts`, `adapters/plugin.ts`, `adapters/__tests__/plugin.spec.ts`, and `apps/web/src/main.ts`. |
| Export pipeline | `packages/loom/src/services/{export,excel}.ts` and tests; service modules own export mapping and pagination. | 053. | Export service files and their test files. |
| App defaults | `apps/web/src/configs/defaults.ts`, dictionary uses, `framework/fields/{presets,renderers}.ts`, and tests; web config and framework field modules own shared defaults and renderer setup. | 056. | `configs/defaults.ts`, `framework/fields/`, and their test files. |
| App boundaries | `apps/web/src/framework/{schema.ts,hono/contracts.ts}`, action/type tests, and `framework/inputs/registry.ts`; app schema and Hono/SDK adapters own endpoint inference. | 056. | The named contract files and related tests. |
| Settings modules | Users, roles, permissions, `roles/[roleId]/detail/permissions/role-permissions`, and `users/[userId]/detail/role-assignments` resource/schema/action/route files; each settings module owns its screen configuration. | 056. | Route files under `apps/web/src/routes/(authenticated)/settings/` and their `.resource.ts`, `.schema.ts`, `.actions.ts`, and `.route.vue` siblings. |
| App regression fixtures | `apps/web/src/framework/acceptance/QueryOwnershipFixture.*`, asset-form fixtures, route/resource/schema-import/identity tests, router guards and nested-navigation tests, browser/E2E routes, and generated route contracts; app acceptance and routing tests own these regressions. | 052–056; final removal checks in 058. | `framework/acceptance/`, `framework/__tests__/`, `router/__tests__/`, browser tests, and `scripts/generate-route-types.mjs`. |
| Adjacent integrations | File/image inputs, FileManager/AssetPicker, their adapters and tests; Loom input and file-manager modules own upload and preview behavior. | 055–056; final checks in 058. | `components/inputs/`, `components/utils/FileManager/`, `file-manager/`, and their tests. Provider `operations.list()` APIs remain outside the resource-surface migration. |
| Generators/checkers | `scripts/scaffold-bounded-module.mjs`, `scripts/module-ui-check.mjs`, tests, `test-support/bounded-fixture.mjs`, verification/evidence scripts, module-tooling/module-skills tests, and Python module-skill checks; repository scripts and skill tooling own generated modules and static checks. | 057; final removal check in 058. | Named scripts and the `scripts/__tests__/`, `test-support/`, and skill test locations. |
| Agent/documentation entrypoints | Root `AGENTS.md`, `DESIGN.md`, Loom README/public docs, `docs/ui/{forms,collections}.md`, web architecture docs, custom-field and file-manager references; repo and package docs own active guidance. | 057; removal verification in 058. | The named docs and `rg` searches for active references to the old field model. |
| Skills | `build-resource-form`, `web-ui-surfaces`, `migrate-web-resource`, `implement-schema-first-zod`, `carta-module-{design,plan,development}`, `verify-carta-module`, their references/scripts/tests, including `frontend-field-contract.md` and `web-query-cache.md`; skill directories own agent workflows. | 057. | Skill directories under `.agents/skills/` and their referenced files. |
| Tooling configuration | Loom/web effective Vue type-check configs, explicit browser-test include lists, package validation scripts, and CI entrypoints; package and CI configuration owns check discovery. | 051 changes Loom unknown-prop checking; 057 updates normal validation; 058 runs final gates. | `packages/loom/tsconfig.json`, `packages/loom/vitest.browser.config.ts`, `apps/web/tsconfig.vitest.json`, package scripts, and CI files. |

## Cold baseline

### Repository and tools

- Branch: `resource_system_overhaul`.
- HEAD: `e59473b` (`40afee2` is the plan's Planned at commit).
- Branch relation at capture: ahead of `origin/resource_system_overhaul` by 2 commits.
- Initial working tree: modified `plans/051-surface-contracts-and-schema-compiler.md`, plans 052–058, and `plans/README.md`; no source files were modified. These changes predated Plan 051 execution and remain preserved.
- Node: `v26.9.0`.
- pnpm: `12.1.0`.
- Vue type checker: workspace `vue-tsc` resolves to TypeScript `6.0.2`; Loom and web declare `vue-tsc` `^3.3.11`.
- Vitest: `4.1.10`.
- Web Zod dependency: `zod` `^4.5.0`; Loom validation tests import both `zod/v3` and `zod/v4`.

### Baseline commands

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter @southneuhof/loom type-check` | 0 | Passed. |
| `pnpm --filter @southneuhof/framework-web type-check` | 0 | Passed. `ensure-routes-contract` and `routes:generate` completed before `vue-tsc`. |
| `pnpm --filter @southneuhof/loom test` | 0 | 60 files and 499 tests passed. Vitest printed Node localStorage experimental warnings. |
| `pnpm --filter @southneuhof/framework-web test` | 1 | 45 files total: 41 passed and 4 failed during import; 217 tests passed. `App.spec.ts`, `framework/adapters/bundle.spec.ts`, `router/__tests__/navigation.spec.ts`, and `router/__tests__/nested-navigation.spec.ts` throw `TypeError: Cannot read properties of undefined (reading 'getItem')` from `packages/utilities/src/storage.ts:4`, because `localStorage` is undefined. This is baseline state and is outside Plan 051 scope. |
| `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json --extendedDiagnostics` | 0 | 997 files; 148,851 types; 564,394 instantiations; checker memory 758,191K; check time 2.62s; total time 4.10s; command wall time 4.88s. |
| `pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false -p tsconfig.vitest.json --extendedDiagnostics` | 0 | Route contract was generated by the preceding web type-check. 1,654 files; 297,633 types; 1,038,790 instantiations; checker memory 1,159,256K; check time 3.91s; total time 6.17s; command wall time 6.96s. |

Peak process memory was not measured by these `vue-tsc` commands. The checker memory values above are the only memory metrics available in this baseline.

## Plan 051 execution checks and handoff

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter @southneuhof/loom exec vitest run src/schemas/__tests__/compileSchema.spec.ts --environment jsdom` | 0 | 1 file and 6 tests passed. Covers Zod v3/v4, deferred defaults/transforms, async parse and nested issue paths, v3 success/failure parsing, unsupported preprocessing/union inputs, and passthrough/catch-all rejection. |
| `pnpm --filter @southneuhof/loom exec vitest run src/forms/__tests__/defineForm.spec.ts src/tables/__tests__/defineTable.spec.ts src/details/__tests__/defineDetail.spec.ts --environment jsdom` | 0 | 3 files and 6 tests passed. |
| `pnpm --filter @southneuhof/loom exec vitest run src/labels/__tests__/resolveLabel.spec.ts src/renderers/__tests__/registry.spec.ts --environment jsdom` | 0 | 2 files and 12 tests passed. |
| `pnpm --filter @southneuhof/loom test` | 0 | 65 files and 515 tests passed. Node printed its localStorage experimental warning. |
| `pnpm --filter @southneuhof/loom type-check` | 1 | No diagnostics in new Plan 051 files or included type fixtures. The new `checkUnknownProps: true` setting exposes 37 existing template-prop diagnostics in the following components; these are follow-up migration work and remain outside Plan 051. |
| `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json --extendedDiagnostics` | 1 | Same 37 existing template-prop diagnostics as the package check. 1,016 files; 154,055 types; 587,327 instantiations; checker memory 750,928K; check time 10.01s; total time 14.65s. |
| `pnpm --filter @southneuhof/framework-web type-check` | 0 | Route contract check and route type generation completed, then `vue-tsc` passed. |
| `pnpm --filter @southneuhof/framework-web test` | 1 | 45 files total: 41 passed and 4 failed during import; 217 tests passed. The same four baseline suites fail with `TypeError: Cannot read properties of undefined (reading 'getItem')` at `packages/utilities/src/storage.ts:4` because `localStorage` is undefined. This was not changed under Plan 051. |

### Unknown-prop diagnostics for follow-up plans

`checkUnknownProps: true` exposes these existing diagnostics (all `TS2353` except the noted `TS2559` cases):

| Path and line | Unknown member | Likely owner |
|---|---|---|
| `packages/loom/src/components/base/Drawer.vue:66` | `direction` | Assign to a later component plan; no current 051 owner. |
| `packages/loom/src/components/base/ImagePreview.vue:135`; `ImagePreviewMulti.vue:84` | `data-testid` | 055 adjacent file/image surfaces. |
| `packages/loom/src/components/composites/form-inputs/FileManager/_layouts/FileManagerDialogContent.vue:15` | `multi` | 055 adjacent file-manager surface. |
| `packages/loom/src/components/composites/form-inputs/LocationInput.vue:177,181` | `ignore`, `id` | 055 composite input migration. |
| `packages/loom/src/components/composites/form-inputs/LookupInput.vue:170` | `onClose` (`TS2559`) | 055 composite input migration. |
| `packages/loom/src/components/composites/form-inputs/MultiLocationInput.vue:27,39` | `onClose`; `onClose`, `onOpen` (`TS2559`) | 055 composite input migration. |
| `packages/loom/src/components/composites/form-inputs/TableInput.vue:128,137` | `aria-label` | 055 composite input migration. |
| `packages/loom/src/components/composites/Tabs.vue:28` | `aria-label` | Assign to a later component plan; no current 051 owner. |
| `packages/loom/src/components/core/Detail.vue:73` | `data-emphasis` | 053 detail display migration. |
| `packages/loom/src/components/core/TableContent.vue:433,445` | `aria-label` | 053 table display migration. |
| `packages/loom/src/components/inputs/CameraInput.vue:136` | `title` | 055 adjacent input surface. |
| `packages/loom/src/components/inputs/ColorInput.vue:217,242,260,271,289,314,334` | `data-testid`; `ColorInput.vue:301` has `dataTestid` | 055 adjacent input surface. |
| `packages/loom/src/components/inputs/FileInput.vue:277` | `data-upload-id` | 055 adjacent file input surface. |
| `packages/loom/src/components/inputs/IconSelectInput.vue:121` | `aria-label` | 055 adjacent input surface. |
| `packages/loom/src/components/inputs/YearInput.vue:77` | `ref` | 055 adjacent input surface. |
| `packages/loom/src/components/utils/FileComponent.vue:63,71` | `target` | 055 adjacent file surface. |
| `packages/loom/src/components/views/ListView.vue:374,395,446,519,538,557` | `aria-label` | 055 filter/view work; 056 app wiring. |
| `packages/loom/src/components/views/NavigationHeader.vue:31,35` | `aria-label` | 054/056 view migration. |

### New consumer contract diagnostics after Plan 052

The Plan 052 Form contract change adds these errors beyond the 37 existing template-prop diagnostics above. The owning later plans must update the consumers and fixtures when they migrate those surfaces.

| Path and line | Diagnostic | Likely owner |
|---|---|---|
| `packages/loom/src/components/composites/__type-tests__/table-input.type-test.ts:15` | `TS2741`: the legacy `TableInputFormOptions<Row>` fixture has no required raw `schema`. | 055 composite input migration. |
| `packages/loom/src/components/composites/form-inputs/LocationInput.vue:230` | `TS2345`: the nested Form call has no required raw `schema`; `TS2322`: its `Partial<Coordinate>` model update cannot satisfy a complete `Coordinate`. | 055 composite input migration. |
| `packages/loom/src/components/composites/form-inputs/TableInput.vue:95,121` | `TS2322`: `FieldsInput` may be a resolved-field array and does not satisfy the new keyed `FormFields` contract. | 055 composite input migration. |
| `packages/loom/src/components/views/__type-tests__/form-view.type-test.ts:13` | `TS2769` and `TS1360`: the old FormView variant and form fixture use the pre-migration form prop shape and omit raw `schema`. | 054 view bag migration. |
| `packages/loom/src/components/views/ListView.vue:380-381` | `TS2322`: filter `FieldsInput` and wrapped validation schema do not satisfy Form's keyed `FormFields` and raw `schema` props. | 054 view bag migration. |

The Plan 051 constructors check only that `format` is a string because they do not have app formatter configuration. Plan 053 must reject an unregistered formatter at runtime after app configuration while accepting configured custom formatter keys. The `table` and `detail` registries remain temporarily for current unmigrated callers; Plans 053/058 remove them after migration.

Plan 052 adds a narrow Date control adapter and renderer value compatibility checks for both the base and presentation renderer. Its augmented custom-renderer fixtures accept a numeric schema value for `rating` and reject a string schema value. No runtime adapter registry is needed for the current renderer set.

### Plan 054 view failures after the Plan 052 Form contract change

The following failures remain in the full Loom unit suite. `pnpm --filter @southneuhof/loom test` exits 1 with 65 of 67 files passing, 458 of 475 tests passing, and three unhandled errors. The tests still mount the old FormView or ListView filter contract, so Plan 054 owns these caller migrations. The three unhandled setup rejections also report `[loom][FORM_SCHEMA_REQUIRED]` from those old callers.

| Test | Result | Owner |
|---|---|---|
| `FormView runs the same chrome for create-like and update-like props, with no mode anywhere` | Form has no raw schema. | 054 |
| `FormView uses DetailView-style navigation and body cards` | Form has no raw schema. | 054 |
| `FormView renders page action slots without generic fallbacks` | Form has no raw schema. | 054 |
| `FormView renders submit and cancel chrome and re-emits form events` | Form has no raw schema. | 054 |
| `FormView uses responsive text and filled form actions while submitting` | Form has no raw schema. | 054 |
| `FormView disables FormView submit while an input operation is pending and keeps cancel enabled` | Form has no raw schema. | 054 |
| `FormView uses browser history through Cancel without resetting the draft` | Form has no raw schema. | 054 |
| `FormView lets body, header, and form actions slots replace their defaults` | Form has no raw schema. | 054 |
| `FormView guards dirty route exits, preserves drafts when staying, and registers native unload protection` | Form has no raw schema. | 054 |
| `FormView derives detail navigation, then list fallback, and stays without either target` | Form has no raw schema. | 054 |
| `FormView runs effects before default navigation and only controller calls suppress it` | Form has no raw schema. | 054 |
| `FormView keeps persisted form mounted when follow-up effect fails` | Form has no raw schema. | 054 |
| `ListView renders model-bound filter Form and resets filters without clearing search or limit` | Legacy filter field contract does not render the expected input. | 054 |
| `resource cache ownership refreshes inactive detail and reopened form data while preserving a mounted draft` | Expected `Tax ID` input is absent under the legacy FormView contract. | 054 |
| `resource cache ownership refetches two custom lists and keeps their query values separate` | Expected post-update reloads are not called. | 054 |
| `resource cache ownership isolates record and resource invalidation` | Expected post-update reload is not called. | 054 |
| `resource cache ownership keeps display and form variants separate and applies write invalidation rules` | Form has no raw schema. | 054 |

Vitest reports three unhandled `[loom][FORM_SCHEMA_REQUIRED]` setup rejections: two from `src/components/views/__tests__/views.spec.ts` FormView mounts and one from `src/components/views/__tests__/resource-cache.spec.ts` in `refreshes inactive detail and reopened form data while preserving a mounted draft`. Plan 054 owns those migrations.

### Plan 052 verification

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/form.spec.ts src/forms/__tests__/controlValues.spec.ts --environment jsdom` | 0 | 7 tests passed. |
| `pnpm --filter @southneuhof/loom exec vitest run src/forms/__tests__/useFormSession.spec.ts --environment jsdom` | 0 | 3 tests passed. |
| `pnpm --filter @southneuhof/loom exec vitest run src/components/composites/__tests__/DialogForm.spec.ts src/components/composites/__tests__/DialogForm.managed.spec.ts --environment jsdom` | 0 | 12 tests passed. |
| `pnpm --filter @southneuhof/loom exec vitest run src/components/inputs/__tests__/FileInput.spec.ts --environment jsdom` | 0 | 14 tests passed. |
| `pnpm --filter @southneuhof/loom test:browser` | 0 | 8 files and 27 tests passed. |
| `pnpm --filter @southneuhof/loom test` | 1 | 65 files passed and 2 Plan 054 view files failed; 458 tests passed and 17 Plan 054 tests failed; 3 Plan 054 setup errors. |
| `pnpm --filter @southneuhof/loom type-check` | 1 | 46 diagnostics: 37 existing unknown-prop diagnostics and the 9 consumer contract diagnostics above; no Plan 052 implementation or fixture diagnostics. |
| `git diff --check` | 0 | No whitespace errors. |

| Scope gate | Exit | Result |
|---|---:|---|
| `git diff --stat 40afee2..HEAD -- packages/loom/src/index.ts packages/loom/src/contracts packages/loom/src/validation packages/loom/src/renderers packages/loom/src/forms packages/loom/src/tables packages/loom/src/details packages/loom/src/labels packages/loom/src/schemas packages/loom/tsconfig.json` | 0 | No branch-source drift from the plan's `Planned at` revision. |
| `rg -n '^\| (Public|Field|Primitive|Wrappers|Nested|Resource|Plugin|Export|App|Settings|Adjacent|Generators|Agent|Skills|Tooling)' plans/resource-system-overhaul-inventory.md` | 0 | Lists all 17 architecture §9.1 inventory groups. |
| No-old-import search | 1 | No old field, `fromZod`, or `actionResource` imports found in new Plan 051 source files. |
| `git diff --check` | 0 | No whitespace errors. |

The no-old-import search command returned exit 1 because it found no matches:

```sh
rg -n 'from ["\x27].*(\.\./fields|fromZod|actionResource)|fromZod|actionResource|../fields' packages/loom/src/contracts/{details,display,forms,labels,tables}.ts packages/loom/src/{details,forms,labels,schemas,tables,renderers/displayContracts.ts} --glob '!**/__tests__/**' --glob '!**/__type-tests__/**'
```

### Plan 053 verification and dependent caller handoffs

The Table query loader parses each query with the shared `querySchema` compiler before it calls the app loader. Invalid queries do not call the loader. The loader receives parsed output. The wrapper preserves raw `page` or `limit` only when the schema output omits that framework-owned paging key; it drops other raw keys removed by the schema.

`display/requirements.ts` owns the target display requirements. Its schema-kind helper requires a format for Date records and an explicit display choice for structured records. Its runtime helper checks the actual value after the accessor and formatter run. Schema kind alone cannot prove that an accessor or custom formatter returns text. Plan 057 must move the static checker from the old `fields/displayRequirement.ts` path and align it with this display-only contract; Plan 058 removes the old field path.

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter @southneuhof/loom exec vitest run src/components/core/__tests__/table.spec.ts src/components/core/__tests__/TreeTable.spec.ts src/components/core/__tests__/detail.spec.ts src/components/core/__tests__/table-collection.spec.ts src/services/__tests__/export.spec.ts src/display/__tests__/resolveDisplay.spec.ts src/display/__tests__/requirements.spec.ts src/schemas/__tests__/compileSchema.spec.ts src/renderers/__tests__/registry.spec.ts --environment jsdom` | 0 | 9 files and 79 tests passed. This covers Table and TreeTable behavior, schema and runtime display requirements, query validation, export mapping, paging, exclusions, filename, and workbook text parity. |
| `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/core/__tests__/Table.browser.spec.ts src/components/core/__tests__/TreeTable.browser.spec.ts src/components/core/__tests__/DisplayParity.browser.spec.ts` | 0 | 3 browser files and 11 tests passed, including the joined-role Table, TreeTable, and Detail fixture. |
| `pnpm --filter @southneuhof/utilities exec vitest run src/__tests__/parse.spec.ts --environment jsdom` | 0 | 1 file and 7 tests passed, including configured formatter key lookup. |
| `pnpm --filter @southneuhof/loom test` | 1 | 67 of 70 files passed; 449 of 492 tests passed; 43 failed; Vitest reported 20 unhandled errors. `views.spec.ts` has 36 failing tests and `resource-cache.spec.ts` has 5. Both are Plan 054 handoffs: their old ListView and Detail bags still pass `fields` instead of `columns` and `fields`, and their FormView callers still use the Plan 052 form shape. The 20 unhandled errors report 16 `[loom][SURFACE_OPTION_INVALID] Table entries must be an ordered map` and 4 `[loom][SURFACE_OPTION_INVALID] Detail entries must be an ordered map` from those legacy view callers. `TableInput.spec.ts` has 2 failures (`renders rows and mutation controls through core components`; `hides mutation controls and reordering while disabled`), owned by Plan 055, because its nested Table still uses the old props. |
| `pnpm --filter @southneuhof/loom test:browser -- --reporter=verbose` | 1 | 8 of 10 files passed; 27 of 29 tests passed; 2 tests failed; 3 unhandled errors. `ListView.browser.spec.ts` test `ListView collection presentation > keeps one loader, query, and records when switching table and custom views` fails with `[loom][SURFACE_OPTION_INVALID] Table entries must be an ordered map` because ListView still passes `fields` to Table; Plan 054 owns this migration. `LookupInput.browser.spec.ts` test `LookupInput real dialog > selects a named record through the dialog and commits its scalar ID` fails; its two unhandled errors report `[loom][SURFACE_DATA_SOURCE_INVALID] Table requires exactly one of "data" or "load"` because the old nested Table binding supplies both source prop keys with one value undefined; Plan 055 owns this migration. |
| `pnpm --filter @southneuhof/loom type-check` | 1 | 50 diagnostics: 34 of the 37 Plan 051 unknown-prop diagnostics remain (the old Detail `data-emphasis` and two TableContent `aria-label` diagnostics are resolved), 9 Plan 052 consumer diagnostics remain, and 7 new Table contract diagnostics below belong to later callers. There are no diagnostics in display requirements/resolution, TableContent, Detail, TreeTable, export service, schema compiler, or the Plan 053 type fixture. |
| `git diff --check` | 0 | No whitespace errors. |

The new Table contract diagnostics are:

| Path and line | Diagnostic | Owner |
|---|---|---|
| `packages/loom/src/components/composites/__type-tests__/table-input.type-test.ts:16` | `TS2739`: the nested Table fixture omits required `schema` and `columns`. | 055 |
| `packages/loom/src/components/composites/form-inputs/LookupInput.vue:189,214` | `TS2353`: nested Table calls still pass removed `fields`. | 055 |
| `packages/loom/src/components/composites/form-inputs/TableInput.vue:111` | `TS2353`: nested Table call still passes removed `fields`. | 055 |
| `packages/loom/src/components/views/ListView.vue:252` | `TS2339`: ListView reads removed `TableProps.fields`. | 054 |
| `packages/loom/src/components/views/ListView.vue:321` | `TS2322`: ListView export options do not yet pass resolved visible columns. | 054 |
| `packages/loom/src/components/views/ListView.vue:490` | `TS2322`: ListView row-reorder payload uses `Record<string, unknown>` instead of `TRecord`. | 054 |

Plan 054 must migrate ListView to the required record schema and resolved `columns`, then pass those same visible columns to export. Plan 055 must migrate the nested Table calls in LookupInput and TableInput to the exact Table source and display contracts. The mutation-without-display-join assertion belongs in a real Form/resource flow in Plan 054 or 058; the Plan 053 browser fixture proves the joined role label through the read model and that display leaves its input records unchanged.

### Plan 056 implementation notes

The app display renderer map and its call sites now use the `display` registry. The two role assignment routes also rely on the bound `set` command to invalidate the resource after a successful write.

Users, roles, and permissions use `sort_by` and `sort` in their table query schemas. Their list actions map these keys to the existing API keys `sort` and `order`. Keep the table and API query schemas separate.

The nested role permission route has no usable inferred query type, so its table query schema stays local. The role assignment response item is `any` in the RPC type. Its action parses each item with the record schema at runtime; this does not provide a static Hono record check. Revisit these limits if the API route types become more precise.

### Plan 054 verification and handoff

Plan 055 must also resolve the browser warning where `FileInput`'s fragment root does not receive the Form-provided ID and ARIA attributes. Keep the upload behavior and verify the label/error relationship in a mounted form.

| Command | Exit | Result |
|---|---:|---|
| `pnpm --filter @southneuhof/loom exec vitest run src/components/views/__tests__/resource-cache.spec.ts src/components/inputs/__tests__/option-source.spec.ts src/components/views/__tests__/ListView.reorder.spec.ts src/resources/__tests__/boundResource.spec.ts src/components/views/__tests__/views.spec.ts --environment jsdom` | 0 | 5 files and 65 tests passed. Covers bound cache invalidation, resource-backed option loading, ListView reorder forwarding, operation access and writes, filter query behavior, and FormView submission/navigation. |
| `pnpm --filter @southneuhof/loom exec vitest run --config vitest.browser.config.ts src/components/views/__tests__/ListView.browser.spec.ts` | 0 | 1 browser file and 1 test passed. |
| `pnpm --filter @southneuhof/loom test` | 1 | 70 of 71 files passed; 499 of 501 tests passed. The only failures are the two `TableInput.spec.ts` cases that still pass the pre-Plan 053 Table contract; Plan 055 owns them. |
| `pnpm --filter @southneuhof/loom test:browser` | 1 | 9 of 10 files passed; 28 of 29 tests passed. The only failing test is `LookupInput.browser.spec.ts > LookupInput real dialog > selects a named record through the dialog and commits its scalar ID`; it reports two unhandled `[loom][SURFACE_DATA_SOURCE_INVALID] Table requires exactly one of "data" or "load"` errors. Plan 055 owns this Table migration. |
| `pnpm --filter @southneuhof/loom run type-check` | 1 | 35 diagnostics remain, all outside Plan 054. 33 belong to Plan 055 composite/input callers and fixtures (`ImagePreview`, `ImagePreviewMulti`, `FileManagerDialogContent`, `LocationInput`, `LookupInput`, `MultiLocationInput`, `TableInput`, `table-input.type-test.ts`, `CameraInput`, `ColorInput`, `FileInput`, `IconSelectInput`, `YearInput`, and `FileComponent`). Plan 058 owns the two remaining unknown-prop diagnostics in `Drawer.vue` and `Tabs.vue` as part of the final clean type-check gate. No diagnostic comes from the bound resource types, Plan 054 type fixtures, ListView, FormView, DetailView, or NavigationHeader. |
| `git diff --check` | 0 | No whitespace errors. |

The public `defineResource` type fixture also rejects a zero-argument identity function. It requires an identity declaration with one record parameter so the binder has an identity-bearing record contract.

## Plan 058 candidate evidence

Captured on 2026-09-24 on `resource_system_overhaul`. This section records the candidate state before final review. Plan 058's review result is in its plan file.

### Removed paths and group proof

| §9.1 group | Candidate proof |
|---|---|
| Public types/exports | `contracts/index.ts` and `src/index.ts` export surface contracts and constructors. The public API test checks current exports and confirms that removed paths do not exist. |
| Field/schema runtime | `src/fields/`, `src/validation/`, and the old contract files are absent. Form behavior, display resolution, and raw schema compilation live in `forms/`, `display/`, and `schemas/`. |
| Primitive components | `Form`, `Table`, `TreeTable`, and `Detail` use the independent contracts. Loom type-check passes with `strictTemplates` and `checkUnknownProps` enabled. |
| Wrappers/views | `DialogForm`, `FormView`, `ListView`, and `DetailView` use complete primitive bags. FormView's positive Vue type fixture compiles against the SFC template. |
| Nested inputs | `TableInput` and `LookupInput` own their row, source, and binding contracts. Their unit, browser, and type fixtures pass. |
| Resource operations | `defineResource` accepts one declaration object. `actionResource.ts` and its legacy tests are absent; `bindResource.ts` and `operations.ts` own binding and result types. |
| Plugin integration | Plugin setup registers adapters, query runtime, and the current renderer/input registries. Field-default injection and resource runtime copies are removed. Plugin and adapter tests pass. |
| Export pipeline | Export and Excel paths resolve shared display columns. The Loom suite passes the export tests. |
| App defaults | `configs/defaults.ts` and `framework/fields/` are absent. Labels, status data, input presets, and display presets have separate owners under `apps/web/src/configs/`. |
| App boundaries | Web schema and Hono contracts use raw operation schemas. The web type-check and contract fixtures pass. |
| Settings modules | Users, roles, permissions, role permissions, and role assignments use local schemas, surface definitions, actions, and resource bindings. Route tests pass in the web suite. |
| App regression fixtures | Query ownership, route typing, schema identity, and acceptance fixtures use current bags. The web unit suite passes. |
| Adjacent integrations | File, image, location, lookup, and file-manager paths pass Loom unit and browser suites. |
| Generators/checkers | The new checker parses TypeScript, Vue templates, active Markdown examples, and fresh bounded-module output. Module tooling passes. |
| Agent/documentation entrypoints | Root instructions, DESIGN, READMEs, UI docs, and web architecture text describe the current definitions and raw schemas. Active examples pass the checker. |
| Skills | Active form and web-surface guidance names the separate input/display definitions. The retired schema guide is user-invoked and redirects to current module guidance. |
| Tooling configuration | Loom and web configs enable `strictTemplates` and `checkUnknownProps`. Browser parity files are in the explicit include list. Root tests and web-validation CI run the architecture gate. |

The checker tests reject aliased removed imports, old resource signatures and factories, calls from named and aliased `.resource` imports in TypeScript and Vue expressions, and removed props on Loom Form, DialogForm, and Table imports from package and canonical relative paths. They reject flat view bags and `Table.fields`, while allowing command `run`, form/detail `fields`, local Form imports, and provider `.list()` calls. The Vue type fixture covers rejected `Form :form` and `DialogForm :form` bindings with `@vue-expect-error`; removing either directive exposes a TS2353 diagnostic. Eleven checker tests pass.

### Candidate gates

| Command | Exit | Result |
|---|---:|---|
| `pnpm run test:surface-architecture` | 0 | Eleven tests passed; workspace source, active examples, generated bounded-module output, removed paths, and Vue type-check settings passed. |
| `pnpm --filter @southneuhof/loom type-check` | 0 | Passed with no Vue template diagnostics. Included resource and component type fixtures reject create results without identity and removed `form` props on Form/DialogForm. |
| `pnpm --filter @southneuhof/loom test` | 0 | 60 files and 371 tests passed. |
| `pnpm --filter @southneuhof/loom test:browser` | 0 | 10 files and 34 tests passed. Form parity covers Form, DialogForm, FormView, and extracted resource forms for constructor and plain object definitions. Create results include the resource identity. Display parity covers direct and extracted Table/Detail bags with one list load, one detail load, no fetch calls, and no record mutation. |
| `pnpm --filter @southneuhof/framework-web type-check` | 0 | Route contract check, route generation, and Vue type-check passed. |
| `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | 0 | 47 files and 230 tests passed. The Node 26 flag provides Web Storage to jsdom. |
| `pnpm test:module-tooling` | 0 | 110 Node tests and 3 Python tests passed. All eleven checker tests are included in the Node count. |
| `pnpm type-check` | 0 | All six workspace packages passed. |
| `NODE_OPTIONS=--no-experimental-webstorage pnpm test` | 0 | The architecture gate passed, then all 12 Turbo test/build tasks passed. |
| `pnpm lint` | 0 | All 3 lint tasks passed; 2 were served from cache. |
| `pnpm build` | 0 | All 6 build tasks passed from the Turbo cache after the workspace test command built their dependencies. |
| `pnpm --filter @southneuhof/framework-web test:e2e` | 0 | 10 browser tests passed in 1.7 minutes. The configured E2E database reset, migration, clear, and seed steps ran. The app logged existing `prefix` DOM-prop and icon-button label warnings. |
| `git diff --check` | 0 | No whitespace errors. |

The earlier Plan 051 web test required four storage-related imports to be skipped on Node 26. The candidate passes all 47 files and 230 tests with the recorded Web Storage flag. The prior Plan 054 Loom type run had two unknown-prop diagnostics; the candidate Loom and web type-checks pass. Earlier Loom suites tested the replaced field and validation behavior. The candidate has 371 tests after those old suites and their implementations were removed; no candidate test failed.

### Cold type-check candidate

Both commands use workspace `vue-tsc` with TypeScript 6.0.2, disabled incremental reuse, and the same project scopes as the Plan 051 baseline. Web route types were generated by the preceding web type-check. `Memory used` is the TypeScript checker metric. Peak process memory was not measured for either baseline or candidate.

| Scope | Baseline files / types / instantiations / checker memory | Candidate files / types / instantiations / checker memory | Baseline check / total / wall | Candidate check / total / wall |
|---|---|---|---|---|
| Loom | 997 / 148,851 / 564,394 / 758,191K | 1,008 / 129,582 / 463,998 / 714,718K | 2.62s / 4.10s / 4.88s | 2.45s / 3.92s / 4.71s |
| Web | 1,654 / 297,633 / 1,038,790 / 1,159,256K | 1,673 / 324,262 / 1,026,697 / 1,209,883K | 3.91s / 6.17s / 6.96s | 4.08s / 6.35s / 7.18s |

Candidate Loom command: `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json --extendedDiagnostics` (exit 0). Candidate web command: `pnpm --filter @southneuhof/framework-web exec vue-tsc --noEmit --incremental false -p tsconfig.vitest.json --extendedDiagnostics` (exit 0). The checked file counts changed, so these values do not establish a direct performance improvement.

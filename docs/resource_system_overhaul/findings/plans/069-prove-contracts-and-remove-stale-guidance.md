# Plan 069: Make tests, CI, generators, and agent guidance prove the same architecture

## Status

- Status: TODO
- Priority: P2
- Effort: L
- Fix risk: MEDIUM
- Category: correctness, architecture, types, verification
- Source baseline: `223fc622d9a897014fcbad48df838a19cec398db` (2026-09-24). Live source check: `b57c6f8` (2026-09-24); production source is unchanged, and the user revised `ARCHITECTURE.md` during review.
- Depends on: 062–068; all runtime/type/transport owners must have their final contracts
- Findings owned: F20, F21, F25; completion gates for F01–F27 and every accepted transparency decision

**Execution:** Work in the current checkout; source paths are repository-relative. Do not commit, push, upgrade dependencies, change backend contracts, or alter unrelated work. Record commands and exit codes in this bundle's `README.md`. Follow `AGENTS.md`: write no implementation comments and no tautological tests. Expected-red regression tests are preparation, not completion. Missing dependencies or services are BLOCKED, never a passing result.

**Architecture:** Components own their public props, model values, events, and explicitly supported native attributes. Form derives requiredness from its schema, owns one tracked session, and forwards canonical component configuration. Authored inputs name their renderer. Inputs receive loaders in component props; no field `source`, inferred choice synthesis, prop-normalizer, or form-only model conversion exists in the completed architecture. App-level asset services are configured once and used by inputs and previews alike. `defineForm` preserves optional `submit`; a later explicit `:submit` replaces it. Form/DialogForm props are flat; page views contain nested primitive bags. Shared labels, input fragments, and read-only display fragments remain ordinary data. Changes are frontend-only; existing transport adapters remain the explicit API boundary.

## Intent

A green test must distinguish correct behavior from a plausible broken implementation. CI must execute the framework suites. A new agent-generated module must follow the same component-native contracts as existing code without reading historical plans or remembering an adapter. Complete the clean break and report unexecuted checks honestly.

## Current state and evidence

| Finding | Baseline defect |
|---|---|
| F20 | SurfaceParity.browser replaces selection controls with a span/setter, DisplayParity.browser avoids a renderer on the tree column, public-api.spec checks type-only exports in JavaScript, and defineForm.spec fixes incidental top-level key order. These tests prove some useful invariants but miss the reported failures. |
| F21 | `.github/workflows/web-validation.yml:86–93` selects framework-web unit tests but only Loom browser tests. Turbo build dependencies do not run dependency unit suites. Generator-only edits are not fully covered by the listed workflow paths. |
| F25 | `build-resource-form/SKILL.md:119–126` promises implicit operation/permission context not supplied by the binder. Its field-type reference still lists TableInput.fields and optional toDraft. The root README also contains an active defineSchema example. |

Prior isolated probes confirm stated observations only; they used explicit runtime/schema doubles and global TS 5.8.3. The earlier scaffold run was 21 passed/1 skipped. No pinned workspace/browser/E2E run occurred during plan preparation. Historical DONE entries in repository plans are not fresh acceptance evidence for these findings.

`.github/workflows/web-validation.yml:80–96`

```ts
      - name: Lint affected packages
        run: pnpm exec turbo run lint --affected --output-logs=errors-only

      - name: Type-check affected packages
        run: pnpm exec turbo run type-check --affected --output-logs=errors-only

      - name: Test affected packages
        run: pnpm exec turbo run test --affected --filter=@southneuhof/framework-web --output-logs=errors-only

      - name: Install Chromium
        run: pnpm --filter @southneuhof/loom exec playwright install --with-deps chromium

      - name: Check Loom browser parity
        run: pnpm --filter @southneuhof/loom test:browser

      - name: Build web app
        run: pnpm --filter @southneuhof/framework-web build-only
```

`packages/loom/src/__tests__/public-api.spec.ts:15–25`

```ts
const removedExports = [
  ['define', 'Fields'].join(''),
  ['Field', 'Catalog'].join(''),
  ['Fields', 'Input'].join(''),
  ['Resolved', 'Field'].join(''),
  ['Field', 'Reference'].join(''),
  ['Field', 'Override'].join(''),
  ['resolve', 'Fields'].join(''),
  ['to', 'Catalog'].join(''),
  ['from', 'Zod'].join(''),
  ['Validation', 'Schema'].join(''),
```

`packages/loom/src/__tests__/public-api.spec.ts:95–98`

```ts

  it('no longer exports the retired CRUD surface', () => {
    for (const name of removedExports) expect(framework, `unexpected export: ${name}`).not.toHaveProperty(name)
  })
```

`.agents/skills/build-resource-form/SKILL.md:119–126`

```ts
each one; a truthy `a || b` expression can hide changes to `b`.

Use `context` for stable screen information. Standard create/update actions
supply reserved `context.operation` and `context.permission`. Where the source
requires action scope, use that permission rather than a hard-coded create
permission. The server validates it; a query parameter grants no authority.

Match multi-selection values to the raw form schema. Multi-choice controls can
```

Evidence is source inspection plus the earlier isolated probes stated above, not a claim that pinned Vue/browser tests passed. The probe harness used explicit test doubles. Establish real regressions before implementation. Use Vitest `describe/it/expect` and deferred promises as in the cited existing tests; keep schemas, compiler, session, and the component under test real.

## Scope

Modify these owners, their callers reached through the named contract, and their focused tests:

- `packages/loom/src/**/__tests__/** and __type-tests__/**; packages/loom/vitest.browser.config.ts`
- `apps/web/src/** test/type/browser/E2E fixtures affected by surface contracts`
- `packages/loom/tsconfig.json, apps/web/tsconfig*.json and package verification scripts: inclusion/strictness only`
- `.github/workflows/web-validation.yml and existing related CI workflows`
- `scripts/{check-surface-architecture,module-ui-check,scaffold-bounded-module,verify-module,integrate-bounded-module,module-evidence}.mjs and tests`
- `scripts/test-support/bounded-fixture.mjs, module-tooling tests, generated source/type fixtures`
- `README.md, AGENTS.md, DESIGN.md, packages/loom/README.md, apps/web/README.md`
- `docs/resource_system_overhaul/ARCHITECTURE.md, docs/ui/{forms,collections}.md, docs/architecture/web-application-architecture.md and asset/custom-field guides`
- `.agents/skills/{build-resource-form,web-ui-surfaces,migrate-web-resource,implement-schema-first-zod,carta-module-design,carta-module-plan,carta-module-development,verify-carta-module}/**`
- `packages/loom/src/{schemas,forms,query,services}/ and LocationInput/LookupInput: only source-backed corrections required by residual boundary regressions`
- `docs/resource_system_overhaul/findings/plans/README.md and implementation-evidence/ final results`

Out of scope: Re-auditing unrelated Sprindle/backend/SDK behavior, dependency upgrades, replacing the test framework, a documentation compiler, snapshots of whole implementations, relaxing checks to obtain green status, and general product redesign.

## Preparation and commands

```sh
git status --short
git diff --stat 223fc622d9a897014fcbad48df838a19cec398db..HEAD -- packages/loom/src apps/web/src scripts .agents/skills docs/ui docs/architecture docs/resource_system_overhaul/ARCHITECTURE.md .github/workflows
```

Compare these excerpts with live code and read the revised `docs/resource_system_overhaul/ARCHITECTURE.md` as the required end contract. Its revision is expected drift from the source baseline. Changes made by declared prerequisite plans are also expected; verify their stated end contracts. Report other unexplained drift before editing. Do not discard unrelated working-tree changes.

Use installed package-local tools pinned by `package.json` and the lockfile. Record the actual Node/pnpm versions. The live baseline passed the listed unit, browser, tooling, architecture, and cold package type gates; rerun them after implementation. The Node 26 Web Storage flag applies to local web and workspace unit runs. CI uses Node 20.19.0.

| Gate | Command | Required result |
|---|---|---|
| Unit | `pnpm --filter @southneuhof/loom test` | Exit 0; scoped regressions run. |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; new files registered in the explicit include list. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0 with strict Vue fixtures. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 without boundary suppressions. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0 on this Node 26 checkout. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; no acceptance allowlist for removed executable paths. |
| Tooling | `pnpm test:module-tooling` | Exit 0 when callers, generators, docs fixtures, or checkers change. |
| Final workspace | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Exit 0 on this Node 26 checkout after the coordinated implementation. |

## Steps

### 1. Establish a coverage ledger and keep valid existing tests

Map each F01–F27 to the implemented correction, production owner, exact regression fixture, command, and result. Include native attribute contracts, global asset parity, explicit renderers, source/registry removal, direct component models, schema-derived requiredness, default/overridden submit, and shared display reuse. The mapping is executable evidence, not an assertion that a named test passed.

Retain good callback-identity, default isolation, non-idempotent transform, load cancellation, identity, access, invalidation, and relation-display tests. Replace runtime checks of type-only exports with negative type imports. Keep runtime absence checks for actual exported functions. Check top-level configuration content, not incidental key insertion order; field/column ordering remains a real contract.

**Verify:** Unit and both type gates. Broken public function exports fail runtime tests, broken type exports fail compiler tests, and reordered unrelated object properties no longer fail tests.

### 2. Exercise real controls and async ownership at public seams

Use real TextInput/SelectInput/DateInput/file controls alongside custom-slot extension cases. A span implementing setValue remains a slot test, not a selection test. The enum inference case is now negative: `{ status: {} }` lacks an explicit renderer and is rejected. A real canonical `select` with data/pick/view must work unchanged standalone, in Form and in DialogForm.

Use the browser's actual focus/blur/click order for Save during async blur validation. Defer the validator and operation promises explicitly. Test the writable-draft prohibition, invalid control buffers, late loads, changed submit bindings, old mutation completion, dynamic wrapper props, close/reopen guards, parent query replacement, and selection staging. Count actual dispatches/events, not only internal refs.

Display parity must put a chip/custom/asset renderer on the tree column. Test the same joined-relation accessor and format in Table, TreeTable, Detail, extraction, and exports without record mutation or renderer-owned network work. Asset parity installs the global adapter once and covers direct input, managed input, and previews with the same value; do not replace the input with a test stub. A malformed/removed asset never reappears through nullish fallback.

Register each new browser file in vitest.browser.config.ts. Include Vue type fixtures under __type-tests__, not directories excluded from the normal checker. Keep strictTemplates/checkUnknownProps and supported attribute checks active. Do not suppress a type error or replace a component to pass a parity fixture.

**Verify:** Browser, Unit and both type gates. Record test names/counts/skips; the public counterexamples fail when the production fix is deliberately removed locally, then restore the fix before completion.

### 3. Resolve the remaining validation obligations without inventing findings

Add focused tests for previously unverified boundaries: installed Zod v3/v4 wrappers and finite input discovery; derived/resetWhen behavior versus late loads; Date/native model values; LocationInput geolocation/load errors after cancellation or unmount; and export termination at its page-safety limit. These are validation obligations, not previously confirmed additional defects.

The required outcomes are fixed: schema metadata inspection executes no transform/default; latest owned draft wins; stale location callbacks do not change disposed/replaced input state; hitting the export safety limit reports an incomplete-export error instead of a successful silently truncated file. Correct a failing case at its existing owner and add its exact observed evidence to the ledger. Do not widen this work into unrelated location UX or backend pagination changes.

Global asset injection must be isolated between two mounted Vue apps. Record the pre-existing resource runtime's multi-app/SSR limitation separately; these plans do not certify a multi-app resource redesign.

**Verify:** scoped Unit/Browser/Web behavior gates. Each obligation has an observed outcome and test. Missing services remain BLOCKED; passing isolated schema stand-ins is not equivalent.

### 4. Run framework and tooling suites explicitly in CI

Replace the web-only unit selection with explicit commands in the existing web workflow:

```sh
pnpm --filter @southneuhof/loom test
pnpm --filter @southneuhof/framework-web test
pnpm test:module-tooling
pnpm test:surface-architecture
```

Keep Loom browser checks and both package type checks, including all new files. Trigger validation for affected frontend/framework files, module generator/checker/test-support scripts, skill scripts, the root README/AGENTS/DESIGN, current architecture/UI docs, and lock/config/workflow changes. A Loom-only change and a generator-only change must run their respective suites. Do not rely on a dependency build task to execute tests.

Use the repository's installed pnpm and supported Node engine; this plan changes no dependency versions. Preserve package bootstrap/environment setup and browser installation used by CI. Add a narrow workflow/task-selection test that checks actual commands and path coverage; it is appropriate structural coverage for the CI contract, not a substitute for running the suites.

**Verify:** `pnpm test:module-tooling` plus the exact four commands above exit 0. Capture the selected task graph for any remaining Turbo affected jobs. Confirm the actual workflow includes Loom tests and tooling tests; record unavailable live-CI execution as unverified rather than passed.

### 5. Make generator output and active guidance use only the final contract

Update the scaffolder, manifest parser, bounded fixture, UI checker, module verifier/evidence/integration scripts and Python skill checks. Generated fields require renderer; component data/load/pick/view/loadDetail props remain canonical. File/image fields rely on the globally installed asset service with no adapter props. Emit raw operation schemas, ordinary input/display fragments, one-object resource composition, static list/create bags, and identity-bound detail/update bags. Update-only modules load drafts explicitly; they do not fabricate visible detail pages.

Remove automatic context.operation/context.permission promises. Workflow context is explicit caller data. TableInput uses separate table/form plus mandatory toDraft; its nested form is submit-free. Remove source wrappers, enum inference, form-side read/write/hydration, form-actions, flat View alternatives, and old defineSchema examples from current guidance. Preserve shared role-name accessors, status catalogs, date formats, and schema-owned requiredness/transformations.

Use a small set of real compiled fixtures as the canonical examples: direct and managed select, default/overridden submit, globally configured file+preview, shared relation display, row editor, and resource page extraction. Generate/compile actual output in tests. Keep docs linked to these examples; do not build a Markdown interpreter. Check active references, including root README and nested skill references, not just the architecture document.

**Verify:** Tooling, both type gates, Web behavior and Architecture. Fresh fixture modules compile without casts and pass the module checker. No active example requires remembering a hidden helper.

### 6. Enforce the clean break and publish evidence

Extend the existing syntax-aware architecture gate to remove field-level source, generic input-prop adapters/registry injection, automatic renderer inference, model-conversion wrappers, old field/reference/projection paths, command arity-context guessing, and obsolete wrapper props. Resolve aliases and generated templates. Preserve legitimate component props named options, frontend transport encoders, global asset read/preview/upload, read-only display accessors, command run, provider list operations, CSS source properties, and new form/detail fields maps. Do not ban words without their syntactic context.

Allow old names only in negative-test literals and historical/removal prose. Executable old code, aliases, public exports, generated examples, and active authoring guidance have no exemptions. Do not obfuscate a retained implementation's spelling to evade the checker. Delete duplicate tests/utilities and debug scaffolding that no longer exercise a real contract.

Run the complete integration commands:

```sh
pnpm test:surface-architecture
pnpm --filter @southneuhof/loom type-check
pnpm --filter @southneuhof/framework-web type-check
pnpm --filter @southneuhof/loom test
pnpm --filter @southneuhof/loom test:browser
NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test
pnpm test:module-tooling
pnpm type-check
NODE_OPTIONS=--no-experimental-webstorage pnpm test
pnpm lint
pnpm build
pnpm module:preflight
pnpm --filter @southneuhof/framework-web test:e2e
```

Use the existing configured local environment for service-dependent checks. Record command, exit status, tool versions, counts/skips, baseline failures, candidate failures, and blocked prerequisites. Carry plan 067's comparable performance results without claiming unmeasured improvements. Review git diff for source/type bypasses, dead imports, and unrelated changes. Merge plan status updates into the existing index without destroying unrelated historical records.

**Verify:** every required gate exits 0 in the configured environment. A blocked test prevents DONE for that gate. The coverage ledger accounts for every finding and accepted decision, and no prior plan is required to reconstruct the intended repair.

## Test plan

The final ledger must connect source evidence to actual production-boundary tests, including negative compiler imports and mixed union controls, real native attribute targeting, global asset injection, canonical component model values, and no-legacy generation. Keep proof files and test names stable enough to rerun. Do not use timing sleeps, text-only source checks, overly broad snapshots, unconditional expect(true), or mocks that implement the behavior under test.

## Done criteria

- [ ] All F01–F27 have an implemented outcome, production owner and executed regression; no simplification finding remains an unassigned backlog.
- [ ] Accepted transparency, native attribute and global asset decisions have direct/managed/preview parity coverage.
- [ ] CI explicitly runs Loom units, browser parity and module-tooling tests with matching path triggers.
- [ ] Current docs, root README, skills, generators and generated fixtures teach the same final API.
- [ ] Old executable paths and compatibility fallbacks are absent, with a tested syntax-aware removal gate.
- [ ] Workspace and configured E2E results, limitations and comparable type measurements are recorded accurately.
- [ ] Scoped unit/browser/type gates pass with exact executed commands, counts, skips, and exit status recorded.
- [ ] Only scoped owners, dependent callers, tests, current documentation, and plan status changed; review `git diff --check` and `git diff --stat`.
- [ ] No compatibility alias, fallback to a removed contract, public `any` facade, or type-suppression escape was added.

## STOP conditions

Stop if a reported guarantee can only be made green by stubbing its real control, disabling a suite, loosening a type, broadening a removal allowlist, or changing backend behavior. A newly reproduced issue outside the named residual owners is reported with evidence instead of silently expanding this plan. Missing infrastructure must be reported, not replaced with a claimed passing simulation.

Do not improvise a new backend contract or suppress a required check. Report a repeated verification failure after two targeted repair attempts. A missing browser, dependency, database, or storage prerequisite blocks that gate rather than justifying a stubbed substitute.

## Maintenance

Treat executable examples as the normal authoring path. A change to that path updates its component contract, direct/managed tests, generator and active guidance together. Keep historical execution records labeled as history and out of current agent entrypoints. Completion is evidence, not the absence of visible TypeScript errors.

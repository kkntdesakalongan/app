# Plan 077: Move UI enforcement to types, lint, and framework owners

## Status

- Status: DONE — APPROVE (executor self-review)
- Priority: P1
- Effort: L
- Risk: MED — strict component checks can expose existing imports; action slots must keep access and write guards.
- Depends on: None. Relevant earlier contract repairs are implemented.
- Category: migration, dx, correctness, docs
- Planned at: `8046201`, 2026-09-30
- Execution: explicitly authorized by the user, delegated to GPT-6 Luna with maximum reasoning effort.

Read this entire plan before implementation. It is the complete assignment.
Update this plan with commands, results, deviations, and a self-review verdict.
Update only the Plan 077 row in `plans/README.md` when complete.

## Intent and acceptance

The user selected a clean break from the separate UI source checker and
agent-authored UI JSON inventory. Remove both in this delivery. There is no
transition mode, compatibility command, dormant checker, replacement manifest,
or new per-module metadata. Normal web lint and Vue type checks must be the
authoring path. Keep the current Loom resource, schema, form, table, and detail
architecture. Keep source review for judgments that tools cannot establish.

These distinctions are required:

- `<button>` is a native element. `<Button>` is a component. An unresolved
  `<Button>` is an error; it must never be accepted as a native button. Preserve
  exact tag casing when linting. Apply the same rule to other component names.
- Missing schema fields belong to types. Form fields use schema input; table
  and detail use schema output. A derived display key is valid with a typed
  `read` accessor. It need not be added to the schema merely to satisfy a scan.
- Runtime data and permission rules remain with their framework owners.
  Replacing a presentation slot must not bypass the owner's access check.
- Standard controls retain their design. Explicit user requests and required
  interactions that standard controls cannot support can justify customization.
  A domain action name alone does not justify replacing a standard control.
  Wording changes use label configuration. This policy applies throughout the
  app, including custom business actions; it is not a Create-only rule.
- A warning about a native control or replacement is a source-review signal.
  It is not proof of a defect or proof that an exception is approved.
- Business workflow complexity does not require a frontend component inventory.

The user explicitly excluded preview/service/database setup repairs. Browser-safe
API imports are a separate discussion and are not part of this assignment.
Existing list-limit and OpenAPI edits must remain intact.

## Current state and evidence

| Owner | Current fact | Target |
|---|---|---|
| `apps/web/tsconfig.app.json:64` | `strictTemplates` is true but `checkUnknownComponents` is false | Enable unknown-component checking |
| `apps/web/.eslintrc.cjs:8` | Existing Vue ESLint configuration has no component-resolution/casing rules | Use installed Vue lint rules |
| `scripts/module-ui-check.mjs:51` | Exports JSON and source checker modes | Delete the file and its tests |
| `.agents/skills/web-ui-surfaces/references/ui-contract.md:3` | Full process and some compositions require `ui-contract.json` | Delete this reference and all live requirements |
| `packages/loom/src/forms/defineForm.ts` | `FormFieldsGuard` rejects keys outside schema input | Retain and prove with compiler diagnostics |
| `packages/loom/src/display/compatibility.ts:43` | Display keys require schema membership or a `read` accessor | Retain and prove with compiler diagnostics |
| `packages/loom/src/display/resolveDisplay.ts` | Runtime validates display values and configured formatters | Retain; do not copy this into lint |
| `packages/loom/src/components/views/ListView.vue:539` | Create permission check is inside the default slot content | Put it around the whole slot |
| `DESIGN.md:85` | Shared-control policy is already present but permits a weak reading for replacements | Replace the paragraph; do not add another section |

The current Create shape is:

```vue
<template v-if="surface.createRoute">
  <slot name="create-action" v-bind="{ can: surface.can, target: surface.createRoute }">
    <RouterLink v-if="surface.can?.('create') ?? true" :to="surface.createRoute">
```

This permits custom slot content to display a denied Create action. The outer
condition must include the permission check. The binder already filters many
record route targets; standalone ListView callers must also retain the declared
access policy. Inspect view/edit/delete slot owners before changing them.

Read-only probes against the installed tooling showed:

- `vue/no-undef-components` rejects unimported `Button` and `MissingWidget`;
  imported `Button` and lowercase native `button` pass component resolution.
- `vue/component-name-in-template-casing` supports PascalCase with
  `registeredComponentsOnly: false`.
- `vue/no-restricted-syntax` visits Vue template AST nodes. This selector
  reports standard control replacement slots without reporting Detail controls:

```text
VAttribute[directive=true][key.name.name='slot'][key.argument.name=/^(create-action|row-actions|row-actions-view|row-actions-edit|row-actions-delete|actions)$/]
```

- Enabling resolution/casing in a read-only lint probe found six files with
  implicit `RouterLink` usage: `GlobalToolbar.vue`, drawer `NavigationDrawer.vue`,
  rail `Sidebar.vue`, rail `RailExpand.vue`, routing `Tabs.vue`, and
  `routes/not-found.route.vue`. Native-control warnings exist in the app shell.
  These are not authorization to redesign that shell.
- Compiler probes reject missing form/table/detail fields. A typed derived
  `read` accessor passes. An unannotated accessor has an inference limitation;
  a general inference redesign is out of scope.

## Scope and work protection

Work in `/Users/gamer/Documents/projects/carta`. No branch creation, commits,
pushes, releases, installs, database access, `.env` changes, or server restarts.
User authorization includes the named Loom repairs and normal local checks.
Write no implementation comments. Use existing code and small, justified tests.

In scope:

- `apps/web/.eslintrc.cjs`, `apps/web/tsconfig.app.json`, and
  `apps/web/package.json` only for normal lint routing/visibility if needed.
- `apps/web/src/**/*.vue` only for missing runtime component imports or other
  small component-resolution repairs exposed by the stricter check. Preserve
  routes, content, styling, accessibility, and behavior.
- One integration test for actual web lint configuration at
  `scripts/web-component-enforcement.test.mjs`; no separate checker CLI.
- `packages/loom/src/components/views/ListView.vue`,
  `packages/loom/src/contracts/views.ts`, related existing public exports,
  `packages/loom/src/components/views/__tests__/views.spec.ts`,
  `packages/loom/src/components/views/__type-tests__/list-view.type-test.ts`.
- Existing Loom compiler diagnostics and surface type fixtures:
  `packages/loom/scripts/check-contract-diagnostics.mjs` and
  `packages/loom/src/contracts/__type-tests__/surface-definitions.type-test.ts`.
  Related type owners only if a real compiler proof reveals a required gap.
- Retire the scanner-only display schema-kind helper in
  `packages/loom/src/display/requirements.ts`, its
  `requirements.policy.mjs` implementation and declaration, and the three
  schema-kind cases in `packages/loom/src/display/__tests__/requirements.spec.ts`.
  Keep the actual-value helper and its runtime coverage.
- Delete `scripts/module-ui-check.mjs`, `scripts/module-ui-check.test.mjs`,
  `.agents/skills/web-ui-surfaces/references/ui-contract.md`, and
  `plans/standard-role-permissions/ui-contract.json`.
- `DESIGN.md`, active Carta layer/module skills and their references/templates,
  `docs/architecture/web-application-architecture.md`, `docs/ui/*.md`,
  `docs/resource_system_overhaul/ARCHITECTURE.md`, `packages/loom/README.md`,
  `apps/web/README.md`, root README/AGENTS only if they have a live dependency.
- Related module-tooling/architecture tests only to remove retired dependencies
  and keep required current checks. Retain independent architecture and evidence
  tooling. Do not remove a tool because its name contains "contract".
- Current inventory/removal records under `plans/` and the standard-role plan
  only to remove live requirements or clearly mark prior evidence historical.
- This plan and its index row.

Out of scope: all `apps/api`, all `packages/sprindle`, the child POS checkout,
API transport/import architecture, preview/environment setup, product redesign,
generic SFC rewrites, unrelated skill cleanup, and browser/E2E work.

At planning time these files already had local edits. Preserve their bytes:

```text
apps/api/src/routes/(authenticated)/roles/[roleId]/permissions/+server.ts
apps/api/src/routes/(authenticated)/roles/role-mapping.routes.spec.ts
packages/sprindle/src/__tests__/declared-read-contract.spec.ts
packages/sprindle/src/__tests__/module-bundles.spec.ts
packages/sprindle/src/__tests__/readme-example.spec.ts
packages/sprindle/src/openapi/__tests__/openapi.spec.ts
packages/sprindle/src/openapi/index.ts
packages/sprindle/src/testing/__tests__/memory-source.spec.ts
packages/sprindle/src/tooling/manifest.spec.ts
packages/sprindle/src/validation/common-schemas.ts
```

Take a baseline hash of these files before execution and check it afterward.
Do not revert work merely because a verification command exposes it.

## Required guidance

Read root agent rules and applicable scoped rules. Use local `$skill-creator`
and `$writing-for-agents` for skill edits; `$pit-of-success` for the named API
repair; `$web-ui-surfaces` and `DESIGN.md` for frontend changes; `$test-audit`
for test changes. Read the resource architecture before changing static surface
checks. User authorization overrides the old requirement to run the deleted UI
checker or create UI JSON. Keep module non-browser boundaries.

Some test-audit references name unavailable OpenClaw/autoreview tools. Do not
invent those tools or block supported verification on them. Apply its test-value
bar and report the unavailable auxiliary tools. The user asked for one continuing
executor; do not spawn more agents.

## Implementation steps

### 1. Establish the ordinary lint and type path

Run `git diff --stat 8046201..HEAD -- apps/web packages/loom scripts .agents/skills
DESIGN.md docs` and inspect current dirty files. Compare these excerpts with the
live owners. Routine source drift can be reconciled within this scope; preserve
other work.

Enable `checkUnknownComponents: true` in the app config; its Vitest config
inherits it. Use error-level `vue/no-undef-components` and PascalCase component
linting. Prefer explicit runtime imports for the six RouterLink consumers. Do
not add blanket ignored components, broad ambient declarations, or replace
unresolved uppercase tags with lowercase native elements.

Use installed Vue lint rules for native-control/replacement review findings.
Warn on lowercase `button`, visible `input`, `select`, and `textarea` in owned
application Vue files. Preserve the old hidden-input distinction: a literal
`type="hidden"` input is silent; a dynamic/absent type needs review. Match exact
raw tag names so imported `<Button>` is never a native-control finding.
`vue/no-restricted-syntax` can express this without a new source walker. Keep
vendor/generated files and Loom's native implementations outside app rules.

Warn on standard replacement slots across list and form controls, including
`create-action`, the row replacements, and Form `actions`. Ordinary Detail
`controls` for extra workflow actions are not replacements. Warnings point to
the requirement and `DESIGN.md`; no JSON, reason props, or waiver manifest.
Keep review warnings visible in normal and focused ESLint commands. In the
focused script, remove ESLint `--quiet` if it hides these warnings. Warnings
remain review signals; unresolved components remain errors.

Add one test using the real ESLint API and actual app config, through `lintText`
with an application filename. Exercise imports/casing/native distinctions,
hidden input, a standard replacement, and ordinary workflow controls. Use
`createRequire` anchored at `apps/web/package.json`, as existing scripts do.
Avoid source-string/config-shape assertions and test-only production exports.

Verify: `node --test scripts/web-component-enforcement.test.mjs` exits 0.
Run web type-check and ESLint through package commands; repair only in-scope
resolution defects. Do not silence newly exposed errors.

### 2. Keep schema membership with types and dynamic data with runtime

Read current form/table/detail guards, display runtime, and compiler diagnostic
harness. Add focused paired compiler cases to the existing harness: missing form
input field, missing table column, missing detail field, invalid accessor path,
and valid typed derived display field. Pair each invalid case with a compiling
valid case. Use real `defineForm`, `defineTable`, and `defineDetail` APIs, including
at least one shared/spread field map. Invalid diagnostics must identify the
fixture boundary, not a missing module or unrelated project error.

Keep existing guards unless the compiler test demonstrates a real gap. Do not
write a second schema parser in lint or require authors to choose all schema
fields. Do not change normal scalar display behavior. Retain actual-value
display validation and fail-closed operation access. Review-only row-operation
enum coverage and display meaning stay with focused behavior evidence/source
review; do not rebuild cross-file schema scanning as an ESLint rule.

Verify: Loom type-check and diagnostic commands below exit 0. Existing runtime
display and resource tests remain passing.

### 3. Preserve action policy at the owning surface

Move the Create visibility condition around the entire slot. Test default and
custom Create content with denied and allowed access, and a reactive permission
change. A denied action must not invoke/render replacement content. Keep the
resource-action slot usable independently. Check standalone view/edit slots for
the same bypass and make the owner enforce its declared `can` policy. Preserve
delete confirmation, guarded callback, pending, and uncertain-outcome behavior;
do not replace these with cosmetic guards.

Add the narrow proposed ListView API:

```ts
actionLabels?: Partial<Record<'create' | 'view' | 'edit' | 'delete', string>>
```

Use this for existing button text/accessibility labels, retaining default labels,
icons, placement, targets, and action semantics. It supplies no variant, colour,
icon, callback, or control-design override. A page can use
`<ListView v-bind="sales.list" :action-labels="{ create: 'New Sale' }" />`
when wording is required. It does not need a custom slot. Keep supported
replacement slots for genuinely different requested interactions, with policy
outside them. Do not create a generic ActionButton wrapper or add resource
metadata that has no real consumer.

Extend the existing mounted View tests for denied/allowed replacements and the
label path using real rendered controls and navigation targets. Assert user
behavior, not generated template text or a copied class inventory. Use the
existing mount harness. Add a normal public type case for the narrow label API.
New tests must contain no comments; use the existing diagnostic harness rather
than new `@ts-expect-error` comments for new negative cases.

Verify: focused view/display/resource tests and both package type checks exit 0.

### 4. Remove the old system and integrate the policy

Delete both UI checker files, the UI contract reference, and the only live
`ui-contract.json` artifact. Remove live calls/imports/skill pointers. Delete
tests whose sole owner was the removed checker; do not keep its fixtures or CLI
under another name. Keep independent architecture, compiler diagnostics,
evidence recording, module worksheets, and their meaningful tests.

Replace the existing opening paragraph under `DESIGN.md` Controls and values
with this integrated wording, adapting wrapping only:

> Use shared controls and keep their standard designs. Customize only for an
> explicit user request or a required interaction they cannot support. Change
> wording through label configuration. Import components from public exports
> or verify their runtime registration.

Keep action placement in its existing section and exception recording in the
existing introduction. Do not add another policy section or copy this rule into
every skill. Route active layer skills to this single policy. Standard and full
module paths use ordinary lint/types and relevant behavior checks; neither
requires a component inventory, per-module UI JSON, or a custom source-check
command. Explain warning review once in the web verification reference. Update
module plan templates, verification, current architecture and UI docs, and
current inventories accordingly.

Historical reports/closed plans can retain past command results if clearly
historical. They must not instruct a current executor to recreate or run the
removed system. Mark the prior UI-tool ownership entries superseded by Plan 077
where an inventory is still presented as current. Preserve unrelated historical
records. The final tree has no live checker or UI JSON, not a staged retirement.

Verify: module tooling and surface architecture gates below pass; active guidance
has no deleted command or UI JSON requirement. Skills retain valid local links.

### 5. Review, record, and finish

Read the complete diff. Compare each hunk with this scope and verify unchanged
baseline files. Run the required gates. Inspect the actual assertions, lint
diagnostics, and compiler locations. Record source readiness and the limits of
non-browser proof. Update this plan and Plan 077's index row only after review.
Use `DONE` plus `APPROVE` only when the clean break and required gates pass.
Return exact gaps otherwise; do not call a warning a resolved design exception.

## Verification commands

Run type checks serially. These commands are from current package scripts.
Do not run root `pnpm test`: it starts unrelated API/database work. Browser work
is excluded. Do not install dependencies for a missing optional tool.

| Purpose | Command from repo root | Expected |
|---|---|---|
| Real lint integration | `node --test scripts/web-component-enforcement.test.mjs` | All cases pass |
| Web ESLint | `pnpm --filter @southneuhof/framework-web lint:eslint` | Exit 0, no unresolved/casing errors; review warnings listed |
| Web normal lint | `pnpm --filter @southneuhof/framework-web lint` | Exit 0; warnings remain visible |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0 |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Compiler regressions | `pnpm --filter @southneuhof/loom test:diagnostics` | All paired cases pass |
| App compiler integration | `node packages/loom/scripts/check-contract-diagnostics.mjs --project app` | All pairs pass |
| Focused framework runtime | `pnpm --filter @southneuhof/loom exec vitest run src/components/views/__tests__/views.spec.ts src/display/__tests__ src/resources/__tests__/boundResource.spec.ts --environment jsdom` | All pass |
| Framework unit suite | `pnpm --filter @southneuhof/loom test` | All pass |
| Web unit suite | `pnpm --filter @southneuhof/framework-web test` | All pass |
| Active skills/tooling | `pnpm test:module-tooling` | All remaining checks pass |
| Current architecture | `pnpm test:surface-architecture` | Exit 0 |
| Existing CI selection proof | `node --test scripts/web-validation-workflow.test.mjs` | All pass |
| Web bundle | `pnpm --filter @southneuhof/framework-web build-only` | Exit 0 |
| Whitespace | `git diff --check` | Exit 0 |

Reuse applicable passes rather than repeating them without a changed owner or
unresolved concern. If full lint exposes pre-existing formatting, report it and
format only changed in-scope files. Do not reformat unrelated source to get green.
For materially revised skills, run the local skill-creator validator if its
script is present; otherwise report that limit and run the repository's actual
skill/link tests. Do not add a wording-matching test as a substitute.

## Done criteria

- Old UI checker and its tests/reference are absent, with no compatibility path.
- No `ui-contract.json` remains in the working tree.
- Active module delivery/planning/verification instructions and current docs
  require neither deleted system. Archived evidence is clearly historical.
- Normal app lint and Vue type checks catch unresolved uppercase components;
  native/component distinctions and hidden inputs have actual lint proof.
- Ordinary lint reports standard replacement slots beyond Create. Existing
  shell warnings are documented as review signals, not blanket approvals.
- Actual compiler diagnostics reject missing fields/accessor paths and accept
  typed derived displays and normal shared field maps.
- Denied action policy applies to default and replacement content; label-only
  configuration retains the standard controls and targets.
- Required gates pass or exact blockers remain recorded as incomplete.
- Out-of-scope baseline edits are byte-for-byte unchanged.
- Plan and index record implementation evidence and the review verdict.

## Stop conditions and maintenance

Stop affected work and report an exact blocker if implementation needs an
external/destructive write, a secret, a new package install, a product behavior
decision, or a broad framework rewrite. A failed check is diagnostic evidence:
after two failed fixes to the same cause, change the diagnostic approach and
report it in the plan rather than rerunning blindly. Continue independent work.

Future component/surface invariants belong to public types/runtime owners or
ordinary lint. `DESIGN.md` remains the design policy owner. Do not restore the
removed command/JSON record to address a later failure. Browser import boundaries,
preview setup, and generic derived-accessor inference remain outside this plan.

## Execution record — 2026-09-30

### Checks

| Command | Result |
|---|---|
| `node --test scripts/web-component-enforcement.test.mjs` | Pass; 1 test. |
| `pnpm --filter @southneuhof/framework-web lint:eslint` | Pass; 0 errors and 14 visible warnings. The warnings are listed below. |
| `pnpm --filter @southneuhof/framework-web lint` | Pass; ESLint warnings remain visible and formatting passes. |
| `pnpm --filter @southneuhof/framework-web lint:focused -- src/components/navigations/GlobalToolbar.vue` | Pass; the native-control warning remains visible. |
| `pnpm --filter @southneuhof/loom type-check` | Pass. |
| `pnpm --filter @southneuhof/framework-web type-check` | Pass after route checks and generation. |
| `pnpm --filter @southneuhof/loom test:diagnostics` | Pass; 29 Loom contract, 14 TypeScript surface, and 8 Vue surface cases. |
| `node packages/loom/scripts/check-contract-diagnostics.mjs --project app` | Pass; 4 app transport cases. |
| `pnpm --filter @southneuhof/loom exec vitest run src/components/views/__tests__/views.spec.ts src/display/__tests__ src/resources/__tests__/boundResource.spec.ts --environment jsdom` | Pass; 4 files and 95 tests. |
| `pnpm --filter @southneuhof/loom test` | Pass; 62 files and 496 tests. |
| `pnpm --filter @southneuhof/framework-web test` under Node 26.9.0 | The command failed at import in 3 suites because `localStorage` was undefined; 43 files and 218 tests passed. |
| `PATH=/opt/homebrew/Cellar/node@24/24.21.0/bin:$PATH pnpm --filter @southneuhof/framework-web test` | Pass; 46 files and 231 tests. The same suite also passed under Node 26.9.0 with `NODE_OPTIONS=--localstorage-file=/tmp/carta-plan077-web-vitest-localstorage`; the temporary file was removed. |
| `pnpm test:module-tooling` | Pass; 55 Node tests and 2 Python tests. |
| `pnpm test:surface-architecture` | Pass; 18 tests and the architecture check. |
| `node --test scripts/web-validation-workflow.test.mjs` | Pass; 2 tests. |
| `pnpm --filter @southneuhof/framework-web build-only` | Pass. Vite warned that some chunks exceed 500 kB. |
| `git diff --check` | Pass. |

### Deviations and review

- `tsconfig.vitest.json` also excludes Loom's `__type-tests__` files. The app
  package type-check uses this config. Loom checks those fixtures in its own
  type-check; including them in the app project caused unrelated diagnostics
  when unknown-component checking was enabled.
- The plan listed `RailExpand.vue` as a missing `RouterLink` import. The file is
  `rail/layouts/RailExpand.vue` and contains no `RouterLink`; it uses native
  buttons. No unused import was added. The buttons remain lint warnings, as
  required for the existing app shell.
- Node 26.9.0 caused the unmodified web test command to fail at import with
  `localStorage` undefined. The full suite passed under installed Node 24.21.0
  and under Node 26 with the local storage option. The web validation workflow
  selects Node 20.19.0.
- The skill-creator validator is present, but it could not start because Python
  could not import `yaml`. No package was installed. OpenClaw and autoreview
  tools were not available. The module tooling and skill-link tests passed.
- ESLint reports 12 native-control warnings in shell files, one standard
  `row-actions` replacement warning in role assignments, and one existing
  unused `props` warning in `RailItem.vue`. These are review findings, not
  approved exceptions. The role-assignment replacement is a Switch workflow
  with per-record access and pending guards; the shell controls were not
  redesigned.
- The five existing Vue consumers that use `RouterLink` now import it. Normal
  app lint and strict component checking pass. Active guidance has no retired
  command or JSON pointer. The four retired checker/JSON paths are absent.
- All ten protected API and Sprindle baseline hashes match their recorded
  values. No API or Sprindle file was changed for this plan.
- `displayRequirement` had no caller outside its three direct tests after the
  scanner was removed. The resolver still calls `displayValueRequirement` after
  the accessor and formatter. `resolveDisplay.spec.ts` covers invalid Dates,
  invalid structured values, null, formatter output, and renderer handling.
  The three schema-kind tests and their scanner-only helper were removed;
  the actual-value helper, its types, and its direct runtime test remain.
- The checker-only `DisplaySchemaKind`, `isStructuredKind`, and `hasRead` code,
  and both policy seam files are gone. `hasValue` remains because the runtime
  helper uses it. The current resource inventory now records the helper's
  runtime-only role.

Browser and E2E checks were not run. The root test command was not run because
it starts API/database work. These limits follow the plan scope.

### Revision — 2026-09-30

The clean break now removes the scanner-only schema-kind display helper,
`DisplaySchemaKind`, its predicates, the policy module and declaration, and its
three tests. No production caller remained after removal of the UI scanner.
`displayValueRequirement` and its types now live in `requirements.ts`; its
runtime logic is unchanged. `resolveDisplay.ts` still calls it after accessors
and formatters. The remaining direct test plus `resolveDisplay.spec.ts` cover
Date, structured, null, formatter, and renderer results. This is the test-audit
basis for removing the three helper-only cases.

The ESLint integration now proves that an unimported `<Button />` is an error
from `vue/no-undef-components`; imported `<Button>` resolves, and lowercase
`<button>` remains a native-control warning. The reactive Create test proves
that a replacement slot is not called while access is denied, is called when
access is allowed, and is not called after access is revoked. The
existing mounted test also verifies that denied View and Edit replacements do
not render. The Loom README now says Loom checks its fixtures and web checks
application source.

| Revision command | Result |
|---|---|
| `node --test scripts/web-component-enforcement.test.mjs` | Pass; 1 integration test. |
| `pnpm --filter @southneuhof/loom exec vitest run src/components/views/__tests__/views.spec.ts src/display/__tests__ src/resources/__tests__/boundResource.spec.ts --environment jsdom` | Pass; 4 files and 92 tests. |
| `pnpm --filter @southneuhof/loom test` | Pass; 62 files and 493 tests. |
| `pnpm --filter @southneuhof/loom test:diagnostics` | Pass; 29 Loom contract, 14 TypeScript surface, and 8 Vue surface cases. |
| `pnpm --filter @southneuhof/loom type-check` | Pass. |
| `pnpm --filter @southneuhof/framework-web type-check` | Pass after route checks and generation. |
| `pnpm test:module-tooling` | Pass; 55 Node tests and 2 Python tests. |
| `pnpm test:surface-architecture` | Pass; 18 tests and the architecture check. |
| `pnpm --filter @southneuhof/framework-web build-only` | Pass; Vite still warns that some chunks exceed 500 kB. |
| `git diff --check` | Pass. |
| `shasum -a 256` on the ten protected API and Sprindle files | All ten hashes match the baseline. |

The web unit suite, full web lint, and CI selection proof remain reused from
the earlier run because this revision changes no web source, lint rules, or CI
selection. The Node 26.9.0 default web test failure remains recorded above;
the suite passed under Node 24.21.0 and Node 26.9.0 with the local-storage
option. Browser and E2E checks remain outside scope.

### Self-review — APPROVE

The separate checker, its tests, its reference, and the UI JSON file are gone.
Loom types and diagnostics own schema membership. Runtime display validation
and independent architecture checks remain. Permission checks wrap Create,
View, and Edit replacement content. Delete still uses its guarded callback,
confirmation, pending state, and uncertain-outcome handling. `actionLabels`
changes wording or accessibility labels and leaves standard controls intact.
The required checks pass, with the Node 26 default test-run issue recorded
above. No unreviewed warning was treated as an approved exception.

### Parent review — APPROVE

The parent reviewed the implementation diff and the two focused revisions.
The final real-ESLint integration passed. The final mounted View suite passed
all 66 tests. The parent confirmed that all six retired checker, JSON, and
policy paths are absent, no UI JSON remains, and active guidance has no retired
command or policy-module dependency. All ten protected file hashes match the
planning baseline. `git diff --check` passed. Other applicable gates are reused
from the executor's recorded runs. The runtime, browser, and auxiliary-validator
limits above remain part of this verdict.

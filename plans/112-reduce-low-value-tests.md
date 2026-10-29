# Plan 112: Reduce test debt

## Decision and status

The user approved execution on 2026-10-28, including the stricter cuts below.
Base commit is `407b8b198c8d3bcc099cbdb54741e7ccccd1109b`, the head of PR #9.
The child branch is `chore/reduce-resource-test-debt`.
Implementation and parent review are complete. The child PR targets PR #9.

A test must protect a plausible, consequential failure at a reasonable cost.
A unique assertion alone does not justify retention. Accept less automated
coverage for cosmetics, routine forwarding, rare configuration changes, and
compiler diagnostic wording. Delete low-value tests without automatic
replacements. Keep production behavior and public contracts unchanged.

## Survey

The inventory contains 234 tracked test and type-fixture files with 39,502 lines.
It includes named `.spec`, `.test`, and `.type-test` files under `apps`,
`packages`, and `scripts`. It excludes other verification scripts and helpers.
Loom has 108 files, Web 60, Sprindle 36, API 18, root scripts 9, SDK 1, and
Utilities 2. The detailed survey covers Loom, Web, and tooling. Backend and SDK
reads are samples. Utilities has inventory coverage only.

The 4,000 to 6,000 net-line reduction is a forecast, not a deletion target.
The diagnostic runner and Form parity file contain 2,326 lines before moves.

## Approved cuts

| Kind | Locations | Action |
|---|---|---|
| Custom compiler diagnostic automation | `packages/loom/scripts/check-contract-diagnostics.mjs` | Delete the runner and its package/CI commands. Keep ordinary type fixtures and type-check jobs. |
| Form host parity matrix | Loom `SurfaceParity.browser.spec.ts` | Delete the file and browser config entry. Preserve only deferred close ownership and invalid pasted DateInput submission in existing test owners. |
| Source spelling and migration inventories | Loom `MultiLocationInput.spec.ts`, `datepicker-theme.spec.ts`, `public-api.spec.ts`, `removed-public-api.type-test.ts`; Web `legacy-boundary.spec.ts`; root `web-validation-workflow.test.mjs` | Delete these files without replacements. Keep real redirect and architecture checks elsewhere. |
| Copied constants and fake runtime type proof | Web `statuses.spec.ts`, `schema-identity.type-test.ts`; SDK `client.spec.ts` | Keep editable status restrictions, payload mismatch compiler proof, and actual request behavior. Remove copied labels/colors/order, retired export checks, and function-existence inventories. |
| Cosmetic view tests | Loom `views.spec.ts` | Remove source scanning, layout classes, adjacency, empty-region, routine slot, and default pagination inventories. Keep a short list rendering smoke and consequential view behavior. |
| Form unit and browser variants | Loom `form.spec.ts`, `Form.browser.spec.ts`, `DialogForm.spec.ts`, `useFormSession.spec.ts` | Remove repeated native/helper forwarding, snapshot identity checks, rare configuration-change combinations, and selected wrapper option permutations. Keep representative submission, invalid input, draft protection, recovery, and lifecycle behavior. |
| File input variants | Loom `FileInput.spec.ts` | Remove cosmetic wrapper checks, passive display preservation, and pending-work hook/mode replacement cases. Keep real upload, transform, removal, validation, and submission behavior. |

Do not change other tests to reach the forecast. Do not change production
logic, dependencies, database state, API/Sprindle tests, or other repositories.
Update only the current architecture proof-table link for the retired parity
file. Historical evidence remains a record of its original revision.

## Retained proof

- Form parses and validates the current draft before one submission.
- Invalid real numeric and date input cannot submit a previous valid value.
- Cached detail data reaches sibling content and controls.
- Late results cannot affect another record or overwrite relevant edits.
- An uncertain write cannot be repeated through ordinary submission.
- Write recovery uses reads and preserves confirmed completion behavior.
- Dialog close approval cannot close a later session.
- Actual transport, access, persisted data integrity, and package startup tests
  remain. Framework-owned type fixtures still compile.

Each retained test needs a useful independent expectation. Do not preserve
private counts, copied inventories, or every assertion from retired files.
Do not add generic test infrastructure, test-only production APIs, or comments.

## Execution and checks

Use `test-audit`. Record baseline failures separately from cleanup changes.
Run baseline and final Loom unit/browser/type checks, Web unit/type checks,
module tooling, surface checks, and affected SDK checks. The retired diagnostic
suite need not be rerun. Do not edit source during tests.

Use the existing package scripts:

- `pnpm --filter @southneuhof/loom test`
- `pnpm --filter @southneuhof/loom test:browser`
- `pnpm --filter @southneuhof/loom type-check`
- `pnpm --filter @southneuhof/framework-web test:unit`
- `pnpm --filter @southneuhof/framework-web type-check`
- `pnpm --filter @southneuhof/sdk test`
- `pnpm --filter @southneuhof/sdk type-check`
- `pnpm test:module-tooling`
- `pnpm test:surface-architecture`

Run affected lint in check mode and `git diff --check`. Report failures and
unverified results. A baseline failure does not justify a test deletion.

GPT-6 Luna at max reasoning executes the bounded cuts. The parent reads the
full diff and affected owners, independently verifies retained behavior, and
creates a child PR targeting `feat/resource-authoring-simplification`.

## First pass result and verification

The final non-document diff adds 96 lines and removes 3,995 lines, for a net
reduction of 3,899 lines. No production runtime file changed. The diagnostic
runner and parity matrix are gone. The two retained regressions use existing
Form and DialogForm test setup.

| Check | Baseline | Final, independently rerun by parent |
|---|---|---|
| Loom unit | 573 passed | 534 passed |
| Loom browser | 95 passed | 80 passed |
| Web unit | 255 passed | 252 passed |
| SDK unit | 3 passed | 2 passed |
| Module tooling | 81 passed | 79 passed |
| Surface architecture | 34 passed | 34 passed |
| Loom, Web, and SDK types | Passed | Passed |
| Focused Web lint and affected Oxlint | Not part of baseline | Passed |
| Diff whitespace | Not part of baseline | Passed |

Parent review found that the moved dialog test passed without either Cancel
interaction. The revised test requires both close requests to reach the guard.
Removing the interactions now fails the precondition. The exact source was
restored, and the final full suite passes. The DateInput case retains invalid
paste rejection and a successful corrected-date submission.

An intermediate unused scanner declaration caused a unit failure and was
removed. A supplemental Web-configured ESLint invocation could not parse Loom
files. The configured checks pass. Existing localStorage, dialog description,
and editor license warnings remain. The retired diagnostics, API database
suite, and Sprindle suite were not rerun. No API or Sprindle files changed.

Accepted gaps remain cosmetics, routine forwarding, rare configuration changes,
and diagnostic wording/location. Do not rebuild these inventories as new tests.

## Second reduction pass

The user approved a stricter continuation from `4d40ac0` on the same branch.
It removes another 5,981 net test/check lines and deletes 33 whole files,
including the historical generator benchmark and repeated UI/type matrices.
Tracked tests, fixtures, and helpers fall from 40,559 to 34,578 lines. Runtime
implementation remains 35,135 lines under the same classification.

Table tests now keep representative query, paging, hierarchy, keyboard, row
interaction, and resize behavior. Retained negative row-click assertions have
positive controls. Resize persistence checks the result after remount rather
than counting private storage writes. IDR input still checks typed numeric
values separately from its formatted display.

Parent review and independent checks pass for 436 Loom unit tests, 57 browser
tests, 252 Web tests, 235 Sprindle tests, module tooling, surface checks, all
three affected package type checks, and configured Oxlint. The two browser
files that gained formatting differences were corrected. Five existing Web
formatter mismatches remain unchanged. The supplemental Web ESLint wrapper
cannot parse Loom files with that configuration.

Parallel baseline runs failed for browser and Web generation cases. Isolated
baseline reruns and the parent's sequential final checks pass. API database,
editor, and low-file-limit watcher suites were not rerun. No production runtime,
dependency, permission, write-recovery, or cached-detail code changed. Unrelated
skill-creator edits remain outside this commit.

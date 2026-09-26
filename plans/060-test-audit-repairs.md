# Plan 060: Repair test guards and remove duplicate coverage

## Status and scope

- Status: BLOCKED — implementation is complete, but mandatory `$autoreview` is unavailable and the full web suite has three baseline setup failures. Priority: P1. Effort: S for application tests; SDK follow-up S.
- Fix risk: LOW. Confidence: HIGH. Category: tests.
- Planned at: `1246387`, 2026-09-26. Dependencies: none.
- Selected scope: the four findings from the test audit. This is not a full repository audit.
- Edit only `scripts/module-skills.test.mjs`, `apps/web/src/framework/__tests__/entity-schema-import.spec.ts`, and this plan/index. SDK work below is deferred until explicitly authorized.
- Preserve existing skill, worksheet, and plan changes. Do not change API commands, entity schemas, production code, dependencies, CI, or other framework packages. No commits, pushes, or PRs are authorized.

## Evidence and priority

| Order | Finding and evidence | Impact | Effort / risk |
|---|---|---|---|
| 1 | `scripts/module-skills.test.mjs:69` compares two `indexOf()` results without checking presence | Removing the database preflight leaves the guard green | S / LOW |
| 2 | `apps/web/src/framework/__tests__/entity-schema-import.spec.ts:75` uses `/from '(node:\|fs\|path\|crypto\|os)'/` | The scan misses `node:crypto` and double-quoted imports | S / LOW |
| 3 | The same file at line 52 repeats the role update check in the loop at line 65 | Duplicate maintenance with no extra failure detection | S / LOW |
| 4 | `packages/sdk/src/__tests__/client.spec.ts:6` checks whether Hono proxy paths are functions | Runtime assertions cannot establish that API routes exist | S / LOW; framework scope required |

The ordering defect was confirmed with an in-memory command mutation: removing the preflight produced indices `-1` and `67`, and the assertion passed. The import defect is confirmed from the expression; execution proof remains required.

Current assertion shapes:

```ts
assert.ok(scripts['db:migrate:test'].indexOf('scripts/test-target.mjs &&') < scripts['db:migrate:test'].indexOf('drizzle-kit/bin.cjs migrate'))
expect(role.schemas.update.safeParse({}).success).toBe(true)
```

The role assertion appears both alone and inside `Object.entries(allEntities)`. Commit `223fc62` removed its distinct `requiredSchemaKeys` check. Keep the loop as the primary owner.

## Execution steps

### 1. Record the baseline

Read root rules and `$test-audit`. Use Node 24+ and the pinned pnpm version. Match existing `node:test`/strict assert style in the script test and Vitest style in the web test: single quotes, no semicolons. Add no code comments or production test seams.

Run `git status --short` and `git diff --stat 1246387..HEAD -- scripts/module-skills.test.mjs apps/web/src/framework/__tests__/entity-schema-import.spec.ts`. Compare the live assertions above and record local edits separately. Run the two focused test commands in the verification table before editing. Record failures; do not delete a failing contract to get a green result.

The audit skill names unavailable OpenClaw skills and scripts: `openclaw-testing`, `crabbox`, `autoreview`, `scripts/run-vitest.mjs`, and `scripts/check-changed.mjs`. Resolve that procedure mismatch before claiming skill-compliant completion. The commands below are Carta's actual gates; do not invent missing tools or silently claim their checks ran. Updating the skill is a separate task.

### 2. Make migration ordering require both commands

In the existing test, store both command positions. Assert that each is non-negative, then assert that the preflight precedes migration. Keep the required environment and entrypoint assertions. Do not extract a production helper or add a second test of the same command string.

Verify with the focused script command. In a disposable checkout, mutate only the command text in `apps/api/package.json`: remove preflight, remove migration, and reverse their order. Each variant must fail at the intended assertion; restore between variants. The original command must pass. These checks read configuration only: never execute a migration to prove this guard.

### 3. Repair the entity import guard

Keep the recursive scan of all `.entity.ts` files. Make the matcher accept both quote styles, whitespace around `from`, and a complete `node:` specifier, such as `node:crypto` or `node:fs/promises`. Preserve detection of the existing bare names `fs`, `path`, `crypto`, and `os`. Keep matching tied to module specifiers, not arbitrary occurrences of those words. Keep any helper local to the test file.

Verify with the focused web command. Use temporary entity files in a disposable checkout to exercise the real scan. Cover both quote styles for `node:crypto`, `node:fs/promises`, and a bare `fs` import; each must fail with the temporary file in the offenders list. A relative `./crypto` import and an allowed package import must pass. Temporary files must not be imported by the suite or left in the final patch. Confirm that the old matcher misses the prefixed and double-quoted cases before applying the repair in that checkout.

This is a repair of the existing static-import contract. A complete module dependency analyzer is out of scope. Run the web build as the separate executable browser boundary check.

### 4. Remove the redundant schema test

Delete only `treats every update field as optional, matching the server schema`. Rename the retained all-entity test to describe empty update validation; it no longer uses a framework bridge. Preserve create validation, schema availability, and both architecture guards. No production or test-support deletion is unlocked.

Verify with the focused web command. In a disposable checkout, make only the role update schema reject an empty object. Confirm that the retained loop fails for `role.schemas.update`, then discard the mutation. The final suite has one fewer test and preserves that contract.

### 5. Review and record proof

Run the applicable gates below. Review every diff hunk against this scope. Report baseline failures separately from new failures, mutation results, and checks not run. Use `git diff --numstat -- <in-scope paths>` to report production and test changes separately; expected production delta is zero. Update this plan and the index only after the required checks and review are complete.

## Verification commands

Run from the repository root. All positive checks must exit 0; mutation checks must fail for the intended reason. Commands were read from package configuration, not executed during planning.

| Gate | Command |
|---|---|
| Focused script test | `node --test scripts/module-skills.test.mjs` |
| Focused web test | `pnpm --filter @southneuhof/framework-web test:focused -- framework/__tests__/entity-schema-import.spec.ts` |
| Script syntax | `node --check scripts/module-skills.test.mjs` |
| Web lint and format | `pnpm --filter @southneuhof/framework-web lint:focused -- src/framework/__tests__/entity-schema-import.spec.ts` |
| Tooling regression | `pnpm test:module-tooling` |
| Web regression | `pnpm --filter @southneuhof/framework-web test` |
| Web type check | `pnpm --filter @southneuhof/framework-web type-check` |
| Browser bundle | `pnpm --filter @southneuhof/framework-web build-only` |
| Patch whitespace | `git diff --check -- scripts/module-skills.test.mjs apps/web/src/framework/__tests__/entity-schema-import.spec.ts plans/060-test-audit-repairs.md` |

Do not edit while Vitest is running. Do not run database or E2E suites for these test-only changes. Type checking can generate route artifacts; inspect and preserve unrelated generated changes.

## Deferred SDK follow-up

`packages/sdk` is a framework package. Obtain explicit SDK scope before editing `packages/sdk/src/__tests__/client.spec.ts`.

Hono's installed `dist/client/client.js` recursively returns function proxies for arbitrary string properties. Replace the path-function assertions with compile-time checks inside the existing type-contract test, preserving all eight paths, including health, file deletion, presigned URLs, and email sign-in. Remove the assertion that the locally declared `proofCalls` function is a function. Preserve its type-checking body and all request/response checks. Do not invoke it: it contains network calls. Keep the sibling fetch URL and credentials test as the runtime owner.

Verify with `pnpm --filter @southneuhof/sdk exec vitest run src/__tests__/client.spec.ts` and `pnpm --filter @southneuhof/sdk type-check`. The latter is essential: `packages/sdk/tsconfig.json` includes `src/**/*`, while a normal Vitest run does not establish TypeScript correctness. In a disposable copy, replace one checked path with a nonexistent path and confirm a type error. No SDK production change is needed.

## Done criteria and stop conditions

- [ ] Missing or reversed migration commands fail; the valid command passes.
- [ ] Prefixed and bare builtin import cases fail under both quote styles; allowed imports pass.
- [ ] The all-entity loop remains and catches a required role update field; the duplicate is gone.
- [ ] Applicable checks pass, or the plan remains BLOCKED with exact failure evidence.
- [ ] No mutation fixtures, new comments, production changes, or unrelated edits remain.
- [ ] The unavailable skill procedure is resolved and final review evidence is recorded.
- [ ] SDK follow-up status remains explicitly deferred unless separately authorized and completed.

## Execution record

- The migration assertion now checks command presence and order. The focused script test passes. In a disposable worktree, removing either command or reversing their order failed at the intended assertion; the valid configuration passed.
- The entity boundary scan now parses TypeScript imports, exports, dynamic imports, and `require()` calls. The focused test passes. Disposable entity fixtures confirmed that single and double quoted `node:crypto`, `node:fs/promises`, and bare `fs` imports fail. Comments, strings, relative imports, and `zod` imports pass.
- Removed the role-only duplicate empty-update assertion. The all-entity test remains and has a name that describes its assertion. A disposable schema mutation made that loop fail at `role.schemas.update`.
- Passing checks: focused module-skills test (5 tests), focused entity test (6 tests), focused lint/format, `pnpm test:module-tooling` (121 Node tests and 2 Python tests), web type check, browser build, and `git diff --check`.
- `pnpm --filter @southneuhof/framework-web test` reports 43 files and 216 tests passing, with 3 suite setup failures. `App.spec.ts`, `framework/adapters/bundle.spec.ts`, and `router/__tests__/navigation.spec.ts` fail before their tests because `localStorage` is undefined in the worker and `packages/utilities/src/storage.ts` calls `getItem`. The same three failures reproduce at baseline commit `1246387` in a disposable worktree.
- No `$autoreview`, `$openclaw-testing`, or `$crabbox` skill/tool is available. `scripts/run-vitest.mjs` and `scripts/check-changed.mjs` are absent. Manual review confirmed that the diff is limited to the two in-scope test files and this plan/index. The mandatory automated review gate remains outstanding, so this plan is BLOCKED rather than marked DONE.
- SDK assertions remain deferred because the plan excludes `packages/sdk` pending explicit scope. Production LOC: 0. Test-file numstat: 34 insertions and 7 deletions, net +27 LOC. The added TypeScript AST scan replaces a fragile regex with checks for static imports, exports, dynamic imports, and `require()` while avoiding comment and string matches.

Stop on changed contracts, conflicting local edits, missing dependencies, or baseline failures that prevent the intended proof. Report the evidence rather than expanding scope. Do not install packages, weaken contracts, or fix unrelated failures as part of this plan.

Maintenance: rerun the ordering proof when API command wrappers change, and review matcher scope when entity import syntax changes. Retain architecture scans and SDK type contracts; their static form is not a deletion reason. Broad framework coverage, dependency security, product behavior, and performance were not audited by this plan.

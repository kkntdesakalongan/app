# Plan 090: Remove legacy platform resolution from Carta

> Follow the steps in order. Run each verification command and record its exit
> status. Read the STOP conditions before implementation. The user authorized
> planning, implementation through `task-subagent-delegation` with GPT-6 Luna
> at max reasoning effort, parent review, and one local commit. The parent
> owns final acceptance and the commit.
>
> Drift check: `git diff --stat 39a0768..HEAD -- apps/api/tsconfig.json apps/web/tsconfig.app.json apps/web/vite.config.ts pnpm-workspace.yaml apps/api/scripts/dev-source-contract.proof.mjs apps/web/scripts/ensure-routes-contract.test.mjs packages/sprindle/src/tooling/source.spec.ts packages/sprindle/docs/file-routing-tooling.md docs/architecture/web-application-architecture.md scripts/check-surface-architecture.mjs scripts/check-surface-architecture.test.mjs`
>
> Expected: no changes since the planning commit. Compare any changed owner
> with the current-state excerpts before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none; Plans 087–089 are complete
- **Category**: tech-debt / architecture / dx
- **Planned at**: commit `39a0768`, 2026-10-05
- **Execution status**: DONE — parent APPROVE, 2026-10-05

## Why this matters

Carta used to share data models between server, web, and mobile applications.
Commit `3e6aca8` added `define-data-model.server.ts`,
`define-data-model.web.ts`, and `define-data-model.native.ts`, plus compiler and
bundler preferences that selected them. Those files and their packages are
absent from the current source. Their preferences remain in application
configuration and proof fixtures.

The API runtime and the web checker share a generated route source graph.
Different platform preferences can make them select different ordinary
dependencies. Remove the obsolete application mechanism and use the existing
architecture command to reject its return. The result must retain precise SDK
inference, API runtime behavior, ordinary module identity, and the web schema
import restriction.

## Current state

The repository is a pnpm workspace. The API uses Node.js, Hono, Sprindle,
Drizzle, and TypeScript 7. The web uses Vue, Vite 8, Loom, and TypeScript 6.
The installed local tools are Node.js 26 and pnpm 12.1.0. Dependencies are
already installed. Type checks and builds can write standard ignored output.
No database, storage, or browser work is necessary for this cleanup.

The relevant owners are:

- `apps/api/tsconfig.json:7`: `"moduleSuffixes": [".server", ""]`.
- `apps/web/tsconfig.app.json:20`: `"moduleSuffixes": [".web", ""]`.
- `apps/web/vite.config.ts:50`: a custom `resolve.extensions` array starts with
  `.web.ts`, `.web.tsx`, and `.web.mts`, then lists normal Vite extensions.
- `pnpm-workspace.yaml:3`: `- '!apps/base-mobile'`; the directory is absent.
- `apps/web/scripts/ensure-routes-contract.test.mjs:113` and
  `apps/api/scripts/dev-source-contract.proof.mjs:152`: app consumers still
  hard-code `moduleSuffixes: ['.web', '']`.
- `packages/sprindle/src/tooling/source.spec.ts:31,52,53,84`: a generic producer
  and consumer proof uses the old platform names for arbitrary suffix choices.
  Its checks protect current compiler behavior and must remain effective.
- `packages/sprindle/docs/file-routing-tooling.md:42–49`: current documentation
  describes the old Carta suffix settings and unguarded absence of variants.
- `docs/architecture/web-application-architecture.md:28–58`: current API schema
  imports use physical package exports, and the SDK imports `RouteContract`
  through `@southneuhof/api/routes-contract`.
- `scripts/check-surface-architecture.mjs:699`: `checkWorkspace(root)` joins
  file, configuration, and source diagnostics. The CLI calls that function.
  The function and `analyzeSource` are already exported.
- `scripts/check-surface-architecture.test.mjs`: Node tests exercise rejected
  and accepted architecture contracts with `assert` and `node:test`.
- Root `package.json`: `test:surface-architecture` runs the architecture tests
  and then the real checker. Web CI already runs this command and triggers on
  application, script, and TypeScript configuration changes.

The current source scan found no `.server.*` or `.web.*` source files and no
active imports of `@client/data-model`, `@southneuhof/is-data-model`,
`model-meta`, or `define-data-model`. Loom's old dependency references occur
only in its release history.

Conventions: use the current file style, plain functions, `node:test`, and
the existing architecture diagnostics (`file:line: message`). For example:

```js
const diagnostics = analyzeSource(source, 'sample.ts')
assert.equal(diagnostics.length, 2)
assert.match(diagnostics.join('\n'), /one complete definition object/)
```

The root rules require Simplified Technical English, no added code comments,
the smallest sufficient change, justified tests, and no compatibility alias.
The API module owns backend schemas; web code imports schema values through
physical API exports. Platform adapters, if needed later, must use explicit
imports. This plan changes resolution policy, not product routes or data.

## Commands

Run memory-heavy checks serially. Save complete command output under a unique
directory in `/tmp`, and preserve each real exit status.

| Purpose | Command from repository root | Expected result |
|---|---|---|
| Architecture contract | `pnpm test:surface-architecture` | All tests pass; checker exits 0 |
| App source refresh | `node --test apps/web/scripts/ensure-routes-contract.test.mjs` | One SDK/live-type proof passes |
| Development source delivery | `node --test apps/api/scripts/dev-source-contract.proof.mjs` | One real launcher/SDK proof passes |
| Generic generator behavior | `pnpm --filter @southneuhof/sprindle test:tooling` | Tooling suite passes, including source consumers |
| API types | `pnpm --filter @southneuhof/api type-check` | Exit 0 |
| SDK types | `pnpm --filter @southneuhof/sdk type-check` | Exit 0 |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Web runtime imports | `pnpm --filter @southneuhof/framework-web build-only` | Exit 0; schema restriction remains active |
| API script lint | `pnpm --filter @southneuhof/api lint:focused -- scripts/dev-source-contract.proof.mjs` | Exit 0 |
| Web config and fixture lint | `pnpm --filter @southneuhof/framework-web lint:focused -- vite.config.ts scripts/ensure-routes-contract.test.mjs` | Exit 0 |
| Framework and root script lint | `node packages/sprindle/node_modules/oxlint/bin/oxlint packages/sprindle/src/tooling/source.spec.ts scripts/check-surface-architecture.mjs scripts/check-surface-architecture.test.mjs` | Exit 0 |
| Whitespace | `git diff --check` | Exit 0 |

Use `api-conventions`, `web-ui-surfaces`, and `test-audit` for the affected
owners. The user has already authorized implementation after this plan; do
not ask for selection again. Other repositories' test procedures named by a
skill do not apply when their scripts and skills are absent here. Use the
verified commands above.

## Scope

The only source and current-document files that can change are:

- `apps/api/tsconfig.json`
- `apps/web/tsconfig.app.json`
- `apps/web/vite.config.ts`
- `pnpm-workspace.yaml`
- `apps/api/scripts/dev-source-contract.proof.mjs`
- `apps/web/scripts/ensure-routes-contract.test.mjs`
- `packages/sprindle/src/tooling/source.spec.ts`
- `packages/sprindle/docs/file-routing-tooling.md`
- `docs/architecture/web-application-architecture.md`
- `scripts/check-surface-architecture.mjs`
- `scripts/check-surface-architecture.test.mjs`
- This plan and its row in `plans/README.md`

Out of scope:

- Product module source, routes, schemas, permissions, and UI pages.
- Database, storage, environment files, dependency versions, and lockfile.
- Sprindle production resolver code. Its generic TypeScript `moduleSuffixes`
  support is a current compiler contract, not an old data-model adapter.
- Historical plans, raw performance records, release history, and Git history.
  They record past source states and are not current application guidance.
- A new import-resolution comparison engine, source copies, symlinks,
  declaration emitter, or application platform adapter.

## Git workflow

Use the current `sprindle_unified_generator` branch and preserve unrelated
work. The parent makes one local commit after review. Use a concise message
such as `remove legacy platform resolution`. No push or merge is authorized.

## Steps

### 1. Add proof for the application resolution policy

Extend `scripts/check-surface-architecture.test.mjs` through its existing
`checkWorkspace(root)` interface. Use a small temporary workspace fixture with
the configuration and source files that the real checker reads. Clean up owned
temporary files. Add table-driven cases for the policy in Step 2.

The primary behavior is that the architecture checker reports environment
dependent source selection in Carta. The credible regression is reintroducing
a suffix preference, including through a base configuration, or adding a
platform variant that silently shadows shared source. Current checks do not
detect it. The existing public checker is the test owner; add no test-only
production exports.

Run the new negative cases before the implementation. They must fail because
the checker accepts the forbidden configuration or file, not because a fixture
or dependency is missing. Record that baseline evidence.

Verify: `node --test scripts/check-surface-architecture.test.mjs` initially
fails only the new negative cases for the intended reason.

### 2. Remove preferences and enforce the current application contract

Remove `moduleSuffixes` from both application tsconfigs. Remove Vite's complete
custom `resolve.extensions` property so Vite uses its standard extensions.
Remove the absent mobile application's workspace exclusion.

Extend `checkWorkspace(root)` with a small configuration and file-policy check:

- Reject nonempty effective `moduleSuffixes` in API, web app, web test, SDK,
  Loom, and utilities configs. Resolve inherited options with the existing
  TypeScript compiler API. An omitted option or the ordinary empty suffix is
  permitted. A preference inherited from `tsconfig.base.json` must be rejected.
- Reject old `.server.*` and `.web.*` resolution entries in the real web Vite
  configuration. Inspect parsed configuration strings; comments alone must
  not trigger a source-policy violation.
- Reject `.server.*` and `.web.*` source variants under `apps/api/src`,
  `apps/web/src`, `packages/sdk/src`, `packages/loom/src`, and
  `packages/utilities/src`. Use the source extensions already supported by the
  checker, including declaration variants. `+server.ts` is the current route
  filename and must remain valid. Skip generated output and dependencies.
- Give diagnostics the affected owner path and a clear corrective action.
- Reuse existing traversal and diagnostics. Do not expand unrelated removed
  API checks into the backend or add another enforcement command.

Verify: `pnpm test:surface-architecture` passes. The test fixture must show
ordinary configuration, explicit adapter filenames, `+server.ts`, and generic
Sprindle test suffixes remain valid.

### 3. Clean application proofs and current generic examples

Remove the hard-coded web `moduleSuffixes` fields from both app proof fixtures.
Retain the actual SDK type checks, stale-type rejection, live external type
updates, runtime HTTP assertions, and launcher recovery behavior.

In `packages/sprindle/src/tooling/source.spec.ts`, replace `.server` and `.web`
suffix choices with neutral `.producer` and `.consumer` choices. Update the
associated `Mode` values and all expected types and runtime values together.
This is still an independent producer/consumer compiler contract. Keep its
different consumer settings, nominal module identity, ambient contributors,
invalid input/output rejection, and runtime assertions. Keep `+server.ts`
route filenames. Do not delete meaningful generic resolver coverage.

Verify, serially: the two Node proof commands and Sprindle `test:tooling` above
all pass. Report selected test names and counts.

### 4. State the current contract in current documentation

Add a short resolution rule near the API schema boundary: Carta uses ordinary
shared source resolution; platform-dependent behavior uses explicit imports;
the architecture command rejects suffix selection and old platform variants.
Describe the check's actual scope. It does not compare all package conditions
or aliases and does not prove every independent consumer configuration.

Update the Sprindle tooling paragraph to use neutral suffix examples and
describe the current Carta policy. Preserve the generic warning that an
independent consumer must resolve ordinary imports consistently. Remove the
obsolete claim that the absence of current platform pairs is the only guard.
Use the current API schema and SDK package imports.

Verify: `pnpm test:surface-architecture` and `git diff --check` pass; review both
paragraphs against the actual enforcement. Historical records stay intact.

### 5. Run acceptance checks and hand off for parent review

Run all remaining type, build, and lint commands in the Commands table. Run
the static scan below and inspect the final diff. Record results in this plan.
The subagent may mark implementation complete but may not mark parent approval
or commit the work. The parent reviews all changes and fills the index verdict.

## Test plan

Use one table-driven fixture owner in the existing architecture test file.
Cover direct API and web preferences, a shared inherited preference, a web
test or SDK override, a Vite extension preference, and a platform source
variant in an API or shared dependency directory. Include declaration and
alternate source extensions where relevant. Include accepted ordinary source
and the literal `+server.ts` filename.

Assertions inspect real checker diagnostics. Do not compare copied source
strings or invent a resolver mock that implements the expected selection.
Generic suffix tests belong to Sprindle's current compiler contract and must
continue to use real TypeScript consumers and runtime output.

## Done criteria

- [x] Every Commands-table command exits 0, with saved output and exit status.
- [x] New architecture negative tests fail on the pre-fix implementation for
  the intended policy violation and pass on the final implementation.
- [x] This command has no matches and exits 1:
  `rg -n 'moduleSuffixes|\.web\.|\.server\.|base-mobile' apps/api/tsconfig.json apps/web/tsconfig.app.json apps/web/vite.config.ts pnpm-workspace.yaml apps/api/scripts/dev-source-contract.proof.mjs apps/web/scripts/ensure-routes-contract.test.mjs`
- [x] This command has no matches and exits 1:
  `rg -n '\.server\.|\.web\.' packages/sprindle/src/tooling/source.spec.ts packages/sprindle/docs/file-routing-tooling.md`
- [x] No source variant matching `.server.*` or `.web.*` exists in the five
  application/shared source roots checked by the architecture command.
- [x] Generic suffix settings remain tested with neutral producer/consumer
  fixtures; no active platform data-model import or implementation remains.
- [x] `git diff --check` exits 0; all changed files are in scope.
- [x] Parent review approves behavior, scope, test value, and code quality.
- [x] Plan/index status records actual evidence and any unverified limits.
- [x] The parent approves the change for the requested local commit.

## STOP conditions

- A real current source file or import requires a platform suffix. Report the
  owner and its requirement before changing behavior or adding a replacement.
- The cleanup needs a framework production resolver change, dependency update,
  compatibility path, database operation, or unrelated product correction.
- A required check fails for a reason outside these owners. Preserve the
  output, classify the failure, and report it. Do not hide it with weaker tests.
- The new regression fails because fixture configuration is missing rather
  than because the old checker accepts a forbidden setting. Repair the fixture
  before using that failure as evidence.

## Maintenance

The same ordinary API source supplies runtime behavior and frontend inference.
Review future shared-source changes for explicit imports and preserved module
identity. Generic Sprindle consumers can use other compiler settings; Carta's
application policy is stricter. A future import-resolution comparison engine
would be a separate design decision with package declaration handling and
consumer configuration requirements.

## Implementation and review evidence

Implementation and parent review are complete. The parent approved the change
for the requested local commit on 2026-10-05.

### Step results

1. The new architecture policy cases were run against the checker from source
   commit `39a0768` before implementation. All 14 negative subtests failed at
   the assertion that the checker accepted the forbidden policy. The valid
   ordinary-resolution, adapter, and `+server.ts` fixture and all 18 unchanged
   tests passed. The run had no fixture or dependency errors. See
   `/tmp/carta-plan090-implementation/step1-baseline-final-suite.log` and
   `.exit` (exit 1 by design).
2. Removed app suffix settings, the Vite extension override, and the stale
   workspace exclusion. Added effective TypeScript option, Vite AST, and
   source filename checks to `checkWorkspace(root)`. The final architecture
   run passed 34/34 tests and the real workspace check. See
   `/tmp/carta-plan090-implementation/step5-surface-architecture-final.log`.
3. Removed suffix fields from both app proof fixtures. The Sprindle source
   proof now uses `.producer` and `.consumer` suffixes and values while keeping
   its type, runtime, identity, and live update assertions. Both app proofs
   passed one test each. Sprindle tooling passed 60 tests across 6 files. See
   the `step3-*` logs under `/tmp/carta-plan090-implementation/`.
4. Updated the current API schema and Sprindle tooling guidance. The docs name
   the current check scope and its limits. The final architecture check passed
   after these edits.
5. All commands in the Commands table passed. Outputs and exit codes are in
   `/tmp/carta-plan090-implementation/`:

| Command | Result | Log |
|---|---|---|
| `pnpm test:surface-architecture` | Exit 0; 34/34 tests and workspace check passed | `step5-surface-architecture-final.log` |
| `node --test apps/web/scripts/ensure-routes-contract.test.mjs` | Exit 0; 1/1 test passed: `refreshes the real SDK contract and follows live API source types` | `step3-web-source-proof.log` |
| `node --test apps/api/scripts/dev-source-contract.proof.mjs` | Exit 0; 1/1 test passed: `actual development launcher keeps the SDK source contract current` | `step3-api-source-proof.log` |
| `pnpm --filter @southneuhof/sprindle test:tooling` | Exit 0; 60/60 tests across 6 files passed | `step3-sprindle-tooling.log` |
| `pnpm --filter @southneuhof/api type-check` | Exit 0 | `step5-api-type-check.log` |
| `pnpm --filter @southneuhof/sdk type-check` | Exit 0 | `step5-sdk-type-check.log` |
| `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 | `step5-web-type-check.log` |
| `pnpm --filter @southneuhof/framework-web build-only` | Exit 0; Vite completed the build | `step5-web-build-only.log` |
| `pnpm --filter @southneuhof/api lint:focused -- scripts/dev-source-contract.proof.mjs` | Exit 0 | `step5-api-lint.log` |
| `pnpm --filter @southneuhof/framework-web lint:focused -- vite.config.ts scripts/ensure-routes-contract.test.mjs` | Exit 0 | `step5-web-lint.log` |
| `node packages/sprindle/node_modules/oxlint/bin/oxlint packages/sprindle/src/tooling/source.spec.ts scripts/check-surface-architecture.mjs scripts/check-surface-architecture.test.mjs` | Exit 0 | `step5-framework-root-lint-final.log` |
| `git diff --check` | Exit 0 | `step5-diff-check-final.log` |

The two required `rg` scans returned no matches with exit 1. The source variant
scan across the five source roots and the active data-model name scan also
returned no matches with exit 1. See `scan-app-settings.log`,
`scan-generic-example.log`, `scan-source-variants.log`, and
`scan-model-leftovers.log`.

The build printed Vite's non-fatal large-chunk warning. No check failed. The
implementation changed only files in this plan's scope.

### Parent review

Verdict: APPROVE. The parent read the implementation diff and verified the
recorded command outputs and exit codes. The new tests exercise the real
checker and detect an independent architecture contract; the baseline failures
have the intended assertion and no fixture or dependency failure. The generic
Sprindle fixture still checks precise types, nominal module identity, runtime
output, and live ordinary type changes through real consumers.

The parent reran `pnpm test:surface-architecture`: 34/34 tests passed and the
real workspace check exited 0. The parent also reran the two absence scans and
`git diff --check`; the scans found no matches and whitespace passed. All
changed paths match the plan scope. No compatibility path, production resolver
change, product behavior change, or dependency change was introduced.

The full repository suite, browser rendering, and remote CI were not run.
The required focused acceptance checks passed. The remaining independent
consumer/package-condition limits are documented in the current architecture.

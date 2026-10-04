# Plan 082: Prepare current Sprindle tools before normal commands

> Implementation instructions: When execution is authorized, read the whole
> plan, run its drift command first, and follow each verification gate. Compare
> changed owners with the current-state excerpts. Reconcile named prerequisites;
> stop and report other contract mismatches. Update this plan and its index row
> only after implementation and review. Preserve unrelated work.
>
> Use the repository's `api-conventions` skill for API changes and
> `test-audit` for tests. No code comments, compatibility aliases, commits,
> pushes, or external writes are authorized by this planning pass.

## Status

- Status: DONE — APPROVE after parent review.
- Priority: P1; prerequisite for Plans 083–085.
- Effort: L.
- Risk: MED; output publication and process shutdown affect all API commands.
- Category: dx / correctness.
- Confidence: HIGH for the stale-output gap; the receipt and launcher are proposed work.
- Depends on: none.
- Planned at: commit `206768c`, 2026-10-04.
- Parent review accepted the source and tests after two focused revision rounds.

## Why this matters

An existing `dist-tooling/index.js` prevents preparation even when Sprindle
source or public declarations changed. Developers must know when to build the
package and restart its compiler process. Normal API commands should prepare
current tools. An active development session should also replace its compiler
process after a framework source change.

This plan does not enable API route declarations during development.

## Current state

- `apps/api/scripts/ensure-tooling.mjs:9–15` owns cold preparation:

```js
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sprindleRoot = resolve(apiRoot, '../../packages/sprindle')
const marker = resolve(sprindleRoot, 'dist-tooling/index.js')

if (existsSync(marker)) process.exit(0)

const tooling = spawnSync('node', ['tooling/package.mjs'], { cwd: sprindleRoot, stdio: 'inherit' })
```

- `packages/sprindle/tooling/package.mjs:10` emits `dist-types` through
  TypeScript. Lines 13–20 bundle five tool entries into `dist-tooling`.
  There is no input or output receipt.
- `packages/sprindle/package.json:11–21` ships both output directories and
  `tooling/*.mjs`; four executable names point into `dist-tooling`.
- `apps/api/package.json:10–16` invokes preparation before route commands
  and development. The current development command then loads
  `scripts/dev.ts` through `tsx`.
- `apps/api/scripts/dev.ts:3` imports the compiled tooling module once.
  Rebuilding that file does not replace the already loaded compiler.
- `apps/api/scripts/dev.ts:48–55` signals its server, closes its watcher,
  and exits without waiting for the server to exit.
- `turbo.json:16–27` already caches `dist-tooling/**` and
  `dist-types/**`. A receipt inside those directories travels with outputs.
- `.gitignore:21` ignores `.sprindle*/` directories. Use
  `packages/sprindle/.sprindle-package/` for temporary work and a build
  lock. Do not cache a live lock inside a declared Turbo output.

Use the existing `fileURLToPath(import.meta.url)` path style from the guard.
Keep package preparation in plain JavaScript so it works before compiled tools
exist. Carta's API belongs under `apps/api`; reusable package build logic
belongs under `packages/sprindle`. Add no code comments or compatibility
aliases. Preserve the current public imports, executable names, route response
types, and source-mode development manifest.

## Scope

In scope:

- `packages/sprindle/tooling/package-state.mjs` — create the shared input
  inventory and receipt validator.
- `packages/sprindle/tooling/package.mjs` — produce staged outputs and receipt.
- `packages/sprindle/package.json` — include tooling files in normal lint.
- `apps/api/scripts/ensure-tooling.mjs` — validate freshness before reuse.
- `apps/api/scripts/dev-launcher.mjs` — create the development supervisor.
- `apps/api/scripts/dev.ts` — shutdown completion only.
- `apps/api/scripts/ensure-tooling.test.mjs` — create CLI regressions.
- `apps/api/scripts/dev-launcher.test.mjs` — create lifecycle regressions.
- `apps/api/package.json`, `pnpm-lock.yaml` — launcher entry and a direct
  Chokidar 3.6.0 development dependency, matching Sprindle's existing version.
- `.github/workflows/backend-validation.yml` — run the new Node proofs.
- `apps/api/README.md` — describe automatic preparation and framework reload.
- This plan and `plans/README.md` — execution evidence and status.

Out of scope: Loom, SDK runtime changes, application routes or tables, database
commands, upstream pulls, editor installation, new package exports, dependency
upgrades, and enabling API route declaration generation. Do not change
`apps/api/scripts/compile-routes.ts` or `build-production.ts`.

## Commands you will need

All commands run from the repository root with Node 24 or newer. New test
paths exist after their test steps.

| Purpose | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat 206768c..HEAD -- packages/sprindle/tooling packages/sprindle/package.json apps/api/scripts apps/api/package.json pnpm-lock.yaml .github/workflows/backend-validation.yml apps/api/README.md` | Reconcile later changes with this plan before editing |
| CLI proof | `node --test apps/api/scripts/ensure-tooling.test.mjs apps/api/scripts/dev-launcher.test.mjs` | All selected tests pass |
| Package checks | `pnpm --filter @southneuhof/sprindle type-check` | Exit 0; receipt and outputs agree |
| Tooling regression suite | `pnpm --filter @southneuhof/sprindle test:tooling` | All tooling tests pass |
| API checks | `pnpm --filter @southneuhof/api type-check` | Exit 0 |
| SDK checks | `pnpm --filter @southneuhof/sdk type-check` | Exit 0 |
| Lint | `pnpm --filter @southneuhof/sprindle exec oxlint src tooling` | Exit 0 |
| API lint | `pnpm --filter @southneuhof/api lint` | Exit 0 |
| Existing dev proof | `pnpm --filter @southneuhof/api test:dev-routes` | Route edits, recovery, moves, deletion and shutdown pass |
| Isolated API target | `pnpm module:preflight -- --needs test` | Test target passes before database-backed checks |
| Full API suite | `pnpm --filter @southneuhof/api test` | All tests pass on the guarded test target |
| Scope | `git diff --check` and `git status --short` | No whitespace errors or changes outside scope |

Do not install dependencies, build outputs, start servers, or run migrations
during planning. These are implementation gates. Tests must use owned temporary
workspaces; never edit the user's framework source to simulate a change.

## Steps

### 1. Add a CLI regression at the preparation boundary

Follow the child-process fixtures in
`packages/sprindle/src/tooling/tooling.spec.ts:13–34`. Copy the actual
guard and package build owners into a temporary Carta-shaped workspace. Link
installed dependencies using platform-appropriate directory links.

Prove an existing tool entry plus changed framework source is not current:
after normal preparation, a real tool invocation or TypeScript consumer must
observe the new behavior. Cover missing declarations or one missing executable
while `index.js` still exists. Do not merely assert a hash or a mocked build
call.

**Verify:** `node --test apps/api/scripts/ensure-tooling.test.mjs` must fail
on the pre-fix guard for stale behavior, then pass after Steps 2–3.

### 2. Give the producer a complete receipt

In `package-state.mjs`, inventory the actual package build inputs: source
files selected by the package configuration, tool entry files, this helper,
package and compiler configuration, local extended configuration, workspace
manifest and lockfile where present, resolved build dependency identities, and
Node/platform/architecture identity. Hash content and relative paths; modification
times alone are insufficient. Do not scan every dependency directory.

Have `package.mjs` use that inventory before and after its build. Stage both
output trees under `.sprindle-package/`. Preserve executable permissions and
source-map paths for their final locations. Publish complete output trees and
`dist-tooling/package-state.json` only after successful generation. The
receipt records a schema version, input fingerprint, and every expected output
path and content hash. Exclude the receipt itself from its output hashes.

Serialize producers with a package-local lock outside cached output trees.
Wait at most 120 seconds for a live owner, then report a clear preparation
failure. Recover an abandoned owned lock. A failed build must preserve the
prior usable outputs and must not write
a receipt that calls partial output current. If inputs change during a build,
do not certify that build as current.

Do not turn the state helper into a second compiler or a new public API.

**Verify:** `pnpm --filter @southneuhof/sprindle type-check` and
`pnpm --filter @southneuhof/sprindle test:tooling` exit 0. The CLI fixture
must prove valid reuse, repair after damaged output, concurrent preparation,
and last-valid-tool behavior after a failed build.

### 3. Replace the existence-only guard

Keep the guard's existing workspace path resolution. Load the source JavaScript
state helper before importing any compiled tool. If the receipt and all inputs
and outputs are current, exit 0. Otherwise run the existing package producer
with `process.execPath`, propagate failure, then validate the result.

An old or absent receipt causes preparation. No fallback may report stale
output as current. Existing API command names remain unchanged.

**Verify:** `node --test apps/api/scripts/ensure-tooling.test.mjs` passes.
Two unchanged command entries reuse current outputs without another package
build. The changed-input case must prove changed consumer behavior.

### 4. Replace the active compiler process after a framework edit

Change the API `dev` script to run `dev-launcher.mjs`. The launcher runs
preparation, then starts the existing TypeScript development worker through
Node and `tsx`, with the API directory as its working directory. Use the
shared input inventory to watch framework inputs, excluding generated output
and lock/staging directories. Use Chokidar 3.6.0 through a direct API dependency.
Add that dependency with `pnpm --filter @southneuhof/api add --save-dev --save-exact chokidar@3.6.0`;
keep the workspace lockfile change limited to that existing version.

On changed inputs, coalesce requests and prepare once. Keep the last working
development worker if preparation fails. After success, stop the old worker
and wait for its server and route watcher to close before starting its
replacement. A subsequent edit during preparation must remain pending.

Make the shutdown in `dev.ts` await its own server exit and route watcher
close. Forward user shutdown through both levels. Do not restart automatically
in a loop after a preparation failure. Do not load a rebuilt module through
query-string imports; a new process gives the compiler a clean module graph.

**Verify:** `node --test apps/api/scripts/dev-launcher.test.mjs` passes.
A framework fixture edit must change an HTTP result or real compiler result
without a manual build/restart. Failure, recovery, edits during preparation,
and termination must leave no owned child process or occupied test port.
`pnpm --filter @southneuhof/api test:dev-routes` must still pass.

### 5. Wire normal verification and close the plan

Add both Node test commands to backend CI. Preserve its Windows package
smoke checks and macOS watcher checks. Extend normal package lint to include
`tooling`. Document freshness and automatic framework reload.

Run the command table, including the full API suite after the guarded target
passes. Review changed output publication, lock cleanup, and signal handling.
Update this plan and its index row only after all required evidence is recorded.

**Verify:** all applicable command-table gates pass; `git diff --check`
exits 0; only listed files changed.

## Test plan

Primary owner: actual preparation and development launcher commands. Existing
package consumer tests protect generated tool correctness. Add no predicate-only
receipt tests that duplicate the CLI outcomes.

Cases: cold output; valid unchanged output; source/config/dependency identity
change; incomplete output; failed build; concurrent callers; an edit during
preparation; active compiler replacement; and clean shutdown. A fixture may
count real producer processes to guard the unchanged-path performance contract.
It may not supply the outputs the producer is meant to build.

## Done criteria

- [x] Stale source plus an existing `index.js` produces current usable tools.
- [x] Missing or damaged outputs are repaired; unchanged outputs avoid a build.
- [x] Failed preparation retains the prior working worker and never certifies partial output.
- [x] Active framework edits replace the compiler process after successful preparation.
- [x] New Node proofs, existing development proof, package/API/SDK checks and lint pass.
- [x] Full API suite passes on its guarded isolated target.
- [x] CI runs the new proofs.
- [x] API development still uses `.sprindle-dev/routes.mjs` with declarations disabled.
- [x] Scope and whitespace checks pass. Parent review and index update are complete.

## Execution evidence

Parent verification passed the 7 real CLI/lifecycle proofs, Sprindle package
type check, API lint, and whitespace check on the final source. Parent review
checked the output receipt, publication recovery, process-tree termination,
and worker replacement. The source remains uncommitted after the planning
commit. Windows shutdown and remote CI remain unverified.

The pre-fix preparation proof failed for the intended reason: after the fixture
changed Sprindle source, the public tooling import still returned `before`
instead of `after` because the old guard accepted the existing `index.js`.

The first lifecycle review also produced two failing real-boundary regressions.
With the old shutdown and replacement branches, the delayed-build proof found
published output after the launcher had closed. The worker-shutdown proof
timed out waiting for HTTP after the pending edit failed preparation; the log
claimed the active worker remained, but the worker had already stopped. Both
proofs pass after the lifecycle repair.

The final producer and lifecycle proofs passed:

- `node --test apps/api/scripts/ensure-tooling.test.mjs apps/api/scripts/dev-launcher.test.mjs` — 7 passed. These use the real producer, public package consumer, HTTP worker, route watcher, and child-process shutdown in temporary Carta-shaped workspaces. The shutdown proof delays the real compiler, verifies the producer process group exits, checks lock/stage cleanup and no late receipt, and checks the port is free. The replacement proof edits during delayed server shutdown, fails the next preparation, reads the last prepared HTTP response, then proves recovery.
- `pnpm --filter @southneuhof/sprindle type-check` — passed.
- `pnpm --filter @southneuhof/sprindle test:tooling` — 5 files and 59 tests passed.
- `pnpm --filter @southneuhof/api type-check` and `pnpm --filter @southneuhof/sdk type-check` — passed.
- `pnpm --filter @southneuhof/sprindle exec oxlint src tooling` and `pnpm --filter @southneuhof/api lint` — passed.
- `pnpm --filter @southneuhof/api test:dev-routes` — 1 proof passed.
- `pnpm module:preflight -- --needs test` — passed for the isolated `carta_api_test` target at `10.8.69.67:54432`.
- `pnpm --filter @southneuhof/api test` — migrations and all 16 files / 82 tests passed on that guarded target.
- `git diff --check` — passed.

After the final Windows shutdown import correction, `pnpm --filter @southneuhof/api lint`, `node --test apps/api/scripts/dev-launcher.test.mjs` (3 passed), and `git diff --check` passed. The Windows branch remains unverified on this host.

The receipt records installed identities from TypeScript's selected external
compiler inputs, plus the direct build tools. This includes `@types/node`
24.13.3, Drizzle 1.0.0-rc.4, Hono 4.12.27, and Zod 4.5.1 in the current
workspace. The workspace lockfile content is also fingerprinted, so a change
to the resolved package graph invalidates the receipt. The inventory reads the
selected compiler file list; it does not enumerate all of `node_modules`.
It does not detect manual edits to installed package files that leave their
version and lockfile unchanged.

The drift check was clean before implementation. The API Vitest script now
excludes the two `node:test` proof files because Vitest reported “No test suite
found” when it collected them. Backend CI runs both files directly with Node.
The test-audit references `openclaw-testing`, `crabbox`, `autoreview`,
`scripts/run-vitest.mjs`, and `scripts/check-changed.mjs`; those tools or skills
are not present here. Native repository commands and manual diff review were
used instead. The shared `plans/README.md` index is owned by the parent and
awaits its final review.

The preparation tree uses a detached process group and bounded TERM/KILL
cleanup on POSIX. Windows uses `taskkill.exe /PID <pid> /T /F`, scoped to the
owned preparation tree. The lifecycle proof ran on macOS; the Windows branch
was not executed here. Forced Windows termination can leave a staging
directory and an abandoned lock record; no process holds that lock, and the
next producer recovers it. Backend CI currently runs these proofs on Ubuntu,
so there is no Windows lifecycle result to claim.

Files changed by this execution:

- `.github/workflows/backend-validation.yml`
- `apps/api/README.md`
- `apps/api/package.json`
- `apps/api/scripts/dev.ts`
- `apps/api/scripts/dev-launcher.mjs`
- `apps/api/scripts/dev-launcher.test.mjs`
- `apps/api/scripts/ensure-tooling.mjs`
- `apps/api/scripts/ensure-tooling.test.mjs`
- `packages/sprindle/package.json`
- `packages/sprindle/tooling/package-state.mjs`
- `packages/sprindle/tooling/package.mjs`
- `pnpm-lock.yaml`
- `plans/082-prepare-current-sprindle-tooling.md`

## STOP conditions

Stop and report if the build requires a missing dependency installation during
normal command entry; output staging changes published import paths; a lock
cannot recover without deleting unrelated files; startup needs database writes;
or the plan requires another framework package. After two failed repairs to one
verification fault, investigate that fault separately before further edits.

Later changes from prerequisite or selected workflow plans require a drift
reconciliation, not deletion of their work. Planning approval does not authorize
implementation, a commit, a push, or an editor installation.

## Maintenance notes

Add new tool entries and new compiler configuration inputs to the producer's
inventory. Keep receipts portable across cached output restoration. The API
launcher owns compiler-process replacement; the TypeScript worker owns route
compilation and application-server restarts. Preserve that division when
background RPC type generation is added later.

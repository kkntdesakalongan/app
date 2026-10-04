# Plan 083: Restart the API for runtime source and environment changes

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

- Status: DONE — APPROVE.
- Priority: P1.
- Effort: M.
- Risk: MED; two file watchers must not compete over one restart.
- Category: dx / correctness.
- Confidence: HIGH.
- Depends on: Plan 082 for current compiled tooling and completed worker shutdown.
- Planned at: commit `206768c`, 2026-10-04.

## Why this matters

The route watcher does not watch `src/server.ts`, `src/create-app.ts`,
or `.env`. A developer can edit startup behavior and still run the old API
until a manual restart. Add automatic application restarts while keeping
startup-only changes off the route compilation path.

## Current state

`apps/api/scripts/dev.ts:16–18` starts an ordinary Node child:

```ts
function startServer() {
  log('Starting API server...')
  server = spawn(process.execPath, ['--import', 'tsx', '--env-file-if-exists=.env', 'src/server.ts'], { stdio: 'inherit', env: { ...process.env, SPRINDLE_ROUTE_MANIFEST: manifest } })
```

At lines 37–43, only a successful route compile requests a restart:

```ts
const watcher = await watchRouteManifest(projectRoot, 'src/routes', (error) => {
  if (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    return
  }
  if (ready) restartServer()
}, manifest, false, { declarations: false })
```

- `packages/sprindle/src/tooling/manifest.ts:70–73` tracks esbuild inputs
  and local TypeScript configuration. Package imports are external.
- Its watcher at lines 496–618 watches the route directory and those runtime
  inputs. At lines 607–617, the returned handle exposes only `close()`.
- `apps/api/src/server.ts:22–24` imports `create-app` independently of
  routes. A same-session graph check found 54 runtime inputs and excluded both
  `server.ts` and `create-app.ts`.
- `apps/api/scripts/dev.ts:19–21` closes the route watcher when the
  server exits. A startup syntax error therefore ends the development session.
- `apps/api/scripts/dev-route-reload.proof.mjs:43–74` already proves
  route addition, invalid recovery, moves, deletion, and shutdown.
- Plan 007 intentionally narrowed Sprindle's route watcher. Preserve that
  route compiler contract. Plans 005–006 intentionally disabled development
  declarations and removed duplicate startup compiles.

A Carta Route is the HTTP entry for an operation. Application startup and
process supervision belong in `apps/api`. Add no code comments, new route
registration convention, compatibility alias, or SQL operation.

## Scope

In scope:

- `apps/api/scripts/dev.ts` — application restart coordination.
- `apps/api/scripts/watch-runtime.ts` — create a local runtime file watcher.
- `apps/api/scripts/dev-runtime-reload.proof.mjs` — create lifecycle proof.
- `apps/api/scripts/dev-route-reload.proof.mjs` — extend only overlapping lifecycle coverage.
- `apps/api/scripts/dev-launcher.test.mjs` — copy the runtime watcher into the
  accepted Plan 082 fixture and remove its stale readiness-log assertion.
- `apps/api/package.json` — run both proofs through `test:dev-routes`.
- `packages/sprindle/src/tooling/manifest.ts` — add one input-ownership query
  to the existing watcher handle.
- `packages/sprindle/src/tooling/manifest.spec.ts` — focused query/watch coverage.
- `packages/sprindle/docs/reference.md` — document the watcher handle contract.
- `.github/workflows/backend-validation.yml` — run development proofs.
- `apps/api/README.md` and this plan.

The parent owns `plans/README.md` and its status row. Leave it unchanged.

Out of scope: widening Sprindle's compile watch scope; a second route compiler;
changes to real routes, middleware behavior, domains, schemas, migrations,
permissions, frontend source, or framework package preparation. Plan 082 owns
the launcher and direct Chokidar dependency. Keep API declarations disabled.

## Commands you will need

Run from the repository root with Node 24 or newer. The new runtime proof
exists after Step 1.

| Purpose | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat 206768c..HEAD -- apps/api/scripts apps/api/package.json packages/sprindle/src/tooling/manifest.ts packages/sprindle/src/tooling/manifest.spec.ts packages/sprindle/docs/reference.md .github/workflows/backend-validation.yml apps/api/README.md` | Reconcile Plan 082 and other changes first |
| Runtime proof | `node --test apps/api/scripts/dev-runtime-reload.proof.mjs` | All runtime cases pass |
| Route proofs | `pnpm --filter @southneuhof/api test:dev-routes` | Existing and new lifecycle proofs pass |
| Watcher regressions | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts` | All selected tests pass |
| Tooling suite | `pnpm --filter @southneuhof/sprindle test:tooling` | All tooling tests pass |
| Package types | `pnpm --filter @southneuhof/sprindle type-check` | Exit 0 |
| API types/lint | `pnpm --filter @southneuhof/api type-check`; `pnpm --filter @southneuhof/api lint` | Both exit 0 |
| Framework lint | `pnpm --filter @southneuhof/sprindle lint` | Exit 0 |
| Isolated target | `pnpm module:preflight -- --needs test` | Target passes before database-backed checks |
| Full API suite | `pnpm --filter @southneuhof/api test` | All tests pass after focused checks |
| Scope | `git diff --check` and `git status --short` | Only listed changes; no whitespace errors |

The database-backed suite is a later implementation gate. Planning runs no
server, migration, seed, or build.

## Steps

### 1. Prove stale runtime behavior through HTTP

Create a temporary Carta-shaped API fixture using the real development worker
and launcher files. Its small Hono server loads a real Sprindle manifest, imports
a separate startup module, and exposes a response derived from that module and
a synthetic environment field. Link installed dependencies. Use an available
port, bounded readiness polling, and cleanup of every owned process and file.

Edit the startup module and `.env` and assert the changed HTTP response
without a manual command. Monitor the real route artifact or compile boundary
to prove startup-only changes do not run route compilation. Do not edit the
user's actual `.env`, `server.ts`, or `create-app.ts`.

**Verify:** `node --test apps/api/scripts/dev-runtime-reload.proof.mjs`
fails on the current worker for the stale response, then passes after Steps 2–3.

### 2. Expose route input ownership without widening the compiler

Add `hasInput(file: string): boolean` to the handle returned by
`watchRouteManifest`. It reports route-tree inputs and currently tracked
external runtime inputs. Reuse the existing ignored-path and logical/real-path
matching rules. Include recorded paths after deletion and refresh ownership
after a successful or recoverable failed analysis.

This is a production API: the application runtime watcher uses it to leave
route-owned events to the route compiler. Do not export the dependency map,
add an extra esbuild analysis, or add a general filesystem watcher to Sprindle.

Keep existing callback, output, declaration, readiness and close semantics.
Use the existing watch tests at `manifest.spec.ts:147–172` as the pattern.
Assert route and newly imported dependency ownership plus correct watch outcomes.

**Verify:** `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts`
passes, including narrow-watch and new-dependency cases.
`pnpm --filter @southneuhof/sprindle type-check` exits 0.

### 3. Add the local runtime watcher and complete restart coordination

After the route watcher is ready, use `watch-runtime.ts` to watch API
runtime source under `src` and the development `.env` file. Ignore
generated directories, dependency directories, tests, and declarations.
Wait for watcher readiness before starting the first server.

If `hasInput(eventPath)` is true, let the route compiler own that event.
Otherwise request a server restart without compiling routes. Handle file
creation, atomic replacement, rename, deletion and environment-file recreation.

Use one restart coordinator in `dev.ts`. Coalesce pending requests, keep
a request that arrives during shutdown or startup, and wait for the old server
to release its port. A route compile failure retains the current server.
A startup-only failure reports the child error and keeps the supervisor and
watchers alive until a later edit permits recovery. Do not create a retry loop.

Close the runtime watcher during worker shutdown. Integrate with Plan 082's
awaited shutdown instead of replacing its launcher.

**Verify:** `node --test apps/api/scripts/dev-runtime-reload.proof.mjs`
passes for startup changes, environment changes,
invalid startup recovery, edits during restart, and owned process cleanup.
The route proof still passes. A single route edit must not receive a second
independent restart from the runtime watcher.

### 4. Wire and review the normal workflow

Extend `test:dev-routes` to run both Node proofs. Run that command in
backend CI after normal preparation. Document automatic restart coverage and
the separate deferred RPC type work.

**Verify:** run the remaining command table. Preserve the existing tests
`watcher startup compiles exactly once` and
`watch ignores edits outside routes and inputs`. Update the plan and index
only after a scope review and all required checks pass.

## Test plan

The main test owner is the actual development process observed through HTTP.
Protect changed startup behavior, environment reread, invalid recovery, rapid
edits, port release and process cleanup. The route watcher has separate coverage
for its public input-ownership query. Do not duplicate the whole HTTP scenario
in a unit test or add a production injection flag used only by tests.

## Done criteria

- [x] Startup-only source and `.env` edits change HTTP results automatically.
- [x] Startup-only edits do not compile a route manifest.
- [x] Route-owned events remain compiler-gated and do not cause duplicate restarts.
- [x] Startup errors keep the session available for recovery.
- [x] Edits during restart reach the final running server.
- [x] All command-table checks pass; CI runs both development proofs.
- [x] One initial route compile, source mode and disabled declarations remain.
- [x] Scope review passes; plan and index record final evidence.

## Executor report

STATUS: DONE — APPROVE

STEPS:

- Step 1: done. Before the fix, the real development worker kept returning
  `module-one` after the fixture changed its startup module to `module-two`.
  After the fix, the HTTP proof passes and the route artifact keeps the same
  file identity, timestamp, and content hash for startup-only edits.
- Step 2: done. The watcher handle reports route and current compiler input
  ownership. Focused tests cover a new import, both symlink paths, deletion,
  recovery, and ignored paths.
- Step 3: done. One revision-based coordinator handles both watchers. The HTTP
  proof covers source creation, replacement, move, deletion and recreation,
  `.env` reread and recreation, edits during startup, route restart deduplication,
  invalid startup recovery without a retry loop, and process shutdown.
- Step 4: done. The package command runs both proofs, CI runs that command after
  Sprindle preparation, and the API README records runtime and deferred type work.
- Revision 1: done. The runtime watcher now ignores every `.sprindle*` directory,
  matching the route watcher's generated-path rule. The existing HTTP ignored-path
  case covers `src/.sprindle-contract-generated/generated.ts`. The Plan 082 launcher
  fixture now copies `watch-runtime.ts`; its stale exact readiness-log assertion was
  removed because its HTTP, artifact, and owned-process checks prove readiness.

VERIFICATION:

- `node --test apps/api/scripts/dev-runtime-reload.proof.mjs`: pass.
- `node --test --test-name-pattern='framework edits replace' apps/api/scripts/dev-launcher.test.mjs`: 1 proof passes after the fixture repair.
- `node --test apps/api/scripts/ensure-tooling.test.mjs apps/api/scripts/dev-launcher.test.mjs`: 7 Plan 082 producer/lifecycle proofs pass.
- `pnpm --filter @southneuhof/api test:dev-routes`: 2 proofs pass after the ignored-path change.
- Focused `manifest.spec.ts`: 31 tests pass; Sprindle tooling suite: 59 tests
  pass.
- Sprindle type-check and lint; API type-check and lint: pass.
- API type-check and lint pass after revision 1; the Sprindle checks passed in
  the original implementation run.
- `pnpm module:preflight -- --needs test`: pass on the guarded test target.
- API suite: 82 tests pass; the preflight and test migrations use the guarded test target.
- `git diff --check`: pass. The implementation diff stays within this plan's
  scope. Existing uncommitted Plan 082 files remain intact.

FILES CHANGED:

- `.github/workflows/backend-validation.yml`
- `apps/api/README.md`
- `apps/api/package.json`
- `apps/api/scripts/dev.ts`
- `apps/api/scripts/dev-runtime-reload.proof.mjs`
- `apps/api/scripts/dev-launcher.test.mjs`
- `apps/api/scripts/watch-runtime.ts`
- `packages/sprindle/docs/reference.md`
- `packages/sprindle/src/tooling/manifest.ts`
- `packages/sprindle/src/tooling/manifest.spec.ts`
- `plans/083-restart-api-for-runtime-changes.md`

NOTES:

- The external test-audit tools and `scripts/run-vitest.mjs` and
  `scripts/check-changed.mjs` are absent. Native repository commands and manual
  review were used as authorized.
- The runtime process proof ran on macOS. The updated CI workflow was not run on
  GitHub.
- Parent review accepted the source and test changes after revision 1. The parent
  ran both development HTTP proofs and all three launcher lifecycle proofs again;
  all five passed. API lint and the whitespace check also passed. The index records
  final acceptance. Windows process behavior remains unverified.
- Parent reproduced the accepted launcher fixture failure before revision 1:
  `dev.ts` could not import the uncopied `watch-runtime.ts` and the focused test
  timed out after 30 seconds. The exact `/Route watcher ready\./` assertion was
  also stale because the worker logs `Route and runtime watchers ready.`. After
  copying the runtime watcher and removing that redundant assertion, the focused
  test passed in 22.3 seconds, all seven Plan 082 producer/lifecycle proofs passed,
  and `test:dev-routes` passed.
- Revision 1 adds one in-scope generated-path ignore rule and one ignored path to
  the existing HTTP case; it adds no predicate-only test or compatibility log.

## STOP conditions

Stop and report if input ownership requires another compiler pass; a watcher
must include every dependency or generated directory; a proof needs to edit
real application or environment files; startup requires a database write; or
a changed public HTTP contract becomes necessary. Reconcile expected Plan 082
changes before treating differences as drift. After two failed repairs to one
fault, use a separate diagnostic check.

## Maintenance notes

The route watcher owns route inputs and validation. The local runtime watcher
owns other API source and `.env`. The launcher owns framework/compiler
replacement. Background RPC work must not merge those tasks into one blocking
compile queue. Add newly supported runtime file extensions to the local
watcher and its lifecycle proof together.

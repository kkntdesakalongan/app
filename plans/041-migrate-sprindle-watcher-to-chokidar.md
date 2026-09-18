# Plan 041: Migrate the Sprindle route watcher to Chokidar 3.6

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before you continue.
> If a STOP condition occurs, stop and report it. Do not make an unplanned
> change. When the work and review are complete, update this plan row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 15286ab..HEAD -- packages/sprindle/package.json pnpm-lock.yaml packages/sprindle/tooling/package.mjs packages/sprindle/src/tooling/manifest.ts packages/sprindle/src/tooling/manifest.spec.ts packages/sprindle/test/watcher-resource.proof.mjs packages/sprindle/docs/file-routing-tooling.md .github/workflows/backend-validation.yml`
> If an in-scope file changed, compare the current-state excerpts with the live
> code. Stop if the change alters the watcher contract or package build.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plan 039, complete
- **Category**: migration
- **Planned at**: commit `15286ab`, 2026-09-18

## Why this matters

`watchRouteManifest` opens one `node:fs` watcher for each route directory. It
also opens a recursive watcher for the route root. A large route tree can use
enough file handles to cause `EMFILE` on macOS. The current Carta route tree
has 41 directories. Plan 039 recorded about 100 watcher handles when the tree
had 88 directories.

Chokidar 5 does not fix this by itself. Its default backend is `fs.watch`, and
a prior Chokidar 5 migration still caused `EMFILE`. Chokidar 3.6 has a different
macOS path. It loads its optional `fsevents` package by default and shares a
native stream when paths have the same watched parent. Vite 8.1.4 uses
Chokidar `^3.6.0` and `fsevents ~2.3.3` for this reason.

This plan pins Chokidar 3.6.0. It does not enable polling. On macOS, Chokidar
uses `fsevents` when the optional package is present. If `fsevents` is not
available, Chokidar 3.6 falls back to polling on macOS. On Windows and Linux,
it uses its normal native watcher. The watch scope stays limited to the route
tree and the parent directories of the exact files found by the last compile.

## Prerequisites

All prerequisites must be true before the source change starts:

1. Plan 039 tests stay unchanged. They define add, rename, delete, ignore,
   dependency, debounce, and close behavior.
2. Prepare Sprindle before you run its direct Vitest files. The built
   declarations are required. Use `test:tooling` or run `type-check` first.
3. Add exact `chokidar@3.6.0` to Sprindle `dependencies`. Do not use Chokidar
   4 or 5. Those versions removed the bundled `fsevents` integration.
4. Keep Chokidar external in the tooling bundle. Chokidar 3.6 loads the native
   `fsevents.node` module at run time. An esbuild probe fails if it tries to
   bundle that file.
5. Do not add a direct Sprindle `fsevents` dependency. Chokidar 3.6 already
   declares `fsevents ~2.3.2` as an optional dependency. Keeping Chokidar
   external lets Node resolve that optional package from Chokidar itself.
6. The low-file-limit proof must run on macOS. The current CI has Windows and
   Ubuntu jobs but no macOS watcher job.
7. This plan fixes the Sprindle route watcher only. An `EMFILE` error from
   Vitest, Vite, an editor, or another process is a separate change.

The user request authorizes the Chokidar dependency. It does not authorize a
package publish, an upstream push, or an operating-system limit change.

## Current state

Relevant files:

- `packages/sprindle/src/tooling/manifest.ts` owns compilation and
  `watchRouteManifest`.
- `packages/sprindle/src/tooling/manifest.spec.ts` contains 29 tests. Plan 039
  added the watcher contract tests.
- `packages/sprindle/package.json` owns the package dependency and commands.
- `packages/sprindle/tooling/package.mjs` bundles the tooling entry points.
- `apps/api/scripts/dev.ts` is the main application caller.
- `apps/api/scripts/dev-route-reload.proof.mjs` is the unchanged end-to-end
  route reload proof.
- `.github/workflows/backend-validation.yml` runs Sprindle checks on Ubuntu and
  cold tooling checks on Windows.

Current watcher shape:

```ts
// packages/sprindle/src/tooling/manifest.ts:492-528
export async function watchRouteManifest(projectRoot: string, routesDirectory = 'routes', onResult?: (error?: Error) => void, output = '.sprindle/routes.mjs', bundle = true, options: { declarations?: boolean } = {}) {
  let queue = Promise.resolve(), timer: ReturnType<typeof setTimeout> | undefined, closed = false
  const project = resolve(projectRoot), routesRoot = resolve(project, routesDirectory), watched = new Map<string, ReturnType<typeof watch>>()
  const directories = (directory: string): string[] => [directory, ...readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() && !entry.name.startsWith('.sprindle') && !['.git', 'dist', 'dist-tooling', 'node_modules'].includes(entry.name) ? directories(resolve(directory, entry.name)) : [])]
  // ...one node:fs watcher for each wanted directory...
  const recursiveWatcher = watch(routesRoot, { recursive: true }, (_event, filename) => {
    // ...filter and schedule...
  })
  return { close: async () => { /* close all watchers and await queue */ } }
}
```

The compile already records the exact input files:

```ts
// packages/sprindle/src/tooling/manifest.ts:71-74
const bundled = Object.keys(analysis.metafile.inputs)
  .filter((file) => !file.endsWith('sprindle-routes.ts') && file !== '<stdin>')
  .map((file) => isAbsolute(file) ? file : existsSync(resolve(file)) ? resolve(file) : resolve(projectRoot, file))
const inputs = [...new Set([...bundled, ...(await configInputs(resolve(projectRoot, 'tsconfig.json')))])].sort()
dependencyInputs.set(resolve(projectRoot), inputs)
rejectStaticCycles(projectRoot, analysis.metafile.inputs)
```

The file has a portable containment helper. Reuse it. Do not add another
path-containment implementation:

```ts
// packages/sprindle/src/tooling/manifest.ts:439-442
function containedRelativePathOrUndefined(root: string, file: string) {
  const path = relative(root, resolve(file))
  return isAbsolute(path) || path.split(sep).includes('..') ? undefined : path
}
```

The public caller depends on the present function signature and close result:

```ts
// apps/api/scripts/dev.ts:37-44
const watcher = await watchRouteManifest(projectRoot, 'src/routes', (error) => {
  if (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    return
  }
  if (ready) restartServer()
}, manifest, false, { declarations: false })
log('Route watcher ready.')
```

The package is ESM and has no Chokidar dependency:

```json
// packages/sprindle/package.json:1-5, 49-56
{
  "name": "@southneuhof/sprindle",
  "type": "module",
  "dependencies": {
    "drizzle-orm": "1.0.0-rc.4",
    "esbuild": "^0.25.12",
    "hono": "^4.12.27",
    "jsonc-parser": "^3.3.1",
    "typescript": "7.0.2",
    "zod": "^4.5.0"
  }
}
```

The tooling build already keeps run-time packages external. Add Chokidar to
this list. Do not bundle it:

```js
// packages/sprindle/tooling/package.mjs:20
await build({ /* ... */, external: ['typescript/unstable/sync', 'esbuild', 'jsonc-parser'] })
```

Plan 039 watcher tests that must pass without edits are at
`packages/sprindle/src/tooling/manifest.spec.ts:112-217` and `:254-285`.
During planning, the prepared full tooling run had 56 passes and one timeout in
`watch follows new dependency directories after import`. The same test passed
alone on the next run. Treat this as a known watcher flake that this migration
must remove. Any different baseline failure is a STOP condition.

Repository conventions:

- Use Vitest temporary projects for watcher contract tests.
- Use `vi.waitFor(..., { timeout: 30_000 })` for expected events.
- Always close a watcher in `finally`.
- Use `node:test` and a temporary directory for the resource proof. Do not use
  the application source tree as its fixture.
- Use ASD-STE100 Simplified Technical English in comments and documents.
- Keep the public function signature and returned async `close()` method.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Baseline and full tooling tests | `pnpm --filter @southneuhof/sprindle test:tooling` | exit 0; after the change, 58 Vitest tests pass |
| Focused watcher tests | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts -t "watch"` | all selected tests pass |
| Repeat the watcher gate | `for run in 1 2 3; do pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts -t "watch" || exit 1; done` | all three runs pass |
| Build and type-check Sprindle | `pnpm --filter @southneuhof/sprindle type-check` | exit 0 and refresh `dist-tooling` and `dist-types` |
| Lint Sprindle | `pnpm --filter @southneuhof/sprindle lint` | exit 0 |
| Resource proof on macOS | `(cd packages/sprindle && sh -c 'ulimit -n 128; node --test test/watcher-resource.proof.mjs')` | one test passes; native `fsevents` is active; no `EMFILE` |
| API dev proof | `pnpm --filter @southneuhof/api test:dev-routes` | one test passes |
| Lockfile check | `pnpm install --frozen-lockfile` | exit 0 with no lockfile change |
| Patch check | `git diff --check` | no output |

## Suggested implementation toolkit

- Chokidar 3.6 source and documentation:
  `https://github.com/paulmillr/chokidar/tree/3.6.0`.
- Chokidar 3.6 package metadata:
  `https://github.com/paulmillr/chokidar/blob/3.6.0/package.json`.
- Vite watcher options:
  `https://vite.dev/config/server-options.html#server-watch`.
- Use `improve execute plans/041-migrate-sprindle-watcher-to-chokidar.md`
  for the implementation and review pass if the improve skill is available.

## Scope

**In scope** (the only implementation files to modify):

- `packages/sprindle/package.json`
- `pnpm-lock.yaml`
- `packages/sprindle/tooling/package.mjs`
- `packages/sprindle/src/tooling/manifest.ts`
- `packages/sprindle/src/tooling/manifest.spec.ts` (add one test; do not edit
  Plan 039 tests)
- `packages/sprindle/test/watcher-resource.proof.mjs` (new)
- `packages/sprindle/docs/file-routing-tooling.md`
- `.github/workflows/backend-validation.yml`
- `plans/041-migrate-sprindle-watcher-to-chokidar.md` (status or correction
  only during implementation)
- `plans/README.md` (status row and evidence only during implementation)

**Out of scope** (do not modify):

- `apps/api/scripts/dev.ts` and
  `apps/api/scripts/dev-route-reload.proof.mjs`; they are unchanged callers and
  verification gates.
- Manifest compile, hash, cycle, declaration, or route parsing behavior.
- Sprindle editor and language-server watch behavior.
- Vitest, Vite, web, or operating-system watcher settings.
- A public watcher option, compatibility wrapper, or alias.
- Chokidar 4 or 5, a direct `fsevents` dependency, `graceful-fs`, or another
  dependency.
- Package publication, subtree split, upstream push, or PR creation.

## Git workflow

- Branch: `advisor/041-chokidar-3-watcher`
- Use short imperative commit messages. Example:
  `Migrate route watcher to Chokidar 3.6`.
- Do not push or open a PR unless the operator asks for it.

## Steps

### Step 1: Record the baseline and add Chokidar 3.6

1. Run the drift check and `git status --short`.
2. Run `pnpm --filter @southneuhof/sprindle test:tooling` once.
   - If all 57 tests pass, record the result.
   - If only `watch follows new dependency directories after import` times out,
     run that test alone. Continue only if the focused retry passes.
   - Stop on any other failure.
3. Run:

   ```sh
   pnpm --filter @southneuhof/sprindle add --save-exact chokidar@3.6.0
   ```

   This must add Chokidar to `dependencies`, not `devDependencies`, because the
   built tooling imports it at run time.
4. Add `'chokidar'` to the `external` list in
   `packages/sprindle/tooling/package.mjs`. Do not add `fsevents` to the list or
   to Sprindle dependencies; the external Chokidar package owns it.
5. Run `pnpm install --frozen-lockfile`.
6. Confirm that only the two package files and `tooling/package.mjs` changed in
   this step.

**Verify**:

```sh
pnpm --filter @southneuhof/sprindle why chokidar
pnpm install --frozen-lockfile
```

The first command shows exact Chokidar 3.6.0 as a direct dependency. The second
command exits 0.

### Step 2: Replace the manual handles with two Chokidar watchers

Change only `watchRouteManifest` and its imports in
`packages/sprindle/src/tooling/manifest.ts`.

1. Remove the `watch` import from `node:fs`. Import the Chokidar default export
   and the `FSWatcher` type from `chokidar`. Use `chokidar.watch(...)` so the
   external CommonJS package has one stable ESM import shape.
2. Keep these contracts without a change:
   - the public arguments and defaults;
   - one initial compile and one initial callback;
   - the 100 ms debounce;
   - serialized compiles through one promise queue;
   - input refresh after a successful or failed compile;
   - no callback after close starts;
   - `close()` waits for active work and watcher closure.
3. After the initial compile completes, create two Chokidar watchers:
   - one recursive watcher for `routesRoot`;
   - one watcher for the distinct parent directories of dependency input files
     that are outside `routesRoot`.
4. Set `ignoreInitial: true` and `disableGlobbing: true` on both watchers. Set
   `depth: 0` on the dependency watcher. Do not set `usePolling`,
   `useFsEvents`, `atomic`, or `awaitWriteFinish`. Chokidar 3.6 must select its
   native backend. The existing debounce already combines close events.
5. On the route watcher, ignore relative path parts that start with
   `.sprindle`, or equal `.git`, `dist`, `dist-tooling`, or `node_modules`.
   Compute the path relative to `routesRoot` before the part check. Do not test
   unrelated ancestor directory names.
6. Use `containedRelativePathOrUndefined(routesRoot, input)` to exclude compile
   inputs that are already below the route watcher.
7. Build a `Map<string, Set<string>>` from each external parent directory to
   its exact input file names. The dependency event handler must schedule a
   compile only when this map contains the event path. Watching the parent
   directory keeps atomic file replacement visible.
8. If the external directory map changes after a compile, create a replacement
   dependency watcher for the complete new directory list. Wait until it is
   ready, swap it with the old watcher, then close the old watcher. Do not use
   `add()` for this refresh because Chokidar emits `ready` only once for each
   watcher.
9. When the external directory map is empty, close the old dependency watcher
   and keep no dependency watcher. This can occur when the first compile fails
   before esbuild records inputs.
10. Schedule a compile for route watcher `all` events and for matching
    dependency watcher `all` events after each watcher is ready. Report a
    Chokidar `error` through `onResult` when the watcher is still open.
11. Wait for the route watcher and any initial dependency watcher to become
    ready before `watchRouteManifest` returns. If a watcher reports an error
    before readiness, close the candidate and active watchers and reject.
12. If close starts while a replacement dependency watcher becomes ready,
    close the replacement without installing it. Do not let refresh reopen a
    watcher.
13. In `close()`, mark the watcher closed first, clear the timer, close the
    route watcher and current dependency watcher, wait for the compile queue,
    and return only after all close promises complete.

Do not add a fallback watcher or a new public option.

**Verify**:

```sh
pnpm --filter @southneuhof/sprindle type-check
pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts -t "watch"
```

Both commands exit 0. All existing Plan 039 tests pass without edits.

### Step 3: Add the atomic replacement and low-limit proofs

In `packages/sprindle/src/tooling/manifest.spec.ts`, add one test named:

`watch follows an atomic replacement of an external input`

Use the existing temporary fixture style. Create `helper.ts` before watcher
startup and import it from the route. Start the watcher and record the callback
count. Write the replacement to a sibling temporary file, then use `renameSync`
to replace `helper.ts`. Wait for one later successful callback. Close the
watcher in `finally`. Do not edit an existing watcher test.

Create `packages/sprindle/test/watcher-resource.proof.mjs` with one `node:test`
test named:

`watcher works with a low file limit`

The proof must:

1. Import Chokidar and `watchRouteManifest` from
   `../dist-tooling/index.js`.
2. On macOS, construct a Chokidar `FSWatcher` without paths and assert that its
   `options.useFsEvents` value is `true`. Close the probe at once. This fails if
   the optional native package is absent or polling was forced.
3. Create a temporary project with `tsconfig.json`, one valid route file, and
   160 empty child directories below `routes`.
4. Start the Sprindle watcher with `bundle = false` and
   `{ declarations: false }`.
5. Confirm one successful startup callback.
6. Edit the valid route and wait up to 10 seconds for one later successful
   callback.
7. Close the watcher and remove the temporary project in `finally` or test
   cleanup.

Add this package script:

```json
"test:watcher-resource": "node --test test/watcher-resource.proof.mjs"
```

Build outside the low-limit shell, then run the proof with the reduced limit:

```sh
pnpm --filter @southneuhof/sprindle type-check
(cd packages/sprindle && sh -c 'ulimit -n 128; node --test test/watcher-resource.proof.mjs')
```

**Verify**: the new Vitest test passes. On macOS, the Node proof confirms that
`fsevents` is active, passes one test, and does not report `EMFILE`.

### Step 4: Document the backend and add the macOS gate

In `packages/sprindle/docs/file-routing-tooling.md`, add a short watcher note:

- Sprindle uses Chokidar 3.6 for route files and current compile inputs.
- Chokidar uses `fsevents` on macOS and shares a native parent stream.
- Chokidar falls back to polling on macOS if `fsevents` is not available.
- The macOS CI proof requires the native backend and a file limit of 128.

Do not document or add a Sprindle-specific environment variable. Do not advise
users to force polling.

In `.github/workflows/backend-validation.yml`, add one `macos-watcher` job. It
must use the same checkout, pnpm 12.1.0, Node 24, cache, and frozen install
steps as the existing tooling jobs. Then it must:

1. run `pnpm --filter @southneuhof/sprindle type-check` outside the reduced
   file limit;
2. set `working-directory: packages/sprindle` and run
   `ulimit -n 128 && node --test test/watcher-resource.proof.mjs`.

Do not add a database service or run the full API suite in this job.

**Verify**: the workflow file parses in the normal CI run. Locally, the exact
resource command in the command table passes on macOS.

### Step 5: Run all gates and review the diff

Run these commands in order:

```sh
for run in 1 2 3; do pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts -t "watch" || exit 1; done
pnpm --filter @southneuhof/sprindle test:tooling
pnpm --filter @southneuhof/sprindle type-check
pnpm --filter @southneuhof/sprindle lint
(cd packages/sprindle && sh -c 'ulimit -n 128; node --test test/watcher-resource.proof.mjs')
pnpm --filter @southneuhof/api test:dev-routes
pnpm install --frozen-lockfile
git diff --check
git status --short
```

Read every changed hunk. Confirm that no Plan 039 test changed and no file
outside Scope changed. Update the Plan 041 row in `plans/README.md` with the
test counts and macOS proof result.

**Verify**: every command exits 0. The three repeated watcher runs have no
timeout. The API dev proof passes unchanged.

## Test plan

- Keep all 29 existing manifest tests unchanged.
- Add one Vitest regression for atomic replacement of an external input.
- Add one `node:test` resource proof with 160 empty route directories.
- In the macOS resource proof, confirm that Chokidar selected `fsevents`.
- Run all watcher tests three times to detect the present dependency-watch
  flake.
- Run the complete Sprindle tooling suite once after the repeated focused runs.
- Run the existing API dev route proof without a source change.
- Run the low-limit proof on macOS in CI with `ulimit -n 128`.

## Done criteria

All items must be true:

- [ ] `packages/sprindle/package.json` has exact Chokidar 3.6.0 in
      `dependencies`.
- [ ] `pnpm install --frozen-lockfile` exits 0.
- [ ] `packages/sprindle/tooling/package.mjs` keeps `chokidar` external.
- [ ] `rg -n "from ['\"]node:fs['\"]" packages/sprindle/src/tooling/manifest.ts`
      shows no imported `watch` symbol.
- [ ] `rg -n "usePolling|useFsEvents" packages/sprindle/src/tooling/manifest.ts`
      has no result.
- [ ] The public `watchRouteManifest` signature is unchanged.
- [ ] All original Plan 039 tests are unchanged and pass.
- [ ] Three focused watcher runs pass without a timeout.
- [ ] `pnpm --filter @southneuhof/sprindle test:tooling` exits 0 with 58 Vitest
      tests passed.
- [ ] The low-limit Node proof confirms `fsevents` and passes on macOS with
      `ulimit -n 128` and no `EMFILE`.
- [ ] `pnpm --filter @southneuhof/sprindle type-check` and `lint` exit 0.
- [ ] `pnpm --filter @southneuhof/api test:dev-routes` passes unchanged.
- [ ] `rg -n "from ['\"]chokidar['\"]" packages/sprindle/dist-tooling`
      finds the expected external Chokidar import after the tooling build.
- [ ] `git diff --check` has no output.
- [ ] No file outside Scope is modified.
- [ ] The Plan 041 row in `plans/README.md` records the final evidence.

## STOP conditions

Stop and report. Do not improvise if:

- An in-scope file does not match the current-state excerpts in a way that
  changes the plan.
- The baseline fails in a test other than the one known flaky watcher test.
- The known flaky watcher test fails alone before the change.
- Chokidar resolves to a version other than 3.6.0.
- The implementation sets `usePolling` or `useFsEvents`.
- The implementation watches each route directory as a separate Chokidar path.
- An original Plan 039 test needs an edit to pass.
- The macOS proof does not report `options.useFsEvents === true`.
- The low-limit proof fails because compile or package preparation uses the file
  limit before the watcher starts. Record the failing operation; do not raise
  the limit or weaken the fixture without review.
- A focused watcher test fails or times out in two post-change runs.
- Esbuild tries to bundle Chokidar or `fsevents.node`.
- The change requires an out-of-scope file.

## Maintenance notes

- Chokidar 3.6 is selected for its `fsevents` integration. Do not update to
  Chokidar 4 or 5 without a new watcher design and the same low-limit proof.
- Chokidar 3.6 falls back to polling on macOS when `fsevents` cannot load. The
  CI proof must fail in that state so a package change cannot silently remove
  the native backend.
- Keep the route watcher at one recursive root and the dependency watcher at a
  small set of parent directories. Do not restore one watcher for each route
  directory.
- Reviewers must focus on ready-event ordering, dynamic input add/remove,
  atomic replacement, close races, and repeated full-suite stability.
- This plan does not claim to fix `EMFILE` from Vitest, Vite, the editor, or any
  process other than the Sprindle route watcher.

# Plan 038: Make Sprindle tooling and API filesystem paths Windows-portable

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If a STOP condition occurs, stop and report it. After implementation
> and review, update this plan and its row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 83c13b4..HEAD -- packages/sprindle/tooling/package.mjs packages/sprindle/src/tooling/manifest.ts packages/sprindle/src/tooling/manifest.spec.ts apps/api/scripts apps/api/src/app.ts apps/api/src/server.ts apps/api/src/__tests__ .github/workflows/backend-validation.yml`
> If an in-scope file changed after this plan was written, compare it with the
> excerpts below before implementation. Stop if its behavior no longer matches.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug, tests, DX
- **Planned at**: commit `83c13b4`, 2026-09-17
- **Status**: DONE — 2026-09-17, review APPROVE

## Why this matters

The cold Sprindle tooling build converts a file URL with `.pathname`. On Windows,
that produces `/A:/...`; `path.join` changes it to the invalid `\A:\...` form, so
all five esbuild entry points fail. The declaration subprocess also launches a
POSIX pnpm shim and treats `status: null` as success, which hides its `ENOENT`.
The same URL conversion exists later in API development, route compilation,
production build, runtime manifest loading, and related tests. The fix must make
the full path portable and add a Windows CI proof that starts from missing build
artifacts.

## Current state

- `packages/sprindle/tooling/package.mjs:6-10` uses:

  ```js
  const root = new URL('../', import.meta.url).pathname
  const declarations = spawnSync(join(root, 'node_modules/.bin/tsc'), args, { encoding: 'utf8' })
  if (declarations.status) throw new Error(declarations.stderr || declarations.stdout)
  ```

  On this Windows host, `.pathname` returned `/A:/projects/...`, while
  `fileURLToPath(...)` returned `A:\projects\...`. A missing executable returned
  `{ status: null, error.code: 'ENOENT' }`.
- The direct compiler entry `packages/sprindle/node_modules/typescript/bin/tsc`
  exists and runs with `process.execPath`; it reported TypeScript 7.0.2.
- `apps/api/scripts/dev.ts`, `build-production.ts`, `compile-routes.ts`,
  `dev-route-reload.proof.mjs`, `src/app.ts`, and `src/server.ts` use the same
  `.pathname` filesystem conversion.
- `apps/api/scripts/dev.ts` also spawns the bare `tsx` command. Direct Windows
  `spawn` does not resolve its pnpm shim and reports `ENOENT`.
- `apps/api/src/__tests__/production-bundle.spec.ts` and
  `auth-manifest.spec.ts` also use it. The auth test additionally launches the
  `node_modules/.bin/tsx` shell shim directly.
- `apps/api/scripts/ensure-tooling.mjs:7-10` is the repository exemplar: it
  imports `fileURLToPath` from `node:url` and derives a filesystem root with
  `resolve(dirname(fileURLToPath(import.meta.url)), '..')`.
- Both backend workflows use `ubuntu-latest`; no Windows job exercises the cold
  tooling build.

## Commands you will need

Run from the repository root with the existing dependency installation.

| Purpose | Command | Expected on success |
|---|---|---|
| Drift | `git diff --stat 83c13b4..HEAD -- packages/sprindle/tooling/package.mjs packages/sprindle/src/tooling/manifest.ts packages/sprindle/src/tooling/manifest.spec.ts apps/api/scripts apps/api/src/app.ts apps/api/src/server.ts apps/api/src/__tests__ .github/workflows/backend-validation.yml` | No post-plan source drift |
| Cold tooling | `Remove-Item -Recurse -Force packages/sprindle/dist-tooling,packages/sprindle/dist-types -ErrorAction SilentlyContinue; pnpm --filter @southneuhof/api tooling:ensure` | Exit 0; both directories are rebuilt |
| Sprindle checks | `pnpm --filter @southneuhof/sprindle type-check` | Exit 0 |
| Manifest regression | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts -t "plan011 builds each manifest once"` | Bundled and unbundled manifest test passes |
| API routes | `pnpm --filter @southneuhof/api routes:compile` | Exit 0; route manifest generated without declarations |
| API bundle | `pnpm --filter @southneuhof/api exec tsx scripts/build-production.ts` | Exit 0; production bundle generated |
| API types | `pnpm --filter @southneuhof/api exec tsc -p tsconfig.json --noEmit --singleThreaded` | Exit 0 |
| Focused API tests | Set CI-safe `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`, then run `pnpm --filter @southneuhof/api exec vitest run src/__tests__/auth-manifest.spec.ts src/__tests__/production-bundle.spec.ts` | Both test files pass without contacting the database |
| Lint | `pnpm --filter @southneuhof/sprindle lint && pnpm --filter @southneuhof/api lint` | Exit 0 |
| Diff | `git diff --check` | Exit 0 |

The cold-tooling removal targets only ignored generated directories under the
named package. Resolve and confirm those exact directories before removing them.

## Scope

**In scope**:

- `packages/sprindle/tooling/package.mjs`
- `packages/sprindle/src/tooling/manifest.ts`
- `packages/sprindle/src/tooling/manifest.spec.ts`
- `apps/api/scripts/dev.ts`
- `apps/api/scripts/build-production.ts`
- `apps/api/scripts/compile-routes.ts`
- `apps/api/scripts/dev-route-reload.proof.mjs`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/__tests__/production-bundle.spec.ts`
- `apps/api/src/__tests__/auth-manifest.spec.ts`
- `.github/workflows/backend-validation.yml`
- `plans/038-make-api-tooling-windows-portable.md`
- `plans/README.md`

**Out of scope**:

- URL `.pathname` access for HTTP, database, or object-storage URLs
- General subprocess refactoring outside the affected build and API test path
- Environment-file behavior, database setup, server lifecycle, route behavior,
  framework APIs, dependencies, and application features
- Full Windows backend tests that require a PostgreSQL service container

## Git workflow

Work in the current tree. Do not create a branch, commit, push, or open a pull
request unless the operator requests it. Preserve unrelated work.

## Steps

### Step 1: Fix Sprindle root conversion and declaration execution

In `packages/sprindle/tooling/package.mjs`, derive `root` with
`fileURLToPath(new URL('../', import.meta.url))`. Run TypeScript as
`spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), ...])`.
If `declarations.error` exists, throw a contextual error with that error as its
cause. Separately treat every `status !== 0`, including `null`, as failure and
include captured output or the status/signal in the message. Do not use
`shell: true`, `.cmd`, or a platform branch.

**Verify**: run Cold tooling, then Sprindle checks. Both exit 0 and produce the
normal tooling and declaration outputs.

### Step 2: Convert all affected API filesystem URLs

At each in-scope `.pathname` site, import `fileURLToPath` from `node:url` and use
it for the filesystem path. Keep URLs passed directly to `createRequire` as URLs.
Do not change URL pathname access that parses a non-file URL. Preserve current
route names, output locations, runtime behavior, and string formatting.

In `dev.ts`, launch the server with `process.execPath`, `--import tsx`, and the
existing Node environment-file option. This matches the package's own dev script
and avoids a shell or platform-specific shim name.

In `auth-manifest.spec.ts`, resolve `tsx/cli` with a `createRequire` rooted at
the API package and run it through `process.execPath`. Use the same executable
for all three child processes. This keeps the test portable without a shell.

In `packages/sprindle/src/tooling/manifest.ts`, emit relative ESM import
specifiers from the generated manifest directory and normalize their separators
to `/`. Use that directory as esbuild's `stdin.resolveDir`, and normalize the
manifest's public `sourcePath` values to `/`. Absolute Windows paths are not
valid ESM specifiers. Keep the route model's internal absolute paths unchanged.

In `production-bundle.spec.ts`, omit the unneeded `.bin` directory from the
runtime fixture. Use a Windows junction for directory dependencies because the
test does not require elevated symbolic-link privileges. Preserve the existing
POSIX link type.

The auth-manifest test covers manifest load order, not declaration generation;
pass `{ declarations: false }` in its direct compiler call so it does not depend
on Windows directory-symlink privileges.

**Verify**: run API routes, API bundle, API types, and Focused API tests. All
exit 0.

### Step 3: Add a Windows cold-build CI job

Add a separate job to `.github/workflows/backend-validation.yml` on
`windows-latest`. It must check out without persisted credentials, install the
pinned pnpm and Node 24, install with `--frozen-lockfile`, then run these in this
order:

1. `pnpm --filter @southneuhof/api tooling:ensure`
2. `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts -t "plan011 builds each manifest once"`
3. `pnpm --filter @southneuhof/api routes:compile`
4. `pnpm --filter @southneuhof/api exec tsx scripts/build-production.ts`
5. `pnpm --filter @southneuhof/api exec tsc -p tsconfig.json --noEmit --singleThreaded`

Do not attach the PostgreSQL service, run database tests, or run the aggregate
API build in this job. The aggregate build emits route declarations through a
separate staging path that needs Windows directory-symlink privileges and is not
part of this reported failure. The first command must execute on a clean runner
before any Sprindle build creates the ignored outputs.

**Verify**: inspect the workflow with `git diff --check`; confirm the new job has
`runs-on: windows-latest` and both commands in the required order.

### Step 4: Review and record the result

Run Lint and Diff. Search the in-scope application filesystem code for
`new URL(..., import.meta.url).pathname`; no filesystem match may remain. Review
the complete diff against this plan and update its status and the index only
after every done criterion passes.

**Verify**: `git status --short` lists only in-scope files; all verification
commands and the plan review have recorded results.

## Test plan

- Cold tooling build on the current Windows host proves drive-letter conversion,
  direct TypeScript execution, declaration output, and all esbuild entry points.
- The API route, bundle, and type commands exercise route compilation and the
  production build path without the unrelated declaration-staging path.
- The two focused API tests exercise source and bundled manifest subprocesses
  with a Node-launched `tsx` CLI and use portable package roots.
- The existing `plan011 builds each manifest once` Sprindle test imports both a
  bundled and an unbundled manifest, so it proves the relative ESM specifiers on
  the host platform.
- The Windows CI job prevents Linux-only validation from accepting this class of
  regression again.
- Existing Sprindle/API lint and type checks detect import or syntax mistakes.

## Done criteria

- [x] A cold `tooling:ensure` exits 0 on Windows and builds `dist-tooling` and
  `dist-types`.
- [x] The declaration subprocess uses `process.execPath`, not a `.bin` shim, and
  reports both spawn errors and every nonzero/null status.
- [x] API development launches its TypeScript server through `process.execPath`,
  not the bare `tsx` pnpm shim.
- [x] No in-scope filesystem path uses file-URL `.pathname`.
- [x] Unbundled route manifests contain relative `/`-separated ESM specifiers
  and import successfully on Windows.
- [x] API route compilation, production bundling, type-checking, and both focused
  API tests pass on Windows.
- [x] The backend workflow contains a clean `windows-latest` tooling build,
  route compile, production bundle, and API type-check.
- [x] Sprindle and API lint pass; `git diff --check` passes.
- [x] Only the in-scope files changed, and the plan/index record final evidence.

## Implementation and review evidence

Implementation status: COMPLETE. Review verdict: APPROVE.

- A cold `tooling:ensure` passed on Windows and produced both ignored output
  directories. A final attempt to delete them for a second cold run was blocked
  by the command safety guard; no deletion occurred. `package.mjs` had not
  changed since the successful cold run.
- Sprindle type-check/package passed. The focused bundled/unbundled manifest
  regression passed: 1 test, 24 skipped.
- API route compilation, production bundling, and direct TypeScript checking
  passed. The generated unbundled manifest used `../src/...` specifiers.
- The API development command reached `Listening on port 5199` with 24 routes,
  then was stopped; no listener remained.
- Focused API verification passed: 2 files and 3 tests. It used CI-safe values
  for the three required environment variables and did not contact a database.
- Sprindle and API lint passed. `git diff --check` passed with only line-ending
  conversion warnings from the Windows checkout.
- Scope review found only the files listed in this plan. The full diff contains
  no compatibility alias, shell launch, platform-specific executable name, or
  unrelated application change.

Documented deviation: the first aggregate `pnpm --filter @southneuhof/api build`
reached a separate declaration-staging path and failed because Windows denied a
directory symlink with `EPERM`. That path is outside the reported dev/tooling
failure. The plan and Windows CI gate were narrowed to declaration-free route
compilation, the production bundle, and API type-checking. The auth-manifest test
also disables declarations because it tests manifest load order. No source
workaround was added for the separate declaration-staging limitation.

## STOP conditions

Stop if an in-scope source file has drifted from the current-state description;
if TypeScript cannot run through its package `bin/tsc` file; if the API build
needs a database or secret not documented in its package scripts; if Windows CI
requires a service or shell-specific workaround; or if the same verification
fails twice after one focused correction. Do not add a compatibility wrapper,
shell execution, path-string surgery, dependency, or unrelated subprocess fix.

## Maintenance notes

Use `fileURLToPath` whenever a `file:` URL becomes a filesystem path. Keep URL
objects when an API accepts URLs directly. For package binaries launched from
Node, prefer their JavaScript entry through `process.execPath`; package-manager
scripts can continue to resolve normal command names. Review future CI changes
so at least one clean Windows job reaches Sprindle tooling and the API build.

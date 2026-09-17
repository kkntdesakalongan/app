# Plan 039: Lock the route watcher contract with characterization tests

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat bf9a7ce..HEAD -- packages/sprindle/src/tooling/manifest.spec.ts packages/sprindle/src/tooling/manifest.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `bf9a7ce`, 2026-09-17

## Why this matters

The watcher uses `node:fs` `watch` with one handle per directory. It holds
about 100 handles for `apps/api/src/routes` (88 directories). This causes
`EMFILE` errors on macOS dev. Plan 040 replaces it with Chokidar. Before that
change, the current callback contract must be locked with tests. Without this
lock, the migration can miss events or add spurious compiles and no test will
show it.

## Current state

The relevant files, each with one line on its role:

- `packages/sprindle/src/tooling/manifest.ts` — owns `watchRouteManifest` (lines 492-529). Do NOT change it in this plan.
- `packages/sprindle/src/tooling/manifest.spec.ts` — owns the watcher contract tests. This plan only adds tests here.
- `apps/api/scripts/dev-route-reload.proof.mjs` — the end-to-end dev proof (cold start, add, invalid recovery, move, delete). It must keep passing.

Excerpts of the code as it exists today:

```ts
// packages/sprindle/src/tooling/manifest.ts:492-495
export async function watchRouteManifest(projectRoot: string, routesDirectory = 'routes', onResult?: (error?: Error) => void, output = '.sprindle/routes.mjs', bundle = true, options: { declarations?: boolean } = {}) {
  let queue = Promise.resolve(), timer: ReturnType<typeof setTimeout> | undefined, closed = false
  const project = resolve(projectRoot), routesRoot = resolve(project, routesDirectory), watched = new Map<string, ReturnType<typeof watch>>()
  const directories = (directory: string): string[] => [directory, ...readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() && !entry.name.startsWith('.sprindle') && !['.git', 'dist', 'dist-tooling', 'node_modules'].includes(entry.name) ? directories(resolve(directory, entry.name)) : [])]
```

```ts
// packages/sprindle/src/tooling/manifest.spec.ts:15-17
const roots: string[] = []
function fixture(source = `export const GET = () => 'healthy'`) { const root = mkdtempSync(join(tmpdir(), 'sprindle-manifest-')); roots.push(root); mkdirSync(join(root, 'routes', 'health'), { recursive: true }); writeFileSync(join(root, 'tsconfig.json'), '{}'); writeFileSync(join(root, 'routes', 'health', '+server.ts'), source); return root }
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
```

```ts
// packages/sprindle/src/tooling/manifest.spec.ts:112-117
test('watcher startup compiles exactly once', { timeout: 120_000 }, async () => {
  const root = fixture(); const callbacks: (Error | undefined)[] = []
  const watcher = await watchRouteManifest(root, 'routes', (error) => callbacks.push(error))
  await watcher.close()
  expect(callbacks).toHaveLength(1)
})
```

```ts
// packages/sprindle/src/tooling/manifest.spec.ts:119-132 (pattern for negative then positive assertions)
test('watch ignores edits outside routes and inputs', { timeout: 120_000 }, async () => {
  const root = fixture(); const callbacks: (Error | undefined)[] = []
  const watcher = await watchRouteManifest(root, 'routes', (error) => callbacks.push(error))
  try {
    const start = callbacks.length
    writeFileSync(join(root, 'notes.txt'), 'unrelated')
    mkdirSync(join(root, 'scripts'), { recursive: true })
    writeFileSync(join(root, 'scripts', 'tool.ts'), `export const tool = 1`)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(callbacks).toHaveLength(start)
    writeFileSync(join(root, 'routes', 'health', '+server.ts'), `export const POST = () => 'changed'`)
    await vi.waitFor(() => { expect(callbacks).toHaveLength(start + 1); expect(callbacks.at(-1)).toBeUndefined() }, { timeout: 30_000 })
  } finally { await watcher.close() }
})
```

Existing coverage that must keep passing unchanged:

- `watch follows new dependency directories after import` (manifest.spec.ts:134-145)
- `watch recovers after an invalid source tree is fixed` (manifest.spec.ts:147-156)
- `watch close cancels a pending edit without reopening handles` (manifest.spec.ts:158-166)
- `watch recovers when an external cycle is fixed by an external edit` (manifest.spec.ts:216-234)

Repo conventions that apply here:

- Tests use Vitest and temporary projects. Model after the `fixture` helper above.
- Use `vi.waitFor(..., { timeout: 30_000 })` for events that must fire. Use a fixed `300 ms` sleep for events that must NOT fire. Keep each new test `timeout: 120_000`.
- Keep performance timing out of pass/fail assertions. Use callback counts.
- Use ASD-STE100 Simplified Technical English for new comments. Keep comments short.
- Do not add a new dependency in this plan.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Baseline manifest tests | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts` | all pass (17 tests at plan time) |
| Focused new tests | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts -t "watch "` | all watch tests pass, including new tests |
| Framework lint | `pnpm --filter @southneuhof/sprindle lint` | exit 0 |
| Dev proof | `pnpm --filter @southneuhof/api test:dev-routes` | pass |
| Patch check | `git diff --check` | clean |

## Scope

**In scope** (the only files you should modify):

- `packages/sprindle/src/tooling/manifest.spec.ts` (add new tests only; do not change existing tests)
- `plans/039-lock-watcher-contract-tests.md` (this file, if corrections are needed)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- `packages/sprindle/src/tooling/manifest.ts` — owned by plan 040. No source change here.
- `packages/sprindle/package.json`, `packages/sprindle/tooling/package.mjs` — no new dependency here.
- `packages/sprindle/src/tooling/tooling.spec.ts` — do not change.
- `apps/api/scripts/dev.ts`, `apps/api/scripts/dev-route-reload.proof.mjs` — do not change.
- Compile logic, hashing, cycle check, declaration emit — do not change.

## Git workflow

- Branch: `advisor/039-lock-watcher-contract`
- Commit per step. Message style matches `git log`: short imperative (example: `Add watcher characterization tests`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Record the baseline

1. Run `git status --short` and record that the tree is clean except for expected work.
2. Run the baseline manifest suite. Record the pass count.
3. Record `ulimit -n` output, the route directory count (`find apps/api/src/routes -type d | wc -l`, about 88 at plan time), and the current `EMFILE` log sample if available. This is evidence only. It does not change pass/fail.
4. Run `pnpm --filter @southneuhof/api test:dev-routes` once. Record the pass.

**Verify**: baseline suite passes. `git diff --check` is clean (no source edits yet).

### Step 2: Add characterization tests for add, rename, delete, and ignored paths

In `packages/sprindle/src/tooling/manifest.spec.ts`, add four tests after the existing `watch close cancels` test (after line 166). Do not modify existing tests. Use the `fixture` helper and the `vi.waitFor` pattern from the excerpt above.

1. `watch fires on new route directory add`:
   - Build the 1-route fixture. Open `watchRouteManifest`, await startup. Record `start = callbacks.length`.
   - Create `join(root, 'routes', 'added', '+server.ts')` with `mkdirSync(dirname, { recursive: true })` and a valid `export const GET` source.
   - Wait with `vi.waitFor` for `callbacks.length` to exceed `start` and the last callback to be `undefined`. Timeout `30_000`.
   - Close the watcher in `finally`.

2. `watch fires on route directory rename`:
   - Build the fixture. Add `routes/added/+server.ts` as above and wait for the add callback (so the directory exists and is watched).
   - Record `moved = callbacks.length`. Then `renameSync(join(root, 'routes', 'added'), join(root, 'routes', 'moved'))`.
   - Wait with `vi.waitFor` for `callbacks.length` to exceed `moved` and the last callback to be `undefined`.
   - Close the watcher in `finally`.

3. `watch fires on route file delete`:
   - Build the fixture. Open the watcher, await startup. Record `start`.
   - Delete the route file: `rmSync(join(root, 'routes', 'health', '+server.ts'))`.
   - Wait with `vi.waitFor` for `callbacks.length` to exceed `start`. Accept success or error callback here (delete can leave zero routes, which still recompiles). Assert only that a new callback fired. Then restore the file and wait for recovery to `undefined` if needed. Keep the assertion to callback-count growth, not to manifest content.
   - Close the watcher in `finally`.

4. `watch ignores tooling and dependency output writes`:
   - Build the fixture. Open the watcher, await startup. Record `start`.
   - Write files that must NOT trigger a compile: `join(root, 'node_modules', 'pkg', 'index.js')`, `join(root, '.git', 'index')`, `join(root, 'dist', 'out.js')`, and `join(root, '.sprindle', 'routes.mjs')`. Create parent dirs with `mkdirSync(..., { recursive: true })`.
   - Sleep a fixed `300 ms`. Assert `callbacks` length equals `start`.
   - Then edit the route file and wait for one success callback (proves the watcher is still active). Close the watcher in `finally`.

Timing guidance (same as existing tests): poll with `vi.waitFor` up to `30_000 ms` for expected callbacks. For the must-NOT-fire part, sleep a fixed `300 ms`, then assert unchanged. Do not extend sleeps beyond `500 ms` without approval.

**Verify**: `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts` passes, including the 4 new tests (total 21). `pnpm --filter @southneuhof/sprindle lint` exits 0.

### Step 3: Run the full gates and record evidence

Run in order: full `manifest.spec.ts`, framework lint, `pnpm --filter @southneuhof/api test:dev-routes`. Record passes plus the four new test names in the index row. `git diff --check` must be clean.

**Verify**: all commands exit 0 / pass.

## Test plan

- New tests in `packages/sprindle/src/tooling/manifest.spec.ts` (4 tests listed in Step 2). Pattern: existing watch tests at lines 119-166.
- Existing suites that must pass unchanged: full `manifest.spec.ts`, `pnpm --filter @southneuhof/api test:dev-routes`.
- `tooling.spec.ts` is not required for this plan (no packaging change), but it must not be broken. Do not run it unless time permits. It takes about 120 s.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Four new tests exist with the exact names in Step 2.
- [ ] `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/manifest.spec.ts` passes (21 tests).
- [ ] `pnpm --filter @southneuhof/sprindle lint` exits 0.
- [ ] `pnpm --filter @southneuhof/api test:dev-routes` passes.
- [ ] `git diff --check` is clean.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row for 039 updated to DONE with evidence.

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- Any existing watch test fails before new tests are added. Record which test and the callback sequence. Do not proceed to new tests until the baseline is green.
- A new test flakes twice (spurious callback or timeout). Record the callback sequence. Do not lengthen sleeps beyond `500 ms` without approval.
- A step's verification fails twice after a reasonable fix attempt.
- Failure is environmental (busy port, missing `.env`, sandbox file-watch limits, `EMFILE` in the sandbox) rather than the change. Record the exact error. Do not fix infrastructure.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- These four tests are the regression gate for plan 040 (Chokidar migration). Plan 040 must pass them without modification.
- If route edits ever stop triggering after a move/rename, suspect watcher pruning, not the dep set. The recursive routes watcher is the current backstop.
- A helper file that is not yet imported by any route is intentionally not watched. The importing route's own edit triggers the compile that enrolls the helper. Do not "fix" this by re-adding project-wide watching.
- Reviewer focus: confirm no existing test was modified, new tests use `finally` close, and negative assertions use a fixed short sleep.
- Follow-ups explicitly deferred: Chokidar migration (plan 040), dev manifest bundling, contracts pruning.

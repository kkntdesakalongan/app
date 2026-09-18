# Plan 043: Make contract staging links Windows-safe

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat 2d6b378..HEAD -- packages/sprindle/src/tooling/manifest.ts packages/sprindle/src/tooling/tooling.spec.ts packages/sprindle/src/tooling/manifest.spec.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (plan 042 calls `routes:build`; this plan makes that
  call reliable on Windows)
- **Category**: correctness, dx
- **Planned at**: commit `2d6b378`, 2026-09-19

## Why this matters

`emitRouteDeclarations` in `packages/sprindle/src/tooling/manifest.ts`
stages directory links with `symlinkSync(target, path, 'dir')`. On Windows a
plain `dir` link for a directory requires elevated privilege; without it the
build throws and no `routes.d.ts` is emitted. The missing contract is exactly
what lets a wrong `rpc` key pass type-check as `unknown` and fail at runtime
with a 404. The production codebase already knows the fix: the API bundle
fixture uses `win32 ? 'junction' : ...`. This plan moves that knowledge into
one shared helper at the seam so every staging link is Windows-safe. This is
the smallest change that closes the Windows half of the incident.

## Current state

- `packages/sprindle/src/tooling/manifest.ts:3` imports `symlinkSync` from
  `node:fs` alongside the other fs functions.
- `packages/sprindle/src/tooling/manifest.ts:199-206` is the only production
  `symlinkSync` call pair in the file:

  ```ts
  if (existsSync(projectModules)) for (const entry of readdirSync(projectModules, { withFileTypes: true })) symlinkSync(resolve(projectModules, entry.name), resolve(input, 'node_modules', entry.name), entry.isDirectory() ? 'dir' : 'file')
  for (const name of ['@types', 'hono', 'zod']) {
    const target = resolve(input, 'node_modules', name)
    if (!existsSync(target)) symlinkSync(resolve(frameworkModules, name), target, 'dir')
  }
  ```

- Windows-safe precedent in the same repo:
  `apps/api/src/__tests__/production-bundle.spec.ts:25` uses
  `symlinkSync(source, ..., win32 ? 'junction' : ...)`. Copy the idiom, not
  the test scaffolding.
- Test precedent for link-based repair: `manifest.spec.ts:76-93`
  (`does not reuse a contract through a link outside the output directory`)
  and `tooling.spec.ts:95-126` (dangling-contract repair). Both run on this
  host today and pass; they must keep passing unmodified in behavior.
- No `junction` or `linkDir` helper exists anywhere under
  `packages/sprindle/src`. AGENTS.md rule 8 applies: "Add no compatibility
  alias or wrapper unless the user request requires it" — this helper is the
  required fix, not an alias: it replaces both raw call sites, it does not
  sit beside them.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sprindle types | `pnpm --filter @southneuhof/sprindle type-check` | exit 0 |
| Tooling tests | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/tooling.spec.ts src/tooling/manifest.spec.ts` | all pass |
| API contract build | `pnpm --filter @southneuhof/api routes:build` | exit 0, contract emitted |
| Lint | `pnpm --filter @southneuhof/sprindle lint` | exit 0 |
| Diff hygiene | `git diff --check` | exit 0, no output |

Run from the repository root. Do not run API database tests.

## Scope

**In scope** (the only files you may modify):

- `packages/sprindle/src/tooling/manifest.ts` (add `linkDirectory` helper, use it at both staging sites)
- `packages/sprindle/src/tooling/tooling.spec.ts` (one new Windows-shape test)
- `packages/sprindle/src/tooling/manifest.spec.ts` (one new helper test, only if the existing files cannot host it cleanly; prefer `tooling.spec.ts`)

**Out of scope** (do NOT touch, even though they look related):

- `packages/sdk/src/client.ts`, `apps/web/**` — plan 042 and 044 own those.
- Test-only `symlinkSync` calls inside `*.spec.ts` fixtures — they are test
  setup, not the production seam.
- `packages/sprindle/tooling/package.mjs` — plan 038 already fixed it.
- Watcher code, route scanning, contract content.

## Git workflow

- Branch: `advisor/043-windows-links`
- Message style is plain imperative, e.g. `Stage contract links with Windows-safe junctions`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the helper and replace both staging calls

In `packages/sprindle/src/tooling/manifest.ts`, next to the other small
path helpers at the bottom of the file (near `containedRelativePathOrUndefined`):

```ts
function linkDirectory(target: string, path: string) {
  symlinkSync(target, path, process.platform === 'win32' ? 'junction' : 'dir')
}
```

Then replace exactly the two production staging calls in
`emitRouteDeclarations` (`:202` and `:205`) with `linkDirectory(...)`,
keeping the same arguments and guards. The `entry.isDirectory() ? 'dir' : 'file'`
choice at `:202` becomes:

```ts
if (entry.isDirectory()) linkDirectory(resolve(projectModules, entry.name), resolve(input, 'node_modules', entry.name))
else symlinkSync(resolve(projectModules, entry.name), resolve(input, 'node_modules', entry.name), 'file')
```

Do not change any other line. `symlinkSync` stays imported (still used for
the `file` case).

**Verify**: `pnpm --filter @southneuhof/sprindle type-check` → exit 0.

### Step 2: Add one Windows-shape regression test

In `packages/sprindle/src/tooling/tooling.spec.ts`, beside the existing
repair tests, add a test that stubs `process.platform` (or spies the third
`symlinkSync` argument) and asserts `emitRouteDeclarations`-adjacent staging
uses `junction` on win32 and `dir` elsewhere. Two acceptable shapes, pick the
simpler one that fits the file's existing style:

- (a) unit-test `linkDirectory` through a temp dir: call the compiled helper
  path indirectly by running one real `compileRouteManifest` on the fixture
  with a stubbed platform and asserting `lstatSync(staged).isSymbolicLink()`
  or junction behavior; or
- (b) spy on `node:fs`'s `symlinkSync` during a single fixture compile and
  assert directory links receive `junction` when platform is stubbed to
  `win32`.

Do not copy the whole manifest fixture harness; reuse the file's existing
`fixture()` helper. Keep the test under 40 lines.

**Verify**: `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/tooling.spec.ts` → all pass including the new test.

### Step 3: Run the full tooling gate

- `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/tooling.spec.ts src/tooling/manifest.spec.ts` → all pass.
- `pnpm --filter @southneuhof/api routes:build` → exit 0.
- `pnpm --filter @southneuhof/sprindle lint` → exit 0.
- `git diff --check` → exit 0.

## Test plan

- New test in `tooling.spec.ts`: directory-link type is `junction` under a
  stubbed win32 platform, `dir` otherwise.
- Existing suites `tooling.spec.ts` + `manifest.spec.ts` must pass
  unmodified in behavior (no fixture or assertion edits except the new test).
- Pattern: the file's own `symlinkSync(join(root, 'missing-contract'), contract, 'dir')`
  repair test at `tooling.spec.ts:113`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] No `symlinkSync(..., 'dir')` remains in production `manifest.ts` (grep: `grep -rn "symlinkSync" packages/sprindle/src/tooling/manifest.ts` shows only the `file` case plus the helper)
- [ ] New junction test exists and passes
- [ ] `tooling.spec.ts` + `manifest.spec.ts` fully pass
- [ ] `routes:build` exits 0 and `lint`, `type-check`, `git diff --check` exit 0
- [ ] `git status --short` shows only the three in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live files.
- Stubbing `process.platform` proves impractical in the chosen harness
  (report the blocker; do not restructure the build pipeline).
- Any existing tooling/manifest test fails after the change for a reason
  other than the new helper.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- All future staging links must go through `linkDirectory`. A reviewer
  seeing a raw `symlinkSync(..., 'dir')` in production code should reject it.
- Junctions only apply to directories. The `file` branch must keep `'file'`.
- If Node ever changes junction semantics, this one function is the place.

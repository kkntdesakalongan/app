# Plan 042: Gate web type-check on the generated route contract

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat 2d6b378..HEAD -- apps/web/package.json apps/web/scripts/ensure-routes-contract.mjs apps/web/scripts/ensure-routes-contract.test.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness, dx
- **Planned at**: commit `2d6b378`, 2026-09-19

## Why this matters

The web `rpc` client is a raw Hono `hc` proxy. Its keys must equal the file
route path segments exactly (`packages/sdk/src/client.ts:28-30`,
`packages/sprindle/src/tooling/route-files.ts:53`). When the generated
contract `apps/api/.sprindle/routes.d.ts` is missing, `AppSchema` falls back
to `never` (`packages/sdk/src/client.ts:24`) and every `rpc` use degrades to
`unknown`. A wrong key such as `rpc.coffeeSales` then passes type-check and
fails only at runtime with a 404. This plan makes the contract self-healing:
web `type-check` rebuilds it when absent, so the wrong key always fails fast
at check time. Verified during planning: with the contract present,
`rpc.coffeeSales` is error TS2339; with it deleted, all `rpc` uses are error
TS18046 (`'rpc' is of type 'unknown'`) plus TS2307 on the contract import.

## Current state

- `apps/web/package.json:14`: `"type-check": "pnpm run routes:generate && vue-tsc --noEmit --incremental -p tsconfig.vitest.json"`. It never builds the API contract.
- `apps/api/package.json:10`: `"routes:build": "pnpm run tooling:ensure && sprindle-routes-build . src/routes"`. This is the only command that emits `apps/api/.sprindle/routes.d.ts` with declarations.
- `apps/api/.sprindle/` is git-ignored (`.gitignore:21`), so a fresh checkout or a deleted artifact leaves web `type-check` in the `unknown` state.
- Turbo already orders `^type-check` before web, but agents and CI run the
  web `type-check` script directly and `--affected` graphs can skip the API
  task. The gate must live inside the web script itself, not in the graph.
- Filesystem path style exemplar: `apps/api/scripts/ensure-tooling.mjs:7-10`
  derives repo paths from `fileURLToPath(import.meta.url)`. Match it.
- Node script test style exemplar: `scripts/scaffold-bounded-module.test.mjs:144`
  uses `node:test` plus `node:assert/strict` (`assert.match`). Root
  `test:module-tooling` runs `node --test scripts/*.test.mjs`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Web type-check | `pnpm --filter @southneuhof/framework-web type-check` | exit 0 |
| Rebuild contract | `pnpm --filter @southneuhof/api routes:build` | exit 0, `apps/api/.sprindle/routes.d.ts` emitted |
| Script unit test | `node --test apps/web/scripts/ensure-routes-contract.test.mjs` | all pass |
| SDK types | `pnpm --filter @southneuhof/sdk exec tsc -p tsconfig.json --noEmit --singleThreaded` | exit 0 |
| Diff hygiene | `git diff --check` | exit 0, no output |
| Status scope | `git status --short` | only in-scope files |

Run commands from the repository root unless noted. Do not run API database
tests; this plan needs no database.

## Scope

**In scope** (the only files you may create or modify):

- `apps/web/scripts/ensure-routes-contract.mjs` (create)
- `apps/web/scripts/ensure-routes-contract.test.mjs` (create)
- `apps/web/package.json` (one-line `type-check` change only)

**Out of scope** (do NOT touch, even though they look related):

- `packages/sdk/src/client.ts` — no SDK change in this plan.
- `packages/sprindle/src/tooling/manifest.ts` — symlink portability is plan 043.
- `turbo.json` — the gate lives in the web script so direct runs are covered.
- Any `apps/api/src/**` route, entity, or migration.
- Any `apps/web/src/**` application source.

## Git workflow

- Branch: `advisor/042-contract-gate`
- One commit is enough; message style is plain imperative, e.g.
  `Gate web type-check on the generated route contract`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the ensure script

Create `apps/web/scripts/ensure-routes-contract.mjs`:

- Resolve the repo root and `apps/api/.sprindle/routes.d.ts` from
  `fileURLToPath(import.meta.url)` (two levels up from the script is
  `apps/web`, three is the root). Match the `ensure-tooling.mjs` style.
- `isValid()`: return true only when the file exists, is non-empty, and its
  content contains `RouteContract`. Export this function for the unit test
  (a pure function of a path argument, no hardcoded paths inside it).
- Main flow: if valid, print one line (`routes-contract: ok`) and exit 0.
  If invalid, run `pnpm --filter @southneuhof/api routes:build` via
  `spawnSync` with `stdio: 'inherit'`, then re-check. On Windows spawn
  through the shell (`shell: process.platform === 'win32'`), because a bare
  direct spawn does not resolve the pnpm shim and reports `ENOENT` (same
  lesson as plan 038). If still invalid,
  print `routes-contract missing: run pnpm --filter @southneuhof/api routes:build`
  to stderr and exit 1.
- Use only `node:` built-ins (`node:fs`, `node:path`, `node:url`,
  `node:child_process`). Add no dependency.

**Verify**: `node apps/web/scripts/ensure-routes-contract.mjs` → prints the
`ok` line, exit 0 (contract exists on this tree).

### Step 2: Wire the script into web type-check

Edit `apps/web/package.json:14` so `type-check` becomes:

```json
"type-check": "node scripts/ensure-routes-contract.mjs && pnpm run routes:generate && vue-tsc --noEmit --incremental -p tsconfig.vitest.json"
```

Change nothing else in the file.

**Verify**: `pnpm --filter @southneuhof/framework-web type-check` → exit 0.

### Step 3: Add the script unit test

Create `apps/web/scripts/ensure-routes-contract.test.mjs` with `node:test`
and `node:assert/strict`, following the `assert.match` style of
`scripts/scaffold-bounded-module.test.mjs`:

- Import `isValid` from the script file.
- In `os.tmpdir()` fixtures: a missing path returns false; an empty file
  returns false; a file without `RouteContract` returns false; a file
  containing `export type RouteContract =` returns true.
- No network, no build, no database. Clean up temp files.

**Verify**: `node --test apps/web/scripts/ensure-routes-contract.test.mjs`
→ all tests pass.

### Step 4: Prove the self-healing run

This is the load-bearing proof. Back up the ignored artifact first (it is
regenerable, but keep the safety copy until the step passes):

1. `cp apps/api/.sprindle/routes.d.ts /tmp/routes-gate.bak && cp apps/api/.sprindle/routes.declarations.json /tmp/routes-gate-decl.bak`
2. `rm -rf apps/api/.sprindle`
3. `pnpm --filter @southneuhof/framework-web type-check` → exit 0, and
   `apps/api/.sprindle/routes.d.ts` exists again with `RouteContract` content.
4. If step 3 fails, restore from `/tmp` backups and treat as a STOP condition.

**Verify**: step 3 output shows the rebuild running, final exit 0.

### Step 5: Run the surrounding gates

- `pnpm --filter @southneuhof/sdk exec tsc -p tsconfig.json --noEmit --singleThreaded` → exit 0.
- `git diff --check` → exit 0.
- `git status --short` → only the three in-scope files.

## Test plan

- New unit test `apps/web/scripts/ensure-routes-contract.test.mjs`: four
  validator cases (missing, empty, no-marker, valid). Pattern:
  `scripts/scaffold-bounded-module.test.mjs`.
- Integration proof is Step 4 (deleted artifact regenerates through the real
  `type-check` command). No committed integration test; the spawn path is
  proved by the Step 4 run output recorded in the review.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node --test apps/web/scripts/ensure-routes-contract.test.mjs` exits 0
- [ ] With `apps/api/.sprindle` deleted, `pnpm --filter @southneuhof/framework-web type-check` exits 0 and regenerates `routes.d.ts`
- [ ] `pnpm --filter @southneuhof/sdk exec tsc -p tsconfig.json --noEmit --singleThreaded` exits 0
- [ ] `git diff --check` exits 0 and `git status --short` shows only the three in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live files.
- `routes:build` fails on this host (plan 043 covers Windows; a local failure
  means a different defect).
- The regenerated contract does not make `rpc` typed (SDK check still shows
  TS2307/TS18046).
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- Every future `routes-contract` consumer gets the gate for free through the
  web `type-check` script. If the artifact path moves, update the script and
  this plan's proof.
- Reviewers: the script must never silently pass with a missing contract;
  the re-check after build is the critical line.
- A stale (but present) contract is the API build's own reuse logic, not this
  script's job.

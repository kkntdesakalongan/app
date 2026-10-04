# Plan 084: Refresh RPC types before frontend checks and builds

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

- Status: TODO; planning approved, implementation not started.
- Priority: P1.
- Effort: M.
- Risk: LOW; the guard changes when the existing API build runs.
- Category: correctness / dx.
- Confidence: HIGH.
- Depends on: Plan 082 for current compiled tools and public declarations.
- Planned at: commit `206768c`, 2026-10-04.

## Why this matters

An existing RPC contract can describe old API routes. The frontend guard
accepts that file and skips regeneration. A normal frontend type check or
build should use the current API contract without a separate route-build
command. Continuous development generation remains deferred in Plan 086.

## Current state

`apps/web/scripts/ensure-routes-contract.mjs:16–30` checks a text marker:

```js
export function isValid(path) {
  try {
    const content = readFileSync(path, 'utf8')
    return content.length > 0 && content.includes('RouteContract')
  } catch {
    return false
  }
}

function main() {
  if (isValid(contractPath)) {
    process.stdout.write('routes-contract: ok\n')
    return 0
  }
  const build = spawnSync('pnpm', ['--filter', '@southneuhof/api', 'routes:build'], {
```

- `apps/web/package.json:7` runs `type-check` before `build-only`.
  Line 14 runs this guard before route generation and Vue type checking.
- `apps/api/package.json:10` builds the canonical
  `.sprindle/routes.mjs` and its declarations through Sprindle.
  Line 44 exports `./routes-contract` as `./.sprindle/routes.d.ts`.
- `packages/sdk/src/client.ts:4` imports that generated type.
  Lines 18–26 convert route entries into the Hono RPC client.
- `packages/sprindle/src/tooling/manifest.ts:185–187` already checks
  declaration inputs and output metadata before reusing declarations.
  `tooling.spec.ts:92` proves unchanged builds skip declaration emission.
- `apps/web/scripts/ensure-routes-contract.test.mjs:23–44` tests file
  existence and marker text. It does not exercise a command or SDK consumer.
- `.github/workflows/web-validation.yml:80` uses Node 20.19.0.
  `apps/api/package.json:7` requires Node 24 or newer. The frontend
  guard enters that API command.
- Frontend file-route types already update through the Vue Router Vite
  integration. That generator is not this RPC contract.

Use the existing plain JavaScript child-process style and workspace-relative
paths. The contract is a type boundary; physical API schema imports from
Plans 078–081 remain in place. Do not add a contract package, runtime import,
compatibility alias, code comment, or fallback that changes RPC types to
`unknown`.

## Scope

In scope:

- `apps/web/scripts/ensure-routes-contract.mjs` — command freshness guard.
- `apps/web/scripts/ensure-routes-contract.test.mjs` — replace marker tests
  with command/consumer regressions.
- `.github/workflows/web-validation.yml` — run the Node proof and use
  the API-supported Node version.
- `apps/web/README.md`, `apps/api/README.md` — describe the normal workflow.
- This plan and `plans/README.md`.

Out of scope: frontend pages or resource definitions, SDK implementation,
database commands, declaration-emitter optimization, automatic development
declarations, package exports, API route behavior, and Vite file-route
generation. Preserve `build-only` as the explicit runtime-only build.

## Commands you will need

Run from the repository root with Node 24 or newer.

| Purpose | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat 206768c..HEAD -- apps/web/scripts/ensure-routes-contract.mjs apps/web/scripts/ensure-routes-contract.test.mjs .github/workflows/web-validation.yml apps/web/README.md apps/api/README.md` | Reconcile changes before editing |
| Guard proof | `node --test apps/web/scripts/ensure-routes-contract.test.mjs` | All CLI and consumer cases pass |
| Package regression | `pnpm --filter @southneuhof/sprindle test:tooling` | Existing cache/publication proofs pass |
| API contract | `pnpm --filter @southneuhof/api routes:build` | Current runtime and declarations are published |
| SDK types | `pnpm --filter @southneuhof/sdk type-check` | Exit 0 |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 using the current contract |
| Normal web build | `pnpm --filter @southneuhof/framework-web build` | Types and bundle pass |
| Focused lint | `pnpm --filter @southneuhof/framework-web lint:focused -- scripts/ensure-routes-contract.mjs scripts/ensure-routes-contract.test.mjs` | Exit 0 |
| Scope | `git diff --check` and `git status --short` | Only listed files changed; no whitespace errors |

These are implementation gates. Planning does not regenerate outputs or run
frontend builds.

## Steps

### 1. Prove stale contracts through the actual SDK

Replace the marker-only tests with a temporary Carta-shaped workspace.
Copy the actual guard and SDK source. Give the fixture API the real
`routes:build` command, Sprindle tool, and the existing contract export.
Link installed dependencies; do not substitute a fake compiler or emitter.

Build a small route, then change its response type without deleting
`routes.d.ts`. Invoke the copied guard from the web workspace and
compile an SDK consumer with the frontend's installed TypeScript compiler.
The new valid consumer must pass; the old invalid consumer must fail with
the expected type diagnostic. Use separate consumer files rather than
suppression comments or source assertions.

Also cover a type-only imported source edit, route addition/move/deletion,
and a missing referenced declaration file when the contract pointer still
contains `RouteContract`. Use the existing real-consumer fixtures in
`packages/sprindle/src/tooling/tooling.spec.ts:128–169` as the pattern.

**Verify:** `node --test apps/web/scripts/ensure-routes-contract.test.mjs`
fails on the current guard for stale consumer types and passes after Step 2.

### 2. Use the canonical producer on each normal guard entry

Remove the existence-only early return. Run
`pnpm --filter @southneuhof/api routes:build` from the resolved
repository root on every guard entry. Preserve Windows shell handling,
inherited output, and nonzero status propagation. After success, check that
the expected contract exists. Do not independently reproduce the emitter's
input fingerprint or use timestamps to decide freshness.

Remove the exported `isValid` helper if the replaced tests were its only
callers. Print one clear failure that names the failing command. The normal
frontend type check must stop before Vue checking when route generation fails.

The existing declaration cache owns reuse. Root Turbo builds can already run
API preparation before web checks, so a second guard call can incur a cached
probe. Accept that cost for correctness here; measure it for Plan 086 rather
than add a second freshness mechanism.

**Verify:** `node --test apps/web/scripts/ensure-routes-contract.test.mjs`
passes, including unchanged reuse and a syntax
error with a prior contract present. A failed API build produces a nonzero
guard exit. A repeated unchanged entry does not emit declarations again,
observed at the real compiler boundary.

### 3. Put the proof in normal validation

Add the Node proof to web CI after dependency installation. Change that
workflow's Node version to 24 to meet the invoked API package's existing
engine requirement. Preserve its affected-package, diagnostic, architecture,
and browser checks.

Document that normal web `type-check` and `build` refresh RPC types.
State that API development still leaves continuous RPC generation disabled.
Do not promise live frontend RPC updates before Plan 086 is complete.

**Verify:** run the command table. Web types and the normal web build pass
without a separate manual route-build step. Review the source diff and record
the results in this plan and its index row.

## Test plan

The primary owner is the command guard observed through real SDK type checking.
One source/type change with an existing contract must prove the original
failure. The additional cases protect dependency freshness, route shape,
incomplete output repair, failure propagation, and cache reuse. Add no tests
that merely check the guard's marker predicate or copied expected text.

## Done criteria

- [ ] An existing stale contract is refreshed on normal frontend checks.
- [ ] Real SDK consumers observe changed input/output and route paths.
- [ ] Type-only dependency changes and incomplete declaration graphs are repaired.
- [ ] A failed route build fails the guard even when an older contract exists.
- [ ] Unchanged builds retain the existing declaration-emission cache behavior.
- [ ] All command-table gates pass and CI runs the guard proof on Node 24.
- [ ] Continuous API development declarations remain disabled.
- [ ] Scope review and index update are complete.

## STOP conditions

Stop and report if the producer changes application behavior, needs a database
connection or write, requires a new contract package, or the installed compiler
cannot consume the emitted contract. Missing dependencies are an environment
problem, not grounds to skip freshness. After two failed repairs to one
verification fault, investigate it separately.

Reconcile completed Plan 082 changes. Planning approval does not authorize
implementation, a commit, a push, or an external write.

## Maintenance notes

The API route builder owns freshness and immutable declaration publication.
The web guard owns command ordering and failure propagation. Plan 086 can
reuse the same current-type producer later, but must keep standalone frontend
checks correct when no development worker runs. Keep the SDK contract export
at `apps/api/.sprindle/routes.d.ts`.

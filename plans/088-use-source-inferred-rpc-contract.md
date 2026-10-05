# Plan 088: Use the generated server source for normal RPC types

> Implementation is authorized on `sprindle_unified_generator`. Read this plan,
> use `api-conventions` for API work and `test-audit` for tests, and preserve
> existing work. No database writes, commits, pushes, external installation,
> dependency upgrade, or language migration is authorized.
>
> Drift: `git diff --stat dc1bc1d..HEAD -- apps/api/scripts apps/api/package.json apps/api/tsconfig.json apps/web/scripts apps/web/tsconfig.app.json packages/sdk .github/workflows/backend-validation.yml .github/workflows/web-validation.yml`; inspect the working diff too. Reconcile approved Plan 087 changes.

## Status

- Status: DONE
- Priority: P1
- Effort: L
- Risk: HIGH
- Depends on: Plan 087 accepted by the parent
- Category: migration / correctness / dx
- Planned at: `dc1bc1d`, 2026-10-04

## Why this matters

The user wants types to follow from the necessary server generation, as in
Hono's static inference model. Plan 087 supplies an ordinary typed server graph
and compiles its runtime output. This plan makes normal API development and
frontend commands consume that graph. Keep route authors and web callers free
of generated imports, annotations, extra commands, and a background type worker.

## Current state

- `apps/api/scripts/dev.ts:143–149` starts `watchRouteManifest` for
  `.sprindle-dev/routes.mjs` with `{ declarations: false }`.
- `apps/api/scripts/compile-routes.ts:3` compiles `.sprindle-test/routes.mjs`
  without RPC declarations. Production does the same in a temporary output.
- `apps/api/package.json:44` exports `./routes-contract` as
  `./.sprindle/routes.d.ts`.
- `packages/sdk/src/client.ts:4,18–29` imports `RouteContract` and converts
  each `FileRouteDefinition` to a Hono client schema. Preserve that conversion.
- `apps/web/scripts/ensure-routes-contract.mjs:11–32` always runs API
  `routes:build`, then requires the declaration file.
- `apps/web/package.json` runs that guard before Vue type checking; its build
  includes type checking. `apps/web` uses TypeScript 6 and Vue's checker;
  framework tooling uses TypeScript 7. Both consumers must work.

Current API export:

```json
"./routes-contract": "./.sprindle/routes.d.ts"
```

Current SDK use:

```ts
import type { RouteContract } from '@southneuhof/api/routes-contract'
type AppSchema = UnionToIntersection<ContractEntry<RouteContract>> extends infer TSchema extends Schema ? TSchema : never
```

The new canonical entry from Plan 087 is `.sprindle/routes.ts`, regardless of
runtime output path. It exports the contract inferred from the complete typed
manifest and its scope-bound source modules. Its graph imports ordinary tables,
schemas, entities, and services from their original source. Imported type-only
changes must reach the frontend checker without an RPC emission job.

Authoring contract: file tree defines URL and scope inheritance; normal commands
handle generation. Public SDK type imports remain through
`@southneuhof/api/routes-contract`. Schema runtime imports remain physical API
schema exports. A type import excludes server code from browser output but still
requires resolving backend types with frontend compiler settings.
The producer and consumer must select the same ordinary modules. Keep their
original paths and identity. Source inference cannot provide separate compiler
resolution rules inside one frontend TypeScript program. Do not add generated
symlink mirrors to conceal a resolution conflict.

## Scope

Allowed owners:

- `apps/api/package.json`, `apps/api/tsconfig.json`
- `apps/api/scripts/{dev,compile-routes,build-production}.ts`
- `apps/api/scripts/dev-source-contract.proof.mjs` (new)
- Existing `apps/api/scripts/dev-*.proof.mjs` and launcher/preparation tests only
  for current source artifact expectations
- `apps/web/scripts/ensure-routes-contract.mjs` and its existing test
- `apps/web/tsconfig.app.json` only if current source imports require a precise
  compiler setting; preserve strict templates and unknown-prop checks
- `packages/sdk/src/client.ts`, `packages/sdk/tsconfig.json`, focused SDK tests
- `packages/sprindle/src/tooling/{source,manifest}.ts` and owning tests for
  an integration correction to Plan 087, reported to the parent
- `.github/workflows/{backend,web}-validation.yml`
- `plans/unified-generator/` evidence; this plan and its index row

No business routes, schemas, database commands, Loom changes, Vue pages,
permission changes, source compatibility aliases, or new contract package.
No editor extension installation. Do not rewrite SDK transport or normalize
away a request/response mismatch. Plan 089 removes the existing RPC emitter.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| New dev/SDK proof | `node --test apps/api/scripts/dev-source-contract.proof.mjs` | Exit 0; actual dev entry and frontend consumers work |
| Frontend guard | `node --test apps/web/scripts/ensure-routes-contract.test.mjs` | Exit 0 |
| API dev behavior | `pnpm --filter @southneuhof/api test:dev-routes` | Exit 0; report service requirement if actual fixture needs it |
| Launcher preparation | `node --test apps/api/scripts/ensure-tooling.test.mjs apps/api/scripts/dev-launcher.test.mjs` | Exit 0 |
| Tooling | `pnpm --filter @southneuhof/sprindle test:tooling` | Exit 0 |
| API and SDK types | `pnpm --filter @southneuhof/api type-check` and `pnpm --filter @southneuhof/sdk type-check` | Each exits 0 |
| Full frontend | `pnpm --filter @southneuhof/framework-web type-check` and `pnpm --filter @southneuhof/framework-web build` | Each exits 0 |
| Production runtime build | `pnpm --filter @southneuhof/api exec tsx scripts/build-production.ts` | Exit 0; no database connection during build |
| Runtime browser boundary | `node --test scripts/web-schema-boundary.test.mjs` | Exit 0 |
| API lint | `pnpm --filter @southneuhof/api lint` | Exit 0 |
| Changed frontend script lint | `pnpm --filter @southneuhof/framework-web lint:focused -- scripts/ensure-routes-contract.mjs scripts/ensure-routes-contract.test.mjs` | Exit 0 |
| Scope | `git diff --check` | Exit 0 |

## Steps

### 1. Change the contract export and freshness guard

Point the existing package export at `.sprindle/routes.ts`. Keep the SDK type
import and Hono conversion; change its source only if the derived contract
requires a justified generic correction. Use standard TypeScript source imports,
without ts-ignore, broad any, unknown fallback, or a second declaration ledger.
Make the existing frontend guard ensure the canonical generated source is
current through the normal route producer. Preserve command-failure propagation.
No fabricated empty contract and no manual developer step.

Rewrite the existing guard tests around real SDK consumer outcomes. Remove
emitter-count assertions that no longer describe its contract; preserve cold
creation, stale structure refresh, type-only changes, and failed-generation
behavior. A warm type-only edit is checked without rerunning generation.

**Verify:** guard tests plus actual API and SDK type commands pass.

### 2. Prove continuous types through the actual dev entry

Normal `dev.ts` uses the generator from Plan 087; it must produce the canonical
source during the initial runtime compile even though the executable goes under
`.sprindle-dev`. Add no separate type watcher or semantic declaration job.
Keep the runtime restart watcher, hasInput ownership, framework replacement,
and awaited shutdown rules from Plans 082–083.

Add one isolated process proof following `dev-runtime-reload.proof.mjs` fixture
ownership. Invoke the actual launcher/dev scripts with an owned synthetic Hono
server and no database. Use the actual SDK source and frontend compiler/service.
Observe HTTP and SDK results for route addition/move/delete, changed input and
output types, scope edits, external type-only changes, syntax failure/recovery,
rapid edits, and a concurrent standalone generator. Type-only dependency edits
must not force a runtime compile or restart when outside runtime inputs. Observe
stable runtime revision and current frontend types. Test cold source availability
and complete shutdown. Do not edit a copied entry to inject a missing hook.

**Verify:** new proof, existing dev proofs, and launcher/preparation proofs pass.

### 3. Validate full frontend and deployment compilation

Run the real Vue type checker and frontend build. Resolve backend source imports
with their intended API meaning, including suffixes and aliases. A minimal,
precise TypeScript setting is allowed; broadening skipLibCheck, disabling strict
checks, adding no-check comments, or replacing types with any is not.
Production/test output can keep their existing locations, but must come from the
same generated TypeScript graph. Production builds must still be self-contained
and preserve source locations. Do not connect a database to test build output.

**Verify:** frontend type-check/build, browser boundary proof, production build,
API types, SDK types, and tooling tests pass.

### 4. Add stable correctness checks to CI

Include the new development/source consumer proof in the normal API verification
entry and backend validation. Keep frontend guard proof under web validation.
Update changed command wording that still calls source generation declaration
emission. Keep existing Windows and low-limit watcher jobs; portability is not
proved locally on macOS. Put no machine timing assertion on a shared CI runner.

**Verify:** lint and `git diff --check` pass; rerun affected proof routing tests
if their workflow selections changed. Record exact unrun remote checks. Parent
reviews the full source/caller diff before Plan 089 starts.

## Test plan

The API process proof owns integrated HTTP, SDK, and lifecycle behavior. Framework
tests own structural inference and publication. The guard test owns standalone
freshness. Browser boundary tests own runtime imports; verify an actual bundled
SDK consumer does not include generated routes or server dependencies. Use
separate valid and invalid consumers and actual compiler diagnostics, without
comments. Do not duplicate every framework matrix in the process proof.

## Done criteria

- [x] Existing SDK import resolves to generated TypeScript source.
- [x] Normal API dev creates and maintains the current source contract.
- [x] External type-only changes update ordinary frontend inference without a type worker.
- [x] All command-table gates pass, with explicitly reported service/remote limitations.
- [x] Browser output contains no server implementation through the SDK type import.
- [x] Production/test builds derive from the same source graph.
- [x] Cold startup, rapid edits, concurrent generation, failure recovery, and shutdown are proved.
- [x] CI includes stable integration proofs and has no timing assertion.
- [x] Parent review accepts the implementation.

## STOP conditions

Report to the parent if source inference changes public input/output/status types,
requires weaker checking, breaks module identity, requires database writes, or
cannot work with the installed frontend compiler. Do not replace source inference
with declarations. A precise integration correction in allowed framework owners
is permitted after reporting its reason. Reconcile unexpected unrelated drift.
After two failed repairs to one issue, diagnose and report instead of broadening
scope. No commits, pushes, branch changes, or dependency upgrades.

## Maintenance notes

Keep one canonical source producer and the current public SDK boundary. A future
native generator can replace the producer while preserving files and semantics.
Standalone published SDK distribution is not redesigned here. Parent approval
means the implementation meets this plan; performance acceptance belongs to 089.

Parent acceptance: APPROVE, 2026-10-05. See
`plans/unified-generator/088-implementation.md` for review and check results.

# Plan 089: Remove RPC declaration emission and verify the unified generator

> Implementation is authorized on `sprindle_unified_generator`. Read this plan
> and use `test-audit` for changed tests. No commit, push, merge, database write,
> external installation, compiler upgrade, or implementation-language migration
> is authorized. Preserve unrelated work and pre-existing research artifacts.
>
> Drift: `git diff --stat dc1bc1d..HEAD -- packages/sprindle apps/api/scripts apps/web/scripts apps/api/README.md apps/web/README.md .github/workflows/backend-validation.yml turbo.json`; inspect working changes. Reconcile accepted Plans 087–088 first.

## Status

- Status: DONE
- Priority: P1
- Effort: L
- Risk: HIGH
- Depends on: Plans 087–088 accepted by the parent
- Category: migration / perf / tests / docs
- Planned at: `dc1bc1d`, 2026-10-04

## Why this matters

The user approved one typed generated server source graph for runtime and SDK
inference, instead of a separate RPC declaration snapshot and type worker.
After caller migration, the old emitter and its API options must be removed.
Measure normal frontend and editor cost before accepting the migration. Keep
the generator's artifact boundary separate from semantic TypeScript analysis;
its implementation remains JavaScript/TypeScript for now.

## Current state and accepted prerequisites

At `dc1bc1d`, `manifest.ts:167–497` contains declaration staging, subprocess
compiler probes/emission, cache metadata, path rewriting, and immutable contract
trees. `compileRouteManifest` and `watchRouteManifest` accept a sixth
`{ declarations?: boolean }` argument. API dev/test/production callers pass false.
Batch route builds default to emission. Examples:

```ts
const emitDeclarations = options.declarations ?? true
const publishDeclaration = emitDeclarations ? await emitRouteDeclarations(projectRoot, routesDirectory, model.routes, declaration, bundle) : undefined
```

`tooling/package.mjs:103–120` separately emits public framework types. That is
package delivery and stays. Do not delete TypeScript or editor support because
application RPC emission is removed.

Plan 087 adds canonical `.sprindle/routes.ts`, backed by complete immutable
source versions and precise scope-bound routes. Runtime compilation uses this
same graph. Plan 088 changes the existing API package contract export and
normal frontend/dev entrypoints to consume it. Named prerequisite edits are
expected; compare actual source against those results before cleanup.

Existing tests in `manifest.spec.ts` and `tooling.spec.ts` mix durable runtime,
inference, watcher, source-map, and concurrency contracts with obsolete emitter
cache assertions. Remove only obsolete behaviors. Preserve real consumer,
reader, failed-build, alias, sibling, ambient type, and installed-package coverage
at their correct owners under the source architecture.

## Scope

Allowed owners:

- `packages/sprindle/src/tooling/{manifest,source,language,index}.ts` and focused
  sibling modules introduced by 087
- Existing `packages/sprindle/src/tooling/*.spec.ts` affected by RPC emitter retirement
- `packages/sprindle/src/routes/definition.ts` for inference corrections
- `packages/sprindle/test/{watcher-resource,generator-performance}.proof.mjs`
- `apps/api/scripts/{dev,compile-routes,build-production}.ts` and current proof
  files only to remove the retired option and verify unified behavior
- `apps/web/scripts/ensure-routes-contract.test.mjs` for retired assertions
- `packages/sprindle/{README.md,docs/reference.md,docs/file-routing-tooling.md}`
- `apps/api/README.md`, `apps/web/README.md`, `README.md` for affected tooling claims
- `.github/workflows/backend-validation.yml`, `turbo.json` for artifact/check wording
- `plans/unified-generator/` evidence; this plan, 086 status note, and index rows

Do not alter Loom, business modules, permissions, database targets, package
versions, editor installation, or pre-existing findings. Do not prune generated
source versions or unrelated artifacts. Delete only owned obsolete generated
RPC entry/metadata files where the normal producer must prevent shadowing; do
not introduce broad cleanup of old contract trees. Published SDK distribution
and separate compiler packaging remain deferred.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Framework types/tools | `pnpm --filter @southneuhof/sprindle type-check` | Exit 0 |
| Framework tooling | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling --fileParallelism=false --maxWorkers=1 --minWorkers=1` | Exit 0; all 58 tests pass |
| Full framework runtime | `pnpm --filter @southneuhof/sprindle test -- --fileParallelism=false --maxWorkers=1 --minWorkers=1` | Exit 0; all 218 tests pass |
| Watch resource proof | `pnpm --filter @southneuhof/sprindle test:watcher-resource` | Exit 0; also run documented macOS ulimit 128 command |
| Source/SDK dev proof | `node --test apps/api/scripts/dev-source-contract.proof.mjs` | Exit 0 |
| Existing dev proofs | `pnpm --filter @southneuhof/api test:dev-routes` | Exit 0, or exact service limitation reported |
| Standalone source guard | `node --test apps/web/scripts/ensure-routes-contract.test.mjs` | Exit 0 |
| Tool preparation/replacement | `node --test apps/api/scripts/ensure-tooling.test.mjs`; `node --test apps/api/scripts/dev-launcher.test.mjs` | 4 and 5 tests pass when run separately |
| Editor state delivery | `pnpm --filter @southneuhof/sprindle test:editor-install` and `node --test scripts/check-editor.test.mjs` | Exit 0; owned fixture installation only |
| Existing editor behavior | `pnpm --filter @southneuhof/sprindle test:editor` | Exit 0; report unavailable editor host explicitly |
| API and SDK checks | `pnpm --filter @southneuhof/api type-check`; `pnpm --filter @southneuhof/sdk type-check` | Each exits 0 |
| Full frontend | `pnpm --filter @southneuhof/framework-web type-check`; `pnpm --filter @southneuhof/framework-web build` | Each exits 0 |
| Production build | `pnpm --filter @southneuhof/api exec tsx scripts/build-production.ts` | Exit 0 |
| Browser boundary | `node --test scripts/web-schema-boundary.test.mjs` | Exit 0 |
| Lint | `pnpm --filter @southneuhof/sprindle lint`; `pnpm --filter @southneuhof/api lint` | Each exits 0 |
| Final measured report | `node packages/sprindle/test/generator-performance.proof.mjs --aggregate-current --output plans/unified-generator/final.json` | Exit 0 when the primary normal-dev and type-service gates pass; the report keeps the authorized isolated warm-median exception failed and sets `allPerformanceGatesPass` to false |
| Retirement | `rg -n 'emitRouteDeclarations|probeCompilerFiles|declarations\?: boolean' packages/sprindle/src/tooling apps/api/scripts apps/web/scripts` | No active old implementation or caller matches; the performance proof keeps the old argument only when it imports the immutable `dc1bc1d` baseline fixture, and the normal producer removes obsolete filenames to prevent shadowing |
| Scope | `git diff --check` and `git status --short` | Clean whitespace; changes within named owners |

No API suite that migrates a database is authorized. Runtime framework and
isolated process proofs are the stable behavior gates for this migration.
Remote Windows/Linux CI execution remains unverified until it runs externally.

## Steps

### 1. Remove the separate RPC emitter and its options

Delete semantic RPC emission, subprocess config/probe logic used solely by it,
cache metadata, contract-tree assembly, and emitter-only imports/functions from
`manifest.ts`. Remove the declarations option from both public tooling functions
and every active caller/fixture. Add no alias, no ignored legacy option, and no
fallback emitter. Keep public framework declarations and the editor's checker.
The normal source producer must handle its own complete publication and failures.

Inspect each old emitter test before editing. Migrate durable consumer and
publication contracts to source tests, consolidating overlap. Delete assertions
about emitter reuse or emitted declaration inventories when those behaviors no
longer exist. Keep originals' reader/failure/type precision risks covered.

**Verify:** framework types, tooling suite, API/SDK types, guard test, and
retirement search meet their expected results.

### 2. Measure the complete architecture

Use baseline evidence recorded before 087. Complete the real-process performance
proof for the default dev path and ordinary frontend inference. Measure runtime
compile completion, edit-to-HTTP readiness, cold startup, full Vue checks with
incremental state disabled, peak/reported compiler memory, and persistent
frontend language service diagnostics/completion updates. Use the installed
frontend TypeScript compiler, not only the framework's TypeScript 7 service.
The service must observe a changed external type and current valid/invalid SDK
consumers without regeneration. Record correctness and costs separately.

Proposed acceptance limits, selected for this implementation:

- Runtime compile and edit-to-HTTP medians grow by no more than `max(50 ms, 5% of baseline)`; p95 and cold readiness grow by no more than `max(100 ms, 10% of baseline)`.
- Full Vue check median stays within twice its pre-migration baseline.
- Warm SDK diagnostics/completion requests have p95 at or below 1 second.
- No OOM, checker crash, new heap-limit requirement, stale final contract,
  unbounded work queue, extra runtime compile for an external type-only edit,
  or surviving owned process.

Report memory and all raw samples. Investigate repeatable regressions even
within these tolerances. Repeat once for material noise and retain both reports.
These are engineering gates, not prior measurements. Do not silently relax them
or skip slow samples. Machine timings are evidence; do not enforce them in
shared CI correctness tests. If a limit fails, report it to the parent with a
specific optimization proposal rather than restoring declarations.

The parent reviewed the paired reports and explicitly accepted one narrow
exception for the isolated source-runtime warm edit-to-HTTP median. The pooled
candidate median is 102.22 ms slower against the unchanged 50 ms limit; its p95
passes. The normal development launcher uses the actual entrypoint and its
pooled warm median and p95 both pass. The final report keeps the isolated median
check failed, keeps the original thresholds, shows the primary workflow result
separately, and sets `allPerformanceGatesPass` to false. The temporary phase
profile measured about 11 ms in serial stage writes, which does not explain the
full isolated delta. The parent accepted the measured publication, validation,
and runtime compilation cost without further production changes.

The final review added source-mode require and source-map corrections. Two
intermediate normal-launcher pairs failed: their pooled cold readiness p95
increased by `647.51 ms` against a `270.67 ms` limit, and their pooled warm
edit-to-HTTP median increased by `62.71 ms` against a `50 ms` limit. The cold
pool includes a `3354.25 ms` candidate sample. Those raw reports and their
failed aggregate remain as `final.paired-default.postreview*.json` and
`final.postreview-failed.json`; they are not pooled with the final code.

The exact final source tree was measured in a new pair and confirmation pair.
All normal-launcher checks pass on the pooled final-code samples: cold median
increased by `35.85 ms` with a `249.54 ms` limit, cold p95 decreased by
`120.42 ms`; warm median increased by `45.50 ms` with a `51.52 ms` limit, and
warm p95 decreased by `5.42 ms`. No threshold changed. The isolated source
runtime exception remains the only accepted performance exception.

**Verify:** final report command exits 0, contains baseline/candidate records,
records the authorized exception, and a persistent service sees current SDK
types after type-only edits.

### 3. Close documentation and artifact ownership

Update active docs to state that runtime and SDK derive from the same generated
TypeScript server source, that normal dev keeps it current, and that frontend
commands ensure source generation. Document the stable source artifact, runtime
outputs, consumer-checker cost, source maps, and future language replacement
boundary. Keep author imports and URLs unchanged. Remove active references to
private RPC declaration cache/emission; preserve historical plans.

Mark Plan 086 superseded by 087–089, with no independent type worker planned.
Keep Turbo outputs covering `.sprindle/**` and public package artifacts.
Update backend job wording and proof selection for the actual contract. Do not
change CI secrets or database commands. Add no implementation code comments.

**Verify:** applicable CI-routing tests, lint, browser boundary proof, and scope
checks pass. Docs agree with source and measured evidence.

### 4. Run final verification and request parent review

Run the remaining command table. Record exact commands, exit statuses, counts,
performance results, and unavailable checks in `plans/unified-generator/`.
Do not claim Windows, live editor UI, database runtime, or remote CI verification
from a local type/service fixture. Parent inspects all code, tests, scope, and
evidence and reruns missing/critical checks before acceptance. Mark IMPLEMENTED
until that review; mark DONE only after acceptance and all required local gates.

**Verify:** all applicable gates pass; unresolved limitations are explicit and
no old type worker/emitter remains in the normal development workflow.

## Test plan

Keep primary owners from 087–088. Use persistent frontend compiler/service
checks for editor-like inference and actual API process proofs for lifecycle.
Runtime tests must assert independently expected HTTP results, not copied
configuration. Invalid consumer files must fail for the intended type error.
No no-check or expect-error comments, exact source inventories, forged receipt
fixtures, or production test-only APIs. Existing editor tests cover original
source diagnostics, positions, definitions, and incomplete edits after sharing
the source transform. Runtime source maps must retain original lines and columns
after import rewrites. Ambient consumer coverage must also prove that files used
only for ambient typing gain no runtime execution. Full Vue checks verify
application consumption.

## Done criteria

- [x] RPC declaration emitter/options and active callers are removed.
- [x] Public framework declarations and original editor contracts still work.
- [x] All applicable local correctness/type/build/lint gates pass.
- [x] Persistent frontend inference tracks external type-only edits without generation.
- [x] Performance report records raw samples and memory, passes the primary normal-dev and type-service gates, and keeps the authorized isolated warm-median exception visible as failed.
- [x] Active docs and CI describe the unified source producer.
- [x] Plan 086 is superseded and scope review is accepted.
- [x] Unavailable remote/editor/platform checks are reported precisely.

## STOP conditions

Report if acceptance limits fail, a source contract requires weaker types or
framework upgrades, source maps cannot retain original locations, or a required
check needs a database/external write. Diagnose a repeated fault after two
failed repairs. Preserve the new source architecture while the parent reviews
the blocking evidence; do not silently reintroduce the old emitter. Do not
commit, push, merge, change branches, or install into the user's editor.

## Maintenance notes

Future route/scope/resolution changes need runtime and inferred consumer proofs.
Changes in consumer compiler versions need a full Vue and persistent service
check. The artifact boundary must remain usable by a future native producer.
Old immutable graph pruning, published standalone SDK delivery, and splitting
compiler packaging are separate follow-ups.

Parent acceptance: APPROVE, 2026-10-05, with the stated isolated warm-median
performance exception. The parent reviewed the source producer, runtime
transform, emitter retirement, callers, tests, docs, and evidence. Temporary
probes exposed custom-output deletion and local and top-level `require`
regressions; the owning tests now cover their repairs. Same-line source maps
also cover an aliased project path. The parent reran all tooling files:
6 files, 60 tests passed. The full Vue type check, retirement search, and
diff check passed. Independent calculation of all pooled normal-launcher raw
samples confirmed the reported medians and p95 values. The report keeps
`allPerformanceGatesPass: false` and the isolated 102.22 ms increase visible.
Remote Windows/Linux CI and database suites remain unrun. Public editor type
mirrors were synchronized by normal package preparation, including an older
list-query type change already present in the source owner.

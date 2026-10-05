# Plan 089 implementation

Status: accepted by the parent on 2026-10-05, with the stated isolated
warm-median performance exception. Plan 089 records the independent review.

The RPC declaration compiler, compiler probes, declaration cache, and
`declarations` option are removed from the active Sprindle tooling API. The API
dev, build, and route callers now use the source graph producer. The auth
manifest fixture no longer passes the removed option. Public framework type
declarations and the editor TypeScript service remain.

The source producer keeps `.sprindle/routes.ts` as the SDK contract. It builds
runtime output from the same route and scope graph. Source mode bundles only
generated contextual modules and leaves ordinary source imports at their
authored paths. This preserves ordinary module identity and live imports. The
producer publishes immutable source versions and validates the files it read
before it updates the stable pointers. Obsolete route declaration files are
removed only to prevent them from shadowing the source contract.

## Final review repairs

The normal producer now derives declaration cleanup paths only when the
runtime target ends in `.mjs`. It protects the selected output and the
canonical `.sprindle/routes.ts` entry. The owner test loads both bundled and
source-mode `custom.js` outputs.

The AST walk resolves lexical `require` bindings before it treats literal calls
as module edges. It covers function parameters and declarations, nested
blocks, and destructured bindings. A TypeScript `declare const require` does
not count as a runtime binding. Source mode adds a `createRequire` setup before
authored top-level code. Its generated names do not conflict with authored
identifiers. The owner tests check local values and a top-level CommonJS load
over HTTP.

The compiler gives esbuild an output path under the canonical output directory.
This keeps canonical source paths and the runtime artifact on one path root
when the project enters through a `/var` alias. The source-map test throws on
the same authored line after a longer import rewrite. Both runtime modes map
to the existing authored file and exact original column.

The runtime proof now covers JSON imports, no-substitution dynamic imports,
literal `require`, supported CommonJS cycles, source maps after same-line import
rewrites, runtime recovery, and both runtime modes. The live SDK proof uses the
installed frontend TypeScript 6.0.2 service with the real web config. It checks
valid and invalid consumers after an external type-only edit. It reports zero
runtime inputs, zero generation callbacks after the initial compile, and
unchanged generated artifacts.

The original raw baseline remains in `baseline.json` and
`baseline.initial.json`. The previous aggregate remains in
`final.pre-review-fixes.json`. The failed historical comparison remains in
`final.historical-reference.failed.json`. The intermediate failed aggregate is
`final.postreview-failed.json`. The current aggregate is `final.json`. The exact
final-code default-launcher reports are `final.paired-default.final-code.json`
and `final.paired-default.final-code-repeat.json`. Two earlier post-review
default reports remain but are not pooled. Earlier isolated source-mode reports
also remain.

## Performance decision

The aggregate combines the two fresh normal-launcher pairs, retained
isolated-runtime samples, retained full Vue measurements, and a fresh SDK
service run. It exits 1 when a primary normal-launcher gate fails. It writes
the report before it returns that failure:

```sh
node packages/sprindle/test/generator-performance.proof.mjs --aggregate-current --output plans/unified-generator/final.json
```

`final.json` records `primaryUserWorkflowChecksPassed: true` and
`allPerformanceGatesPass: false`. The fresh normal-launcher pairs use the
immutable `dc1bc1d` baseline and the exact final source copied to isolated fixtures.
Each report has five cold samples and ten warm samples for each variant. The
pooled cold-readiness median is 2,531.23 ms against a 2,495.38 ms baseline.
Its 35.85 ms increase passes the 249.54 ms median limit. The p95 is 2,604.53 ms
against 2,724.95 ms, a 120.42 ms decrease against the 272.50 ms limit.

The pooled warm edit-to-HTTP median is 1,075.91 ms against a 1,030.41 ms
baseline. The 45.50 ms increase passes the 51.52 ms limit. The warm p95 is
1,102.53 ms against 1,107.95 ms, a 5.42 ms decrease against the 110.80 ms
limit. The pool contains all 20 warm samples for each variant.

Two earlier post-review pairs are retained but are not pooled with the final
code. They had a cold p95 increase of 647.51 ms and a warm median increase of
62.71 ms. `final.postreview-failed.json` preserves that failed aggregate.

The isolated source-runtime proof has a pooled warm median of 982.06 ms against
879.84 ms, a 102.22 ms increase. Its unchanged median limit is 50 ms, so that
check fails. Its p95 increase is 35.90 ms against a 100 ms limit, so p95 passes.
The parent explicitly accepted this one isolated median exception after
reviewing the paired raw reports. No threshold changed. These isolated reports
were measured before the final review fixes. The aggregate keeps their failed
check visible and identifies their earlier code. No exception was added for
the intermediate normal-launcher failures. The earlier historical comparison
also remains visible.

The matched isolated compile median increased by 36.70 ms, with a 14.80 ms
lower p95. Cold HTTP readiness improved by 16.23 ms at the median and 66.36 ms
at p95. The full Vue type-check median is 7,768.52 ms against a 6,778.50 ms
baseline, within the 13,557 ms limit. The fresh actual application SDK
completion p95 is 651.95 ms. The fresh live type-only service p95 is 298.49 ms.
Both pass the 1,000 ms limit. The Vue samples remain from the prior full
frontend run.

The temporary phase profile used five 24-route generations per variant from
instrumented package copies. It did not change production source. The current
median phases were 7.43 ms for source graph discovery and parsing, 4.96 ms for
projection and source-map construction, 10.77 ms for serial stage writes,
25.04 ms for esbuild, 2.74 ms for runtime input ownership validation, and
5.85 ms for identity checking and pointer publication. The baseline runtime
only generator median was 37.82 ms, with 13.67 ms in esbuild. The write loop
does not explain the full isolated difference. The parent chose to keep the
typed publication and validation path without a speculative optimization.
Raw phase samples and compiler versions are in `final.phase-profile.json`.

Memory reports are in `final.json`. The median isolated runtime compile
resident set was 103.10 MB at baseline and 104.56 MB for the candidate. The
final-code normal-launcher maximum resident sets were 283.57 MB baseline and
284.92 MB candidate for cold startup; warm process values were 282.77 MB and
273.73 MB. The fresh SDK completion process used 1.06 GB. The fresh live SDK
service used 762.40 MB. The three full Vue checks used 1.19, 1.27, and 1.39 GB
in the retained full frontend run. No checker crash or out-of-memory event
occurred.

## Verification

| Command | Result |
|---|---|
| `pnpm --filter @southneuhof/sprindle test -- --fileParallelism=false --maxWorkers=1 --minWorkers=1` | 35 files and 220 tests passed after the source review fixes |
| `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling --fileParallelism=false --maxWorkers=1 --minWorkers=1` | 6 files and 60 tests passed after the final source-mode `custom.js` test |
| `pnpm --filter @southneuhof/sprindle type-check` | Exit 0 |
| `pnpm --filter @southneuhof/sprindle test:watcher-resource` | 1 test passed |
| `(cd packages/sprindle && sh -c 'ulimit -n 128; node --test test/watcher-resource.proof.mjs')` | 1 test passed |
| `pnpm --filter @southneuhof/api test:dev-routes` | 3 proofs passed |
| `node --test apps/api/scripts/dev-source-contract.proof.mjs` | 1 proof passed |
| `node --test apps/web/scripts/ensure-routes-contract.test.mjs` | 1 proof passed |
| `node --test apps/api/scripts/ensure-tooling.test.mjs` | 4 tests passed |
| `node --test apps/api/scripts/dev-launcher.test.mjs` | 5 tests passed |
| `pnpm --filter @southneuhof/sprindle test:editor-install` | Exit 0; installed only in a temporary fixture |
| `node --test scripts/check-editor.test.mjs` | 4 tests passed |
| `pnpm --filter @southneuhof/sprindle test:editor` | Exit 0 using the existing VS Code host and temporary profile/package paths |
| `pnpm --filter @southneuhof/api type-check` | Exit 0; route build, route check, and TypeScript check passed |
| `pnpm --filter @southneuhof/sdk type-check` | Exit 0 |
| `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| `pnpm --filter @southneuhof/framework-web build` | Exit 0; Vite transformed 1,588 modules |
| `pnpm --filter @southneuhof/api exec tsx scripts/build-production.ts` | Exit 0 |
| `node --test scripts/web-schema-boundary.test.mjs` | 16 tests passed, including the bundled SDK browser boundary |
| `node --test scripts/web-validation-workflow.test.mjs` | 2 tests passed |
| `pnpm --filter @southneuhof/sprindle lint` | Exit 0 after removing one unused import |
| `pnpm --filter @southneuhof/api lint` | Exit 0 |
| `node packages/sprindle/test/generator-performance.proof.mjs --paired-default-worker --output plans/unified-generator/final.paired-default.final-code.json > /dev/null` | Exit 0; 5 cold and 10 warm samples per variant on exact final code |
| `node packages/sprindle/test/generator-performance.proof.mjs --paired-default-worker --output plans/unified-generator/final.paired-default.final-code-repeat.json > /dev/null` | Exit 0; 5 cold and 10 warm confirmation samples per variant on exact final code |
| `node packages/sprindle/test/generator-performance.proof.mjs --aggregate-current --output plans/unified-generator/final.json > /dev/null` | Exit 0; primary normal-launcher and type-service checks pass; `allPerformanceGatesPass` remains false for the authorized isolated median exception |
| `rg -n 'emitRouteDeclarations|probeCompilerFiles|declarations\?: boolean' packages/sprindle/src/tooling apps/api/scripts apps/web/scripts` | No matches; `rg` exit 1 is expected |
| `git diff --check` | Exit 0 |

The first parallel tooling run reached 57 of 58 tests before the macOS volume
returned `ENOSPC` while opening a generated fixture artifact. The first
combined API preparation and launcher run passed 6 of 9 tests; three fixtures
failed with `ENOSPC` while copying or creating temporary files. At that time
the volume reported 463 MiB free at 100% capacity. The affected tooling suite
passed all 58 tests with the explicit one-worker command above. The two API
test files passed separately with 4 and 5 tests. The storage report later
showed 10 GiB free. Only the two temporary fixture directories left by those
failed runs were removed. No source version or unrelated user data was deleted.

The old declarations argument remains only in the benchmark's immutable
baseline branch, where it disables the old RPC emitter for a runtime-only
comparison. The current producer has no declarations option or active emitter
caller. The current manifest removes obsolete declaration filenames to prevent
shadowing.

Windows and Linux remote CI were not run. No database suite was run because it
migrates a database. The editor behavior proof used an existing VS Code host in
a temporary profile; no user editor installation was changed. Parent review
and final acceptance remain pending.

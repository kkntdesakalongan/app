# Plan 091: Enforce route import agreement in normal checks

> Read this plan in full before implementation. Follow the steps and run each
> verification gate. Report a STOP condition with evidence. The parent reviews
> the actual diff and checks before it marks this plan DONE.
>
> **Drift check:** `git diff --stat d47f8bf..HEAD -- packages/sprindle/src/tooling packages/sprindle/tooling packages/sprindle/package.json packages/sprindle/README.md packages/sdk apps/web/scripts/ensure-routes-contract.mjs apps/web/scripts/ensure-routes-contract.test.mjs apps/web/README.md apps/api/scripts apps/api/README.md turbo.json plans/091-enforce-route-import-agreement.md plans/README.md`
> Compare changed source with the current state below before you proceed.

## Status

- **Priority:** P1
- **Effort:** L
- **Risk:** HIGH
- **Depends on:** Plan 090, DONE at `d47f8bf`
- **Category:** correctness / architecture / DX
- **Planned at:** commit `d47f8bf`, 2026-10-05
- **Implementation:** COMPLETE — 2026-10-05; final revision gates pass
- **Parent review:** APPROVE — 2026-10-05; actual diff, scope, runtime probes,
  test value, and all final commands checked by the parent

## Implementation record

Sprindle stores each supported import selection in `resolution.json` inside
the immutable generated source version. The record has compiler targets,
runtime targets from esbuild or Node with `tsx`, and digests for source,
config, and package manifest inputs. The producer publishes the record with
the source graph under the existing lock and pointer rollback. The watcher
tracks package manifests that affect runtime resolution.

The web guard uses its installed TypeScript 6 compiler and
`apps/web/tsconfig.vitest.json`. The SDK command uses its installed TypeScript 7
compiler and `packages/sdk/tsconfig.json`. Both commands refresh the API route
graph and run the same Sprindle verifier. The API producer uses TypeScript 7.

The first parent review found four gaps. The web test now calls the actual
SDK package command. Conditional exports now use the first active branch and
check the selected runtime and declaration branch. The runtime probe uses
the emitted bundle or generated source importer for moved imports. An unchanged
helper keeps its authored importer and literal `require` text. The consumer
compiler reads the generated contract source at its real path. It no longer
checks only forced authored route files.

The revision tests reject the parent conditional-branch fixture before
publication. They check bundled, unchanged source, and projected source package
lookups with same-named nested package instances. The source `require` proof
records `choice.js` and runs the JavaScript value while a same-named
`choice.ts` is present. A positive test covers a consumer path that selects
the exact package source file used by API runtime. This case matches Carta's
Sprindle source path in the web config. It passes only when the physical
consumer target equals the API runtime target in the expected package.

The primary pre-change proof is in
`/tmp/plan091-route-import-agreement/baseline-web-guard.log`. It records web
guard exit 0, web type-check exit 0, and API runtime value `api` for the
same-typed helper mismatch. The revised web proof rejects the mismatch and
passes after the consumer alias is repaired.

The pre-revision parent probes are in `/tmp/plan091-revision-20261005/`.
Each old producer command exited 0. The conditional case published the
`node/index.js` runtime with `browser/index.d.ts`. The nested package case
published and ran the root package while its receipt named the nested
`lib/node_modules` package. The source `require` case ran `javascript` while
its receipt named `choice.ts`. The first local revision gate also caught a
consumer source-path mismatch for API/SDK and a lint error in the new path
assertion. The verifier now permits only an exact API runtime target in the
same named package; the assertion is lint-clean. Those failed attempts are in
`/tmp/plan091-revision-final-20261005/`.

The second parent review found that a type-only package edge had no runtime
target, so the check accepted any declaration inside the named package. The
pre-fix reproduction is in
`/tmp/plan091-parent-type-only-before-20261005-repro.log`. It shows that the
producer selected `index.d.ts` and the consumer selected unexported
`other.d.ts`, but both generation and verification exited 0. The verifier now
checks type-only targets against the selected export subpath and conditions.
It does not require a runtime import for a type-only edge. A source bridge is
valid only when the package declares that exact source as the runtime target
for the import and its branch relates to the selected declaration. The new
tooling test rejects `other.d.ts`, then passes after the consumer maps to
`index.d.ts`.

The TypeScript 7 resolver now uses direct snapshot source-file lookups first.
It builds a canonical path index once only when a direct lookup misses. The
snapshot is immutable, so the index is reused for later imports.

The final revision gate passed 70 Sprindle tooling tests, 8 web guard tests, 1 API
launcher proof, and 34 architecture tests. The SDK, web, and API type checks,
the API production source compile, Sprindle type check and lint, changed-script
lint, and web build passed. TypeScript 7 checked the API and SDK. TypeScript 6
checked the web config. Both bundle and source runtime cases passed. The
one-bundle-pass test passed. Exact commands, logs, exit codes, and elapsed time
are in `/tmp/plan091-round6-final-20261005/`.

The TypeScript 7 lookup now avoids a full source-name scan for each import.
There is no stable before-and-after timing baseline. Parent measurements in
the second review were about 30 seconds for API, 49 for SDK, and 32 for web;
other work can affect those times. No performance change is claimed.
This check covers supported
literal imports. Computed imports and direct compiler or editor commands
bypass it. It does not prove third-party declaration accuracy. It validates
package `exports`, `main` with `types`/`typings`, and `@types` mappings; an
unrecognized package mapping fails closed.

## Parent approval

The parent reviewed the full change and requested two focused revisions.
Real parent fixtures first proved the conditional-branch, nested package,
ordinary `require`, and type-only package gaps. The repaired producer rejects
the conditional and nested package disagreement. The source receipt records
the JavaScript file that the unchanged CommonJS helper actually loads. The
type-only verifier rejects the unexported declaration and passes after repair.

The parent then reran every command in the plan on the final source tree.
All commands exited 0: 70 tooling tests, 8 web guard tests, 1 API launcher
proof, 34 architecture tests, Sprindle/API/SDK/web types, framework and
changed-script lint, the web build, and production source compilation.
Logs and command results are in `/tmp/plan091-parent-approved-20261005/`.
The final API, SDK, and web type-check runs took 6.31, 4.38, and 10.72 seconds.
These are individual observations, not a stable performance comparison.

The 17 changed files are all within scope. No code comments, test-only
production exports, dependency changes, compatibility paths, database writes,
or commits were added. Database and browser suites were outside this tooling
change. The command gate limits stated above remain part of the contract.

**Verdict: APPROVE.** Plan 091 is complete. The changes are uncommitted.

## Why this matters

The API runtime and the SDK checker can select different files for an import
inside an ordinary route dependency. Both files can have the same types, so
a normal type check can pass while it describes a different implementation.
Carta has no known current mismatch. This change prevents a future mistake
from passing its normal checks. Correct import selection must require no
extra step from a route author or agent.

## Contract and limits

1. For application source imports reachable from the route contract, compare
   the selected physical files. Type shape equality is insufficient.
2. The producer records actual runtime selections for runtime edges. A result
   from Sprindle's custom source resolver alone is not runtime evidence.
3. Follow ordinary helpers, re-exports, literal dynamic imports, and literal
   runtime `require` edges that the current generator supports. Check local
   type-only edges against the producer's compiler selection; they have no
   runtime target. Preserve lexical handling of `require`.
4. Use the effective consumer config and its installed compiler. Web checks
   `tsconfig.vitest.json` with TypeScript 6; SDK checks `tsconfig.json` with
   TypeScript 7. A hand-written approximation of both compilers is insufficient.
5. An external package can have separate runtime and declaration files.
   Honor that package's declared relationship. Reject a consumer alias that
   shadows a package with unrelated local source or selects another package
   instance. Do not require a `.js` file and its legitimate `.d.ts` file to
   have the same path. Account for package subpaths and conditions instead of
   accepting every target under a package directory.
6. The supported normal web and SDK type-check commands fail on disagreement.
   Producer generation must reject a disagreement between its modeled source
   graph and the runtime choices it observes. Keep bundled generation, source
   generation, development watch, and production compilation correct.
7. Put shared verification in Sprindle tooling. App scripts supply roots,
   config, and command execution. They do not implement their own resolver.
8. Keep one generated source graph and source-inferred SDK types. Keep ordinary
   module identity and live type-only updates. Add no source mirror, endpoint
   declaration emitter, type worker, per-route flag, or manual import ledger.
9. The guarantee covers supported normal commands and statically known route
   imports. It does not prove third-party declaration accuracy, arbitrary
   computed imports, or raw compiler/editor invocations that bypass the gate.
   State these limits in current docs. Do not claim full compiler equivalence.

## Current state

- `packages/sprindle/src/tooling/source.ts:276`, `routeSourceGraph`, follows
  relative imports and configured aliases with a custom resolver. It skips
  other bare imports and Sprindle package imports. It records dependency files,
  but does not keep a per-import record of the selected files.
- `stageRouteSource` in that file projects contextual route modules. It leaves
  ordinary helpers at their authored paths. Projected imports can be rebased
  to a selected file, while imports inside ordinary helpers remain unchanged.
  A direct route alias alone is therefore a weak regression fixture.
- `generatedRuntimePlugin` in that file serves source-mode generation. It
  externalizes ordinary dependencies. Their transitive runtime choices are
  absent from the bundle metafile. Do not treat that metafile as complete
  evidence for source-mode runtime resolution.
- `packages/sprindle/src/tooling/manifest.ts:46`,
  `compileRouteManifest`, produces bundled and source modes. Its one esbuild
  pass uses `packages: 'external'`, `platform: 'node'`, and `metafile: true`.
  The present check compares file sets, not import edges. Bare package runtime
  targets also need special handling because esbuild leaves them external.
- The generator stages `.sprindle/source/<version>/` and publishes stable
  pointers with a generation lock, rollback, and source identity checks.
  Extend that publication boundary instead of adding an independent receipt.
- `watchRouteManifest` records runtime inputs and config inputs. Type-only
  source edits do not rebuild the runtime graph. The existing source proof
  checks that consumers still read those live type edits.
- `apps/web/scripts/ensure-routes-contract.mjs:12` invokes API `routes:build`
  and checks that `.sprindle/routes.ts` exists. It currently prints success
  without checking import agreement. Web `type-check` then runs `vue-tsc`
  with `tsconfig.vitest.json`.
- `packages/sdk/package.json` currently has:

  ```json
  "type-check": "tsc -p tsconfig.json --noEmit --singleThreaded"
  ```

  It does not refresh or validate the source contract when invoked alone.
- `packages/sprindle/src/tooling/index.ts` exports the shared compile/watch
  and language tools. `packages/sprindle/tooling/package.mjs` builds the
  executable/tooling package and public framework declarations. Add a shared
  consumer entry there only if the actual production callers require it.
- Installed TypeScript 7 exposes `typescript/unstable/sync`, not TypeScript 6's
  `resolveModuleName`. Its local declarations at
  `packages/sprindle/node_modules/typescript/dist/api/sync/api.d.ts` expose
  config parsing, snapshots, programs, and module-symbol queries. Choose a
  supported way to obtain actual selections and prove it for both compilers.
  Do not invent a TypeScript 7 API or load TypeScript 6 for both consumers.
- Installed esbuild exposes `Metafile.inputs[file].imports` with `path`,
  `kind`, `external`, and `original`. Reuse actual build evidence where it is
  available. Resolver calls are distinct from a second bundler pass.
- `turbo.json` disables the web type-check cache. SDK uses the default cache.
  Keep freshness correct for standalone commands and root task orchestration.

## Repo rules and references

- Read root `AGENTS.md` and `apps/api/AGENTS.md` before edits.
- Use Simplified Technical English. Add no code comments. Keep changes small
  and within this plan. Preserve unrelated work.
- Apply `pit-of-success`, `api-conventions` for API changes,
  `web-ui-surfaces` for the web integration, and `test-audit` before test edits.
- Read `docs/resource_system_overhaul/ARCHITECTURE.md` for the current source
  contract. No Loom resource, page, or business module changes are required.
- Read `packages/sprindle/README.md`, `apps/api/README.md`, and
  `apps/web/README.md` for current generation and consumer command behavior.
- Tests must prove a real command or public tooling behavior. Explain each
  new case's regression and why existing coverage misses it in the completion
  report. Do not add exports, flags, or wrappers solely for tests.

## Scope

**In scope:**

- `packages/sprindle/src/tooling/source.ts`, `manifest.ts`, `index.ts`,
  `check.ts`, and new `resolution.ts` if a separate shared owner is useful.
- Their focused tests: `resolution.spec.ts` if added, `source.spec.ts`,
  `manifest.spec.ts`, and `tooling.spec.ts`.
- `packages/sprindle/tooling/package.mjs`, `build.mjs`, `check.mjs`, and a new
  `contract-check.mjs` entry if required by the shared production interface.
- `packages/sprindle/package.json` for a necessary tooling export/bin only.
- `apps/web/scripts/ensure-routes-contract.mjs` and its test.
- `packages/sdk/package.json` and a new
  `packages/sdk/scripts/ensure-routes-contract.mjs` thin command adapter.
- `apps/api/scripts/compile-routes.ts`, `build-production.ts`, `dev.ts`,
  and `dev-source-contract.proof.mjs` only if source-mode integration needs
  them. Prefer the shared generator owner.
- `turbo.json` only for route contract check freshness.
- The three current README files named above, this plan, and `plans/README.md`.

**Out of scope:**

- Business routes, schemas, response types, SDK transport, Loom, web pages,
  broad architecture cleanup, and changes to the retired suffix policy.
- Dependency upgrades, lockfile changes, compiler migration, installs outside
  the workspace, database changes, browser setup, or unrelated tests.
- RPC declaration generation, source copies, per-route opt-in checks,
  compatibility wrappers, and a separate consumer config registry.

## Git workflow

Work on current branch `sprindle_unified_generator`. Implementation and local
verification are authorized. Do not commit, push, merge, or create a PR for
this plan. The earlier commit authorization completed Plan 090.

## Commands

Dependencies are present. Do not reinstall them.

| Purpose | Command | Expected result |
|---|---|---|
| Tooling tests | `pnpm --filter @southneuhof/sprindle test:tooling` | All pass |
| Framework types/package | `pnpm --filter @southneuhof/sprindle type-check` | Exit 0 |
| Framework lint | `pnpm --filter @southneuhof/sprindle lint` | Exit 0 |
| Real web guard | `node --test apps/web/scripts/ensure-routes-contract.test.mjs` | All pass |
| Real API launcher | `node --test apps/api/scripts/dev-source-contract.proof.mjs` | All pass |
| API types | `pnpm --filter @southneuhof/api type-check` | Exit 0 |
| Standalone SDK types | `pnpm --filter @southneuhof/sdk type-check` | Exit 0 |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Web bundle | `pnpm --filter @southneuhof/framework-web build-only` | Exit 0 |
| Production source compile | `pnpm --filter @southneuhof/api exec tsx scripts/build-production.ts` | Exit 0 |
| Architecture policy | `pnpm test:surface-architecture` | All pass |
| Patch whitespace | `git diff --check` | Exit 0 |

Capture exact commands, exit codes, test counts, and logs under a new `/tmp`
directory. Run changed-script lint with the package's current lint tools.
These checks do not require the application database or a browser suite.

## Steps

### 1. Prove the real divergence and compiler adapters

Use the existing temp-project fixtures in `source.spec.ts` and
`ensure-routes-contract.test.mjs`. Create a route that imports an ordinary
helper. That helper imports `@domain/tax`. The API resolves it to
`domain/tax.ts`; the consumer resolves it to `browser/tax.ts`. Give both files
the same exported types and different runtime values. Show that the existing
consumer command accepts the mismatch and the API uses its own value.

Select the smallest shared interface that can compare actual compiler
selections. Prove it on installed TypeScript 6 and 7 with effective configs
that inherit an alias. Read the dependency API/source before choosing the
adapter. A compiler trace or module-symbol query can be used if it supplies
the required target; keep compiler work bounded and close all resources.

**Verify:** Record the baseline consumer exit 0 and the independently observed
API value. After the repair, the same fixture must fail for the import
disagreement. Run the focused tooling tests with the package's Vitest command;
their existing cases must still pass. Do not leave an unasserted probe test.

### 2. Record selections within the generated graph

Extend `routeSourceGraph` and `compileRouteManifestLocked` to retain each
authored importer, specifier, edge kind, and selected target. Keep projected
paths mapped to authored paths. Use actual runtime resolver/build evidence
for runtime edges in both modes, including transitive ordinary helpers.
Validate evidence against graph ownership before publication.

Store the machine-readable record within the immutable source version.
Include resolution-affecting config/package inputs and target identity in its
version/verification boundary. Reuse the existing lock, publication, rollback,
and source identity checks. A failed build or validation must leave readers
on the previous complete graph. Consumers must reject missing, stale, or
invalid records; they must not print success after a partial check.

Do not add a second esbuild bundle pass or a full semantic/declaration job to
each generation. Keep ordinary source files at their current paths. Type-only
content edits must remain visible without a runtime rebuild. Check live
import edges or refresh the producer when a normal consumer command runs so
an old record cannot hide a new transitive import.

**Verify:** Tooling tests pass, including one-bundler-pass and publication
failure coverage. Add the minimum meaningful cases for record publication
and source-mode runtime selection that existing tests cannot prove.

### 3. Implement the one shared consumer verifier

Put the verifier in the shared tooling owner. Load the consumer's compiler
from its project and use its effective config. Compare application physical
identities with canonical paths that handle workspace symlinks. Compare
type-only edges with the producer's type selection. Verify package targets
against their declared runtime/type relationship and package identity.

Report an authored importer, import text, API target, consumer target, and the
consumer config on failure. An unresolved target is a failure when the edge
requires one. Built-ins and legitimate ambient modules need an explicit,
supported treatment. Do not silently exclude every bare package import.

**Verify:** Focused tests reject the same-typed helper alias mismatch under
both compiler versions and pass after the consumer alias is fixed. Tests
also cover a transitive re-export, a local type-only mismatch, legal separate
package runtime/declaration files, and a package alias shadow or wrong package
instance. Consolidate cases in one fixture where this keeps proof clear.

### 4. Make the normal commands enforce agreement

Call the shared verifier from the existing web contract guard before it
reports success, with `tsconfig.vitest.json`. Add only the necessary shared
tooling interface and thin SDK adapter so standalone SDK `type-check` first
refreshes and validates its contract, then runs its existing compiler command.
Preserve failure exit codes. Keep all resolution rules in the shared owner.

Ensure source generation used by the API launcher and production compiler
obeys the same producer contract. Keep task cache behavior from bypassing a
required freshness check; change only the relevant task entry if needed.

**Verify:** The real web guard test proves that its command rejects an import
conflict and recovers after repair. Add a distinct standalone SDK command
proof in the closest existing tooling fixture; it must use TypeScript 7 and
must not rely on an earlier API task. Run API, SDK, and web type checks, both
real source proofs, and the production source compilation command. All pass.

### 5. Document, verify, and report for parent review

Update current command guidance with the enforced rule, failure output, and
limits from this plan. Route authors keep normal imports and commands.
Document the package runtime/declaration exception without promising that the
gate validates third-party runtime behavior or declaration correctness.

Run all commands in the table on the final tree. Report baseline proof,
added-case rationale, changed files, compiler versions, runtime modes, logs,
failed attempts, and any measured cost. Mark implementation COMPLETE and
parent review pending here and in the index. The parent owns approval.

**Verify:** All final commands exit 0. `git diff --name-only` contains only
in-scope files. `git diff --check` exits 0. No added code comments or test-only
production seams appear in the diff.

## Done criteria

- [x] Real baseline evidence shows the same-typed transitive mismatch passed.
- [x] The repaired normal consumer commands reject it and accept the fix.
- [x] Both TypeScript 6 and 7 use their actual effective consumer selection.
- [x] Bundled and source runtime modes supply actual selection evidence.
- [x] Legal package declaration mapping passes; package shadowing fails.
- [x] Failed publication preserves the previous complete source/record pair.
- [x] Ordinary module identity, live type-only updates, and one bundle pass
      remain covered and pass.
- [x] Standalone SDK and normal web checks enforce the gate automatically.
- [x] Every final command in the table passes, with logs and counts recorded.
- [x] Scope and whitespace checks pass.
- [x] The parent reviews the actual diff and records the final verdict.

## STOP conditions

Stop and report evidence if:

- Actual runtime selections for supported source-mode imports cannot be
  established. Do not rename a custom resolver result as runtime evidence.
- The installed consumer compiler cannot supply actual target identities.
  Do not substitute another compiler or copy its resolver algorithm.
- Package relationships require a new dependency, a guessed export mapping,
  or ignoring bare imports to make Carta pass.
- The repair requires a source mirror, declaration emitter, full semantic
  generation job, second bundler pass, or per-route opt-in.
- A check fails twice after a reasonable repair attempt, or an out-of-scope
  source change, database operation, or dependency upgrade is needed.

Send the smallest demonstrated case and a concrete alternative to the parent.
The parent can revise the plan based on evidence; silent scope reduction is
not completion.

## Maintenance notes

New normal route-contract consumers must call the same shared verifier with
their actual config. A changed compiler, runtime loader, package export, or
generation mode can change resolution evidence and needs focused proof.
Review the record's ownership and consumer adapter rather than comparing
type shape. The check should make an import mistake visible at the normal
command boundary with enough information to repair its config or import.

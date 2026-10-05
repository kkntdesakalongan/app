# Plan 087: Generate typed server source for runtime and SDK inference

> Read this plan in full. Reconcile the current source before edits. Run each
> verification gate. Implementation is authorized by the user on branch
> `sprindle_unified_generator`; no commit, push, merge, external installation,
> database write, or language migration is authorized. Preserve existing work.
>
> Drift: `git diff --stat dc1bc1d..HEAD -- packages/sprindle/src/tooling packages/sprindle/src/routes/definition.ts packages/sprindle/tooling packages/sprindle/test`; also inspect the working diff for those paths.

## Status

- Status: DONE
- Priority: P1
- Effort: L
- Risk: HIGH
- Depends on: none
- Category: migration / correctness / dx
- Planned at: `dc1bc1d`, 2026-10-04

## Why this matters

Sprindle generates executable routes and a separate declaration snapshot for the
SDK. The user approved one generated TypeScript server graph from which both
runtime JavaScript and client types follow. Keep file route authoring unchanged.
TypeScript must infer request and response types from that graph without an RPC
declaration compiler or an independent type worker.

The investigation in `docs/findings/sprindle-route-type-inference.md` proved the
mechanism with the real SDK and 24 current API route files. It did not prove the
normal development path, full Vue checks, or editor cost. Its prototype copies
too much source and uses a simple import rewrite; do not ship that prototype.

## Current state

- `packages/sprindle/src/tooling/manifest.ts:50–87` reads routes, builds the
  executable manifest, then optionally awaits semantic declaration emission.
- `packages/sprindle/src/tooling/language.ts:101–123,193–219` binds inherited
  scope types through private helpers and redirected imports in an overlay.
- `packages/sprindle/src/routes/definition.ts` owns generic scope/route types.
- `packages/sprindle/src/hono/file-routes.ts:14–23` accepts runtime entries with
  string paths and unknown handler values. Preserve runtime installation behavior.
- `packages/sprindle/tooling/package.mjs:94–157` prepares public framework
  declarations and bundled tools together. Public framework declarations remain.

Current executable source in `manifest.ts:67`:

```ts
const source = (hash: string) => `${imports.join('\n')}\nexport const hash=${JSON.stringify(hash)};export default [${entries.join(',')}];`
```

Current binding shape in `language.ts:105,114–119`:

```ts
type Parent = typeof import('./parent/+scope').default
type Params = { id: string }
export declare const defineScope: DefineFileScope<Parent, Params>
export declare const defineRoute: DefineFileRoute<Parent, Params>
export declare const list: DefineFileList<Parent, Params>
```

The latter excerpt shows the template's result shape, with example paths. The
live template computes paths from the route tree. Ordinary public imports lack
that contextual binding. A literal manifest importing raw route modules is not
sufficient: CRUD inputs widen and inherited context properties can fail checking.

Carta terms: a Route is an HTTP entry for an operation; a Scope is inherited
request context, access policy, entity, and hooks. An Entity joins a table,
schemas, and persistence behavior. Match `CONTEXT.md`. Use the current route
syntax in `packages/sprindle/src/tooling/language.spec.ts` and application users
routes; add no author imports of generated artifacts or per-route annotations.

## Target contract

1. Each route generation publishes canonical `.sprindle/routes.ts` under the
   API project root, regardless of executable output path. It exports the
   inferred `RouteContract` and the same manifest data used for runtime builds.
2. Store transformed source and executable scope helpers under immutable
   `.sprindle/source/<version>/` directories. The canonical source entry points
   to a complete version. Avoid unchanged pointer writes. Do not prune old
   versions during this migration.
3. Preserve literal paths and concrete handler exports. Derive the contract with
   a shared generic type, such as `InferRouteContract<TManifest>`, from existing
   `FileRouteDefinition` types. Do not generate a second endpoint type inventory.
4. Transform route and scope files that need lexical scope bindings. Also
   project reachable helper and re-export files when they carry those bindings
   through the route graph. Compute the complete set before import edits. Keep
   unrelated tables, schemas, entities, services, and files as imports of their
   original files. Their module identity and external type-only dependencies
   must remain live. Producer and consumer resolution must select the same
   ordinary modules. Source inference does not isolate that live graph from the
   consumer's TypeScript settings.
5. Compile runtime output from the typed source graph. Source-mode runtime must
   also use its bound route modules. Bundled runtime remains self-contained.
6. Source generation is structural: discovery, AST import edits, bindings, and
   publication. It must not run semantic TypeScript analysis or RPC emission.
   Keep discovery/transformation separate from checker/editor APIs so a later
   language change can replace the producer. Use JavaScript/TypeScript now.
7. Keep runtime data imports, literal dynamic imports, and literal `require`
   calls in the source graph. Track their runtime inputs and watch them. Dynamic
   and type-only edges do not form a static import cycle.
8. Keep literal paths and methods in the generated manifest while making its
   value assignable to the public `FileRouteManifest` accepted by
   `installSprindle`.

## Scope

Allowed owners:

- `packages/sprindle/src/tooling/{manifest,language,route-files,index}.ts`
- `packages/sprindle/src/tooling/source.ts` and focused sibling modules if needed
- `packages/sprindle/src/routes/definition.ts`
- `packages/sprindle/src/tooling/{manifest,language,tooling}.spec.ts`
- `packages/sprindle/src/tooling/source.spec.ts` (new)
- `packages/sprindle/tooling/{package,package-state}.mjs` only for producer delivery
- `packages/sprindle/test/generator-performance.proof.mjs` (new baseline/report owner)
- `plans/unified-generator/` evidence; this plan and its index row

Do not change application callers, SDK export, Loom, business routes, database
code, runtime HTTP semantics, dependency versions, or editor installation.
Plans 088 and 089 own the caller switch and emitter removal. Existing optional
emission remains temporarily in this plan; add no compatibility flag or alias.
The final migration must remove it. Do not change pre-existing research files.

## Commands you will need

Run from the repo root with existing dependencies and Node 24 or newer.

| Purpose | Command | Expected result |
|---|---|---|
| Baseline tooling | `pnpm --filter @southneuhof/sprindle test:tooling` | All existing tests pass, or record the exact pre-existing failure |
| Baseline frontend | `pnpm --filter @southneuhof/framework-web type-check` | Current contract checks pass; record timing and memory |
| Core types and packaged tools | `pnpm --filter @southneuhof/sprindle type-check` | Exit 0 |
| Focused source and language tests | `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/source.spec.ts src/tooling/language.spec.ts` | Exit 0; real consumers and runtime requests pass |
| Tooling regressions | `pnpm --filter @southneuhof/sprindle test:tooling` | Exit 0 |
| Lint | `pnpm --filter @southneuhof/sprindle lint` | Exit 0 |
| API types | `pnpm --filter @southneuhof/api type-check` | Exit 0; current callers still work |
| Scope | `git diff --check` | Exit 0 |

The performance proof command is created in step 1. It must accept `--baseline`
and record its complete command, mode, host, compiler versions, route count,
raw samples, and memory. No database-dependent command belongs in this plan.

## Steps

### 1. Record the pre-migration baseline

Read `test-audit` before touching tests. Run the existing gates before edits.
Create `generator-performance.proof.mjs` with an isolated API-shaped fixture,
actual generator/runtime entrypoints, and an ordinary frontend TypeScript
language service. It must record pre-change runtime compile and HTTP update
cost with declarations disabled, persistent SDK completion cost, and full web
check cost. Keep fixture setup separate from measurement. Use at least five
cold starts and ten warm edits; report raw samples and medians/p95. Full web
checks may use three samples with incremental caching disabled. Store
`plans/unified-generator/baseline.json`. Do not build production seams just for
measurement. Commands can write standard ignored build artifacts during execution.

**Verify:** the command implemented as `node packages/sprindle/test/generator-performance.proof.mjs --baseline --output plans/unified-generator/baseline.json` exits 0; baseline uses the existing architecture and contains the named measurements. Existing tooling and frontend gates have recorded results before source changes.

### 2. Share scope binding metadata and define the source contract

Separate binding metadata and source transformation from language service state.
Use the same parent, parameter, entity, identity, and enrichment rules for the
editor overlay and physical source. Emit executable `.r.ts`/`.s.ts` helpers
using existing runtime functions specialized with the current generic types.
Put the manifest-to-contract generic in the public route type owner. Keep the
SDK's existing `path`, lowercase `method`, and `definition` shape.

Use Babel AST positions for import/export and type-import specifiers, not regex
replacement. Preserve authored source positions for overlay diagnostics. Resolve
project aliases and relative paths from the original module location. Preserve
the selected server suffix in rewritten direct paths. Leave ordinary external
type dependencies as source imports. Do not copy
all project files, tests, runtime service implementations, or dependencies.
Do not make a symlink or copied mirror of ordinary source to change consumer
resolution. Verify the current API and frontend graph with their actual
settings. A frontend suffix that selects a different ordinary module is a
resolution conflict that source inference cannot hide. Document this consumer
requirement; add no semantic declaration fallback.
Preserve required ambient/global typing without adding explanatory code comments.
Project reachable route-tree helpers and re-export files with the same lexical
scope rules as the editor. Keep ordinary source files live. Prove script
declarations, script globals, module globals, and relative module augmentation
in a consumer project that does not include the API source roots. Ambient
contributors that the authored runtime does not import must not gain runtime
execution through generation.

**Verify:** core type-check plus focused source/language tests pass. Positive
and negative consumers prove context replacement, inherited identity, typed
parameters, raw request inputs versus parsed values, and enriched output.

### 3. Compile and publish one complete source graph

Make `compileRouteManifest` use the physical typed source as its input in both
modes. Reuse one esbuild analysis per build. Publish generated source only after
syntax, cycle, and runtime build gates succeed. Serialize generation for a
project across processes and reread source after acquiring ownership. Check
source identity before publication so a job cannot restore an older source.
Use immutable complete versions and atomic canonical pointer updates. A failed
build must preserve the last usable source entry and runtime output. Do not
write semantic errors into an empty or unknown contract.

Map generated inputs back to original author files for hashes and watcher input
ownership. Ignore generated directories. Preserve narrow external directory
watching, atomic source replacement, error recovery, and awaited close behavior.
Keep authored source locations in bundled runtime maps and diagnostics. Check
both line and column after an AST import edit changes the specifier length.
Compare runtime analysis inputs with the authored graph, including symlinked
paths. Do not parse JSON data as TypeScript. Keep dynamic imports out of static
cycle checks, but track their runtime files and watcher changes. Reclaim a stale
generation lock only after a claim for the recorded owner succeeds. Remove a
new lock directory when its owner record cannot be written. Keep public
framework declaration preparation separate from source generation.

**Verify:** tooling suite and core types pass. Test concurrent generators,
active readers, failed-build preservation, unchanged pointer writes, original
module singleton identity, both runtime modes, and installed package execution.

### 4. Review the foundation

Run remaining command gates. Record implementation choices, test results,
benchmark baseline, and differences from the stated design in this plan.
The parent reviews source and evidence before Plan 088 can start.

**Verify:** lint, API types, tooling tests, and `git diff --check` pass. Only
allowed owners changed. Mark IMPLEMENTED until parent review accepts DONE.

## Test plan

`source.spec.ts` owns generated-source inference and runtime parity. Use real
TypeScript 6 from `apps/web`, TypeScript 7 for the framework, real Hono requests,
and separate invalid consumer files. No new code comments or expect-error
comments. Cover external type-only edits with no generation, source imports
inside and outside the route tree, aliases, suffixes, enriched CRUD, methods,
and stable ordinary module identity. The external consumer must pass the
generated manifest to `installSprindle` without casts. The manifest and watch
tests own JSON, dynamic import, `require`, recovery after a failed external edit,
stale lock contention, owner-write cleanup, publication, and installed Node
execution. Prove runtime reloads with HTTP responses. Extend those owners rather
than repeat every case at every layer. No predicate-only, source-template, or
mocked-compiler proof is sufficient.

## Done criteria

- [x] Baseline is recorded before production source edits.
- [x] All source/language, tooling, type, and lint gates pass.
- [x] Executable output uses the generated source graph in both modes.
- [x] Real consumer checks reject wrong inputs and outputs.
- [x] Type-only dependency changes are visible without a generated type snapshot.
- [x] Ordinary runtime module identity is preserved.
- [x] Concurrency, failure preservation, readers, and source maps are proved.
- [x] Installed tools generate usable source using normal Node.
- [x] Scope review and parent acceptance are recorded.

## STOP conditions

Report to the parent if a public wire type changes, a dependency upgrade is
required, runtime singleton identity cannot be preserved, or a supported alias,
ambient type, or scope contract cannot be expressed as ordinary source. Do not
restore a separate semantic type emitter as the new design. After two failed
repairs to one issue, diagnose and report it. Drift caused by unrelated work
requires reconciliation; preserve it. Do not commit, push, or change branches.

## Maintenance notes

The generated source is a build contract, not a new authoring API. Keep parser,
resolution, scope, and runtime behavior aligned. Future native implementation
must preserve this artifact contract, not TypeScript language service internals.
Plan 086's independent type worker is superseded by this migration. Framework
package declarations remain normal package delivery; standalone published SDK
packaging and source-tree pruning are deferred.

Parent architecture review found that ordinary source cannot carry a separate
set of compiler resolution rules. TypeScript 6 applies `moduleSuffixes` even to
explicit `.ts` specifiers. File symlinks break relative imports and module
identity; a package alias still leaves nested imports under consumer settings.
The chosen contract keeps original live imports and requires consistent
resolution. Carta currently has no `.server.ts` or `.web.ts` source files. The
actual consumer checks in 088 must confirm the current graph. This requirement
replaces the proposed guarantee of arbitrary API/frontend suffix isolation.

Implementation evidence: `plans/unified-generator/087-implementation.md`.

Parent acceptance: APPROVE, 2026-10-05. Reviewed the implementation, source
consumer proof, runtime dependency tests, lock recovery, and publication.
Independent temporary consumers confirmed the helper, ambient, and installer
repairs. The parent reran source and language tests after the final repair:
2 files, 12 tests passed. Framework type checking also passed during review.
The implementation report records the final 66 tooling tests, framework
types/lint, API types, and diff check. Ordinary symlink aliases were rejected
and removed after real nested-import failures. Acceptance includes the stated
resolution requirement; full Vue integration and performance remain 088/089.

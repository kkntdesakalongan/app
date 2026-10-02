# Plan 080: Enforce physical schema imports in normal web tooling

> Execute with GPT-6 Luna, maximum reasoning effort, after Plans 078 and 079
> are DONE. Read every section. Implement and review the actual import seam,
> run all required checks, and record evidence. The root reviewer owns DONE.

## Status

- Priority: P1
- Effort: L
- Risk: MED
- Depends on: `078-make-entity-declarations-portable.md`,
  `079-colocate-backend-module-schemas.md`
- Category: migration
- Planned at: `8046201`, 2026-10-01

## Why this matters

The web app has broad Vite and TypeScript aliases for all API source. An agent
can therefore import a backend operation to reuse its schema, pulling database
or auth code into the browser. Package exports will now expose only physical
schema entry paths to value consumers. Normal web dev/build must reject both
direct backend runtime imports and runtime reached through a schema dependency.

## Intent and architectural decisions

Schemas remain beside tables, entities, operations, routes, and scopes in the
backend module directory. The web import must show the real source path:

```ts
import { userSelectSchema } from '@southneuhof/api/src/routes/(authenticated)/users/schema.ts'
```

The API package identity export maps that path to exactly itself. It does not
map `api/schemas/users` to a hidden route directory. There is no alias, shared
contract package, schema mirror, compiler, codegen, generated registry, or
source-writing tool. Drizzle table metadata plus Zod are acceptable in browser
bundles. Do not redesign entities, database bindings, Loom, or the SDK.

The boundary belongs to ordinary package resolution and the actual browser
bundler graph. Skills describe its use. A special command or shallow filename
scan does not replace enforcement. A small Vite plugin is acceptable when the
existing resolver cannot express the transitive invariant. Use Vite's real
resolved edges; do not implement a second resolver or general-purpose compiler.

## Current state

- `apps/web/vite.config.ts:56–62` rewrites both API root and every API subpath
  directly into `../api/src`. Other SDK/Loom aliases are outside this scope.
- `apps/web/tsconfig.app.json` and `tsconfig.base.json` expose the same broad
  API paths. `apps/api/tsconfig.json` may have another API self alias; inspect
  it before deciding whether a literal physical import would be rewritten.
- Vite includes Drizzle dependencies under the API package in `optimizeDeps`.
  This must not hide prohibited imports from enforcement.
- Shared assets use `@southneuhof/api/schema` in framework adapters and tests.
- Plan 079 gives users/roles/permissions colocated schema entries and identity
  package exports. It migrates their imports but deliberately leaves alias
  removal to this plan. Reconcile these expected changes before implementation.
- `packages/sdk/src/client.ts` imports `RouteContract` with `import type` from
  the existing `@southneuhof/api/routes-contract` export. Preserve this supported
  erased type path; it is not a browser value dependency.
- `apps/web/src/framework/__tests__/entity-schema-import.spec.ts` has shallow
  direct builtin/model scans. They cannot detect an indirect workflow import.

## Scope

Allowed source files:

- `apps/web/vite.config.ts`, `tsconfig.app.json`, and `tsconfig.vitest.json` only
  if required for physical imports. Preserve existing strict Vue options.
- `tsconfig.base.json` and `apps/api/tsconfig.json`, only API path-resolution
  changes required for real package resolution.
- API package identity exports if a verified correction is required.
- New `apps/web/scripts/schema-boundary.mjs` (or `.ts`) and one executable
  bundler-boundary proof, preferably `scripts/web-schema-boundary.test.mjs`
  so the existing root `test:module-tooling` script discovers it.
- Shared asset adapters/test and real web schema importers under `apps/web/src`,
  for import-only changes. The existing entity/schema import test, narrowed to
  useful schema behavior and stripped of superseded static scans.
- Web package test script only if needed to include the focused proof in normal
  verification. The existing build and dev commands must enforce automatically.
- Existing package-resolution proof owners or workflow tests only if this
  migration changes their asserted public contract.
- This plan and its own index row.

Out of scope: UI pages/components, Loom, pagination, preview/env/ports, databases,
dependencies/lockfile, SQL/migrations, SDK implementation, new business modules,
old module scaffolding and removed UI checkers. Do not restore deleted tooling.

## Drift, authorization, and skills

Run `git diff --stat 8046201..HEAD -- apps/web apps/api/package.json tsconfig.base.json`.
Compare live excerpts with dependencies and the accepted dirty baseline under
`plans/schema-import-migration/`. Take a before snapshot for each edited file.
Preserve prior UI enforcement, asset behavior, and pagination work.
Stay on the current branch without commits, pushes, or external writes.

Read the pit-of-success skill, web-ui-surfaces, api-conventions for API config,
test-audit before tests, improve's execution reference, `DESIGN.md`, and the
current resource architecture. Test-audit's OpenClaw/Crabbox tools are unavailable;
use actual Carta commands and report that limit. This migration needs Node
bundler integration tests, not Playwright/browser journeys or visual changes.
Inspect installed Vite APIs before using them. If online reference is needed,
use current official Vite/Rolldown documentation only.

Verified Vite 8 constraints: `moduleParsed` is not called in dev; a build-only
hook cannot own both modes. The dependency optimizer uses Rolldown and accepts
`optimizeDeps.rolldownOptions.plugins`. Use the installed types and official
[plugin API](https://vite.dev/guide/api-plugin) and
[optimization options](https://vite.dev/config/dep-optimization-options).
Avoid the deprecated esbuild optimizer API and an untested prebundle bypass.

## Steps and verification

1. Search `rg -n '@southneuhof/api' apps packages tsconfig.base.json` and
   inspect Vite/TS config. Classify value imports versus `import type`.
   Completion: every web value import targets a schema entry after migration;
   existing supported route-contract type imports remain accounted for.
2. Remove API rewrite aliases from Vite and TypeScript. Keep unrelated aliases
   and module suffixes. Enable `.ts` import spelling with the appropriate
   no-emit TS setting where needed. Switch shared helper imports to
   `@southneuhof/api/src/schema.ts`. Verify actual package exports, not a new
   identity TS alias. Run API, web, and SDK type checks below.
3. Enforce the runtime boundary in normal Vite serve/build. Browser code may
   enter API source through exported module `schema.ts` or the existing shared
   `src/schema.ts`. Their API runtime dependencies may reach other schema
   entries and `*.table.ts` declarations, but not entity, operation, scope,
   route, database, auth, or storage runtime. Relative filesystem imports and
   re-exports cannot bypass this restriction. Resolve actual files, including
   aliases and normalized paths, and reject prohibited edges with an actionable
   import chain. Erased type imports do not count as runtime edges.
   Portable external dependencies remain usable, but schema-reachable Node
   builtins and database drivers must fail instead of being externalized or
   silently optimized. The declaration-only Sprindle `/entity` seam remains
   portable; runtime Sprindle model/source are not portable substitutes.
4. Address dev prebundling, cache reuse, and file updates deliberately. A graph
   edge removed by a reload must not leave a false denial; a new prohibited
   edge after startup must fail. Do not depend on traversal order or an
   importer map that fails when a shared module loads before its schema parent.
   A fail-closed API-file boundary plus real dependency traversal is preferred
   to a speculative generic policy engine. If a small implementation cannot
   prove both modes, report the precise obstacle to root before expanding it.
5. Write the real integration proof below, register it in the existing normal
   verification path, and replace the shallow scans. Verify build and focused
   app validation. Review all changes against before snapshots. Append complete
   evidence and deviations; mark IMPLEMENTED for root review.

## Test plan

Use real installed Vite build and dev server transform APIs with temporary
fixtures and cleanup. Import the production plugin/config owner, not a copied
checker. Dev proof need not start a browser. Keep mocks outside the resolver and
boundary under test. Assertions must verify the intended policy failure, not an
unrelated package resolution or syntax error.

Required independent cases (table-driven cases are fine):

- A real colocated table-derived schema builds and loads through its physical
  package export. Execute the resulting parser where practical to prove it is
  retained, not tree-shaken away. Real users/roles schemas should still validate.
- Direct backend entity/operation/db import is rejected, including a relative
  filesystem escape. A supported server package root is not a browser loophole.
- A schema import that re-exports or dynamically imports a backend operation
  is rejected with both schema and forbidden target in its diagnostic.
- A schema/table chain to a Node builtin or pg driver fails in dev and build,
  including dev dependency optimization. Use resolved dependency edges, not
  exact source text patterns. A disguised server dependency is still prohibited.
- Portable metadata and genuine erased type-only imports are accepted.
- A dev update from safe schema to prohibited import fails; removing that edge
  restores valid loading. Shared imports do not depend on transform order.

Do not add one test per regex or filename. Do not add fixtures that copy
implementation policy and then assert the same copy. Use temporary files for
bad dependencies; do not leave them in real application modules.

## Commands and done criteria

All required checks must pass or be reported with exact evidence:

- `node --test scripts/web-schema-boundary.test.mjs` (adjust only to the actual
  chosen proof file and record its exact command).
- `pnpm --filter @southneuhof/api type-check`
- `pnpm --filter @southneuhof/sdk type-check`
- `pnpm --filter @southneuhof/framework-web type-check`
- `pnpm --filter @southneuhof/framework-web build-only`
- `pnpm --filter @southneuhof/framework-web exec vitest run --environment jsdom --root src/ framework/__tests__/entity-schema-import.spec.ts framework/adapters/assets.form.spec.ts`
- Web `lint:focused --` for changed web files, root test-file syntax/lint using
  the actual installed owner, and `git diff --check`.
- `rg -n '@southneuhof/api/(routes/|schema[\x27\x22])' apps/web/src` returns
  no obsolete browser imports. Configuration has no broad API source aliases.
- Package schema export keys and targets are identical physical paths.
- Ordinary `dev` and `build-only` use enforcement without a separate command.
- No new comments, aliases, mirrors, wrappers, generated code, or unrelated edits.

Do not run root aggregate tests; they include database writes and browser work.
Build outputs stay in standard ignored folders. Do not print env contents.

## STOP conditions

Report to root if a supported real schema needs backend execution, if normal
Vite resolution/prebundling cannot enforce the agreed invariant without a new
compiler or dependency, or if a check shows an unrelated baseline failure.
Do not weaken a negative test, add a browser polyfill for server code, or make
the boundary an optional agent command. State the bounded alternative.

## Maintenance

New backend modules get an identity schema export through the existing pattern.
They need no registry update. Keep the boundary proof tied to actual bundler
resolution when Vite changes. Pure value helpers can be schema owners; backend
execution belongs behind the schema boundary, in the same module folder.

## Execution record

Root review scope clarification: `worker.plugins` in the existing Vite config
and focused worker-bundle checks are part of normal web build enforcement.
Optimizer metadata may contain chunks without a `src` path; the portability
proof must also load real optimized schema dependencies in dev. These are
bounded corrections within the existing plugin/config/test owners.

Status: IMPLEMENTED. Root review owns DONE.

The web Vite config now resolves API imports through package exports. It no
longer rewrites the API package root or subpaths. TypeScript no longer maps API
paths to `apps/api/src`; `.ts` imports use `allowImportingTsExtensions` with
`noEmit`. Shared asset imports use `@southneuhof/api/src/schema.ts`. The API
package already had identity exports for route schemas and `src/schema.ts`, so
this plan did not edit its exports. SDK `RouteContract` remains a type-only
import.

`schemaBoundaryPlugin` is installed in normal Vite serve/build and in the
Rolldown dependency optimizer. It resolves imports with Vite, enforces API file
rules on each resolved edge, and reports an import chain. The dev graph tracks
reverse edges. For external server dependencies, it uses known schema ancestry
or checks descendants only when an existing dependency graph is attached to a
schema. A schema file with no known child edges does not start a graph walk.
The production build keeps one complete resolved-graph check. Hot updates remove
outgoing edges before Vite resolves the changed file again. The plugin accepts
the Sprindle `entity` source and rejects its `model` and other runtime source.
It blocks Node builtins, database drivers, and the API's known auth, storage,
cloud, and server packages. Drizzle metadata and Zod remain allowed.
This rule applies only to schema-reachable imports. The web build still bundles
its unrelated Hono client dependency.

The proof uses the installed Vite build and dev APIs and the production
boundary plugin. It passes real users and roles schemas through package
exports, retains them in a built bundle, and executes their parsers. It also
checks type-only erasure, physical import paths, direct API runtime imports,
schema re-exports, dynamic imports, table/runtime chains, Node builtins,
PostgreSQL through both a schema and a table, Sprindle imports, an optimized
shared module, and safe-to-unsafe-to-safe dev updates. A config test loads the
real web Vite config and checks that the same plugin instance serves normal
imports and dependency optimization. The old entity test keeps its four schema
behavior tests and no longer scans filenames or import text.

Checks passed:

- `node --test scripts/web-schema-boundary.test.mjs` — 12 passed.
- `pnpm run test:module-tooling` — 67 passed; two Python unit tests passed.
- `pnpm --filter @southneuhof/api type-check` — passed.
- `pnpm --filter @southneuhof/sdk type-check` — passed.
- `pnpm --filter @southneuhof/framework-web type-check` — passed.
- `pnpm --filter @southneuhof/framework-web build-only` — passed; Vite built
  1,588 modules in 4.21 seconds.
- `pnpm --filter @southneuhof/framework-web exec vitest run --environment jsdom --root src/ framework/__tests__/entity-schema-import.spec.ts framework/adapters/assets.form.spec.ts`
  — 11 passed.
- `pnpm --filter @southneuhof/framework-web lint:focused -- vite.config.ts scripts/schema-boundary.mjs src/framework/adapters/assets.ts src/framework/adapters/fileManager.ts src/framework/adapters/storage.ts src/framework/adapters/assets.form.spec.ts src/framework/__tests__/entity-schema-import.spec.ts`
  — passed.
- From `apps/web`, `node_modules/.bin/oxlint --quiet /Users/gamer/Documents/projects/carta/scripts/web-schema-boundary.test.mjs`
  — passed. Both changed JavaScript files passed `node --check`.
- `git diff --check` — passed. Searches found no old web API imports or
  broad API aliases. The schema export keys both map to themselves.

The first full app build stalled at `transforming...` for seven minutes because
the plugin walked the complete graph on every resolved import. That run was
stopped. The dev check now uses resolved-edge admissibility and reverse
ancestry, and it walks only known schema descendants. The final build and the
load-order, optimizer, and hot-update proofs pass. The final build printed the
existing large-chunk advisory; it did not fail. An intermediate build printed
a plugin timing advisory before the final ancestry check. The final build no
longer printed it. An initial lint run found formatting issues, which were
fixed. Pnpm also rejected a relative `..` path for the root test lint command;
direct Oxlint with the absolute test path passed.

The before snapshot matches, except for the planned API path changes in
`apps/web/tsconfig.app.json`. Its UI type-check settings and test inclusion
remain intact. In the baseline manifest, 42 entries match their recorded
state. Two role route files differ because completed Plan 079 changed their
table references; this plan did not edit them. The remaining difference is
the planned `apps/web/tsconfig.app.json` change. No package was added. No
database or browser journey was used. No preview port or environment file was
edited, and no environment values were printed.

OpenClaw, Crabbox, and autoreview were not available in this environment, as
the test-audit instructions stated. The Carta checks above were run instead.

Root review: APPROVE — 2026-10-02. Root reproduced three gaps with real Vite
tests before correcting them: optimized chunks without `src` caused an error;
worker builds omitted enforcement; and a newly loaded external helper could
attach a previously loaded server dependency without a dev rejection. The
plugin now handles optional chunk metadata, normal worker builds get fresh
plugin instances, and the dev check inspects a shared subtree when an existing
schema ancestor attaches it. Build keeps its final graph check; incremental
ancestry work stays in dev. Portable Sprindle validation and its pure error
dependency remain supported alongside entity declarations. Fixture optimizer
caches are isolated under their temporary roots.

Root re-ran all 15 graph tests, 70 module-tooling tests plus two Python tests,
API/SDK/web types, 11 focused app tests, focused lint, syntax, and whitespace
checks. All pass. The final full app build passes in 5.95 seconds. It emits a
plugin timing advisory and the existing large-chunk advisory; neither is
suppressed. The API path aliases and obsolete web imports have no matches.
Source edits stay within the plugin/config/test/import owners listed here and
preserve the accepted UI and pagination work. No database or browser journey
was run. Plan 081 must describe this final source and these portable exports.

Final test cleanup: the optimized shared-module proof now waits for the real
dependency's optimization promise and checks committed optimized metadata.
This strengthens the prebundle proof and prevents a background optimizer from
recreating temporary cache directories after teardown. All 15 graph tests pass
again, and no temporary fixture directories remain in the working tree.

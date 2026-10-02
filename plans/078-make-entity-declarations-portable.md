# Plan 078: Make entity declarations portable

> Execute this plan in the current workspace. The user authorized implementation
> by a GPT-6 Luna agent with maximum reasoning effort. Read the entire plan,
> implement it, run its checks, review the resulting change, and record evidence.
> The root reviewer owns the final DONE status in `plans/README.md`.

## Status

- Priority: P1
- Effort: M
- Risk: MED
- Depends on: none
- Category: migration
- Planned at: `8046201`, 2026-10-01

## Why this matters

`@southneuhof/sprindle/entity` claims to provide a portable declaration API, but
its runtime re-export reaches database source construction. A browser import
can therefore reach backend execution even when its author chose the correct
public subpath. Move declaration ownership into that existing public seam.
This is a source separation, not a change to database binding or entity behavior.

## Intent and constraints

The complete migration keeps backend schemas and tables in their backend module
folders. Web consumers will import the physical `schema.ts` path through package
exports. There is no new contract package, compiler, generated schema, import
alias, or database binding design. The portable Drizzle table metadata footprint
is acceptable. The invariant belongs in package exports and normal web tooling;
skills will describe those owners rather than replace them.

This plan changes only the existing Sprindle declaration seam. Keep entity
identity, `Symbol.for('@southneuhof/sprindle/entity')`, inferred schema types,
read configuration, unbound-source failures, and subsequent source binding.
Existing root and model public exports remain supported. Re-export their
existing symbols from the declaration owner; do not add aliases or wrappers.

## Current state

- `packages/sprindle/src/entity/index.ts:9` exports `createEntity` and
  `isDomainEntity` from `../model/domain-schema`.
- `packages/sprindle/src/model/domain-schema.ts:4` imports
  `createDrizzleSource` at runtime. This file also owns declaration functions,
  relation metadata validation, and `bindDomainDatabase`.
- `packages/sprindle/src/model/index.ts:1` exports all five functions from
  `./domain-schema`.
- `packages/sprindle/src/model/__tests__/domain-schema.spec.ts` exercises schema
  inference and relations. `src/__tests__/module-bundles.spec.ts` exercises
  module composition. Both are existing patterns for meaningful behavior tests.

Current declaration shape:

```ts
return {
  [ENTITY_MARK]: true,
  name: getTableName(config.table as never),
  table: config.table,
  schemas: config.schemas,
  read: config.read,
  source: unboundSource(),
} as unknown as DomainEntity<TTable, TSchemas>
```

Current binding mutates `entity.source` to the result of `createDrizzleSource`
and calls `markSourceBound`. Preserve this contract exactly.

## Scope

Allowed source files:

- `packages/sprindle/src/entity/index.ts` and one declaration implementation
  file in that directory if needed.
- `packages/sprindle/src/model/domain-schema.ts` and `src/model/index.ts`.
- `packages/sprindle/src/hono/file-routes.ts`, only moving its existing
  `isDomainEntity` import from model runtime to the declaration owner.
- Existing direct importers of declaration types within Sprindle, only when
  the source move requires an import update.
- One focused portable-entry test under `packages/sprindle/src/entity/` or
  `src/model/__tests__/`, plus necessary changes to existing relevant tests.
- This plan and its own row in `plans/README.md`.

Keep all Loom, API, web, tooling, pagination, UI, and other plans unchanged.
Do not redesign `ModelSource`, relation handling, or binding. Do not change
dependencies, the lockfile, `.env`, databases, ports, or preview setup.

## Drift and work protection

Run `git diff --stat 8046201..HEAD -- packages/sprindle/src` and inspect live
excerpts before edits. Existing uncommitted work is intentional: compare
`plans/schema-import-migration/baseline.json` and `baseline.patch`, not only HEAD.
Preserve the list default of 10 and the absence of a page-size maximum.
Record a before snapshot of files you will edit so your review excludes prior
changes. Stay on the current branch. Do not commit, push, merge, reset, or clean.

## Skills and references

Use `/Users/gamer/.agents/skills/pit-of-success/SKILL.md` for the public seam.
Use `.agents/skills/test-audit/SKILL.md` before changing tests. Its OpenClaw,
Crabbox, and autoreview references are not installed Carta tooling: use the
actual commands below and report this limitation. Read
`.agents/skills/improve/references/closing-the-loop.md` for execution and review.

## Steps and verification

1. Search all declarations and callers with
   `rg -n 'createEntity|isDomainEntity|DomainEntity|unboundSource' packages/sprindle/src`.
   Identify type-only dependencies separately. Completion: one implementation
   owner and all existing public consumers are accounted for.
2. Move declaration functions, mark, needed declaration types, and the unbound
   placeholder into the entity owner. Use type-only imports for source/read
   types. Keep relation validation and real database source creation in the
   model runtime. Update existing exports to the same function objects.
   Verify with `pnpm --filter @southneuhof/sprindle type-check` (exit 0).
3. Prove the public entry can be bundled for `platform: 'browser'` with real
   installed esbuild and no externals hiding runtime dependencies. Use a small
   real table and schema, import the supported `/entity` entry, retain the
   declaration call in output, and inspect the bundler input graph for absence
   of source creation, Node builtins, Hono, and database drivers. This tests an
   actual architecture contract, not a copied list of exports. Also retain
   existing inference, unbound failure, and binding/relations proofs. Use one
   new focused proof unless an existing test already owns the assertion.
4. Run the focused tests and lint below. Review the complete change against
   your before snapshot, then append an execution record with results and any
   deviations. Mark the index row IMPLEMENTED for root review.

## Commands and done criteria

All must pass:

- `pnpm --filter @southneuhof/sprindle type-check`
- `pnpm --filter @southneuhof/sprindle exec vitest run src/model/__tests__/domain-schema.spec.ts src/__tests__/module-bundles.spec.ts --maxWorkers=1 --minWorkers=1`
- The exact focused Vitest command for the new portable-entry proof, recorded
  in the execution record.
- `pnpm --filter @southneuhof/sprindle lint`
- `git diff --check`
- Public portable entry proof does not externalize the offending dependencies;
  source review shows only erased type imports lead toward backend runtime.
- No duplicate declaration implementation, new public API, compatibility
  wrapper, source comment, or out-of-scope edit.

Build and type outputs may use standard ignored folders. Do not run aggregate
application tests; they include database mutation and browser work.

## STOP conditions

Report to the root agent if existing identity or binding semantics would need
to change, if the move needs an unlisted framework API change, or if a check
reveals an unrelated failure. Report the exact failure and proposed bounded
solution; do not silently weaken a check or broaden the migration.

## Maintenance

Runtime declaration imports must remain portable. Backend source types may be
imported with `import type`; real source construction belongs to model runtime.
The public bundle proof must fail if that runtime crosses the seam again.

Root scope clarification: the Hono file-route owner has one existing runtime
guard import from the old internal declaration location. Updating that import
is authorized and preserves behavior. It does not expand this into Hono work.

## Execution record

STATUS: COMPLETE

STEPS:

- Step 1 — searched declaration owners and callers. `entity/index.ts` now owns
  the declaration functions and types. The Hono route value import and Drizzle
  source type import now point to their new owners.
- Step 2 — `pnpm --filter @southneuhof/sprindle type-check` passed (exit 0).
- Step 3 — browser bundle proof passed (exit 0). It uses the public
  `@southneuhof/sprindle/entity` entry, real Drizzle and Zod declarations, no
  external imports, and checks the complete input graph.
- Step 4 — the existing domain-schema and module-bundle tests passed (exit 0).
  The focused portable-entry test passed (exit 0). Lint passed (exit 0), and
  `git diff --check` passed (exit 0).

FOCUSED BROWSER PROOF:

```sh
pnpm --filter @southneuhof/sprindle exec vitest run src/entity/__tests__/portable-entry.spec.ts --maxWorkers=1 --minWorkers=1
```

FILES CHANGED:

- `packages/sprindle/src/entity/index.ts`
- `packages/sprindle/src/entity/__tests__/portable-entry.spec.ts`
- `packages/sprindle/src/hono/file-routes.ts`
- `packages/sprindle/src/model/__tests__/domain-schema.spec.ts`
- `packages/sprindle/src/model/domain-schema.ts`
- `packages/sprindle/src/model/index.ts`
- `packages/sprindle/src/source/drizzle-source.ts`
- `plans/078-make-entity-declarations-portable.md`
- `plans/README.md`

NOTES:

- The lifecycle test keeps the global entity marker, unbound error, same
  declaration object, source replacement, and bound marker under test. The
  existing inference and relation tests remain in place. No earlier test called
  `bindDomainDatabase` or checked the unbound error, so this test covers that
  public lifecycle without a test-only seam.
- The portable-entry test found no backend source creation, Node builtins,
  Hono, database drivers, or external imports in the browser bundle graph. This
  proves bundling only; it does not prove browser execution or database access.
- The first type-check attempt found a local helper type still needed by
  relation validation. The helper now has a local structural type, and the
  final type-check passes.
- The first bundle proof assertion expected a single-line initializer. The
  bundle formats it across lines, so the assertion now allows whitespace and
  confirms the actual declaration call. The final focused proof passes.
- OpenClaw, Crabbox, and autoreview references in the test-audit skill are not
  available Carta tools. The package commands listed in this plan were used.
- All 40 baseline files outside the planned `plans/README.md` row retain their
  recorded hashes. The page-size default remains 10 with no maximum.

Root review: APPROVE. The root re-ran the 16 focused tests, package type check,
lint, and whitespace check. One review correction replaced bundle formatting
and exact declaration-file assertions with executing the browser-target bundle
in a VM without Node globals. Its actual parser accepts a valid ID and rejects
a missing ID; backend model/source graph exclusion remains checked. The revised
proof, type check, and lint pass. This is a bundler/runtime portability proof,
not a browser journey or database integration test. Caller updates are confined
to their declaration imports. The accepted dirty baseline is preserved.

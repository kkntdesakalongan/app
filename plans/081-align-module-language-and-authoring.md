# Plan 081: Align module language and authoring with the schema boundary

> Execute with GPT-6 Luna, maximum reasoning effort, after Plans 078–080 are
> DONE. Read the live implementation before writing guidance. Implement and
> review the documentation/skill change; record checks. Root owns final DONE.

## Status

- Priority: P2
- Effort: M
- Risk: LOW
- Depends on: `078-make-entity-declarations-portable.md`,
  `079-colocate-backend-module-schemas.md`, `080-enforce-physical-schema-imports.md`
- Category: docs
- Planned at: `8046201`, 2026-10-01

## Why this matters

Agents previously invented terms such as POS workflow for code that mixed
schemas and backend execution. Guidance that says to keep everything together
can also be read as one importable file. Record one small vocabulary and point
authoring skills at the implemented boundary, with a table-derived example.
Documentation supports the safe path; it does not replace tooling enforcement.

## Agreed meanings and intent

Use these meanings, preserving their distinction:

- Module: one application responsibility with its related implementation.
- Table: the storage definition and Drizzle metadata.
- Schema: an executable parser/converter for accepted values.
- Entity: Sprindle configuration that joins a table, schemas, and persistence
  behavior. It is not the web schema import boundary.
- Operation: one application read/write action such as `createSale` or `closeSale`.
- Route: the HTTP entry for an operation.
- Scope: inherited context, access policy, entity, and hooks.
- Workflow: a business process or sequence of operations, not a technical
  layer, file category, or universal `*.workflow.ts` convention.
- Contract: an agreement at a boundary; a schema describes its value part.
  It does not require a separate contract package or file category.

The backend owns schemas. Each module keeps `schema.ts`, its `*.table.ts`,
entity, operations when real sharing exists, and routes/scopes in the same
folder. Import paths show the physical file. Package identity exports and
normal Vite checks enforce the runtime boundary. Drizzle schema derivation is
supported; no handwritten schema mirror or codegen is required.

This is not an instruction to create every listed file for every feature.
Single-consumer operations can stay in routes. Existing module design approval
and verification scope remain intact. The user already approved this migration;
do not introduce another approval gate or external forward test.

## Current state

- There is no root `CONTEXT.md` or `CONTEXT-MAP.md` at planning time.
- `.agents/skills/api-conventions/references/standard-crud.md:5` says
  `Define the Drizzle table, write/select schemas, and createEntity together.`
  Clarify module colocation and each import owner, rather than scatter them.
- `docs/architecture/web-application-architecture.md:60–62` uses
  `user.schemas.*` as frontend input. Update examples to the implemented
  portable module schema values, preserving raw schema and form semantics.
- The module development/plan/web/verify skills route agents to existing
  layer owners and non-browser verification. Preserve that structure.
- `packages/sprindle/README.md:277` calls `/entity` browser-safe; Plan 078
  makes that claim true, but web value imports should use backend `schema.ts`.
- Plans 078–080 contain source evidence and final names. Read their execution
  records and live exports before documenting names or commands.

## Scope

Allowed files (edit only those that need this decision):

- Root `CONTEXT.md`, if it can hold Carta-specific meanings without becoming a
  generic programming glossary. Alternatively a short vocabulary section in
  one current architecture guide; pick one authoritative owner, not both.
- `docs/architecture/web-application-architecture.md` and
  `docs/resource_system_overhaul/ARCHITECTURE.md`, for current import ownership
  and relevant examples/links only.
- `.agents/skills/api-conventions/SKILL.md` and its `references/standard-crud.md`
  and `references/file-routing.md` only where current boundary wording conflicts.
- `.agents/skills/carta-module-development/SKILL.md` and its references
  `standard-module.md`, `execution.md`, `verification-strategy.md`.
- `.agents/skills/carta-module-plan/SKILL.md` and `references/plan-template.md`.
- `.agents/skills/web-ui-surfaces/SKILL.md` and `references/verification.md`.
- `.agents/skills/verify-carta-module/SKILL.md`.
- `packages/sprindle/README.md`, `apps/api/README.md`, and `apps/web/README.md`
  for minimal owner links if needed.
- This plan and its own index row.

Do not change source code, package scripts, test code, approved module behavior,
design/UI rules, resource APIs, pagination, preview setup, older completed plans,
or historical architecture archives. Do not rename valid business workflow
language. Do not create another handbook, scaffold, registry, checker, or skill.

## Drift and skills

Run `git diff --stat 8046201..HEAD -- .agents/skills docs packages/sprindle/README.md`.
Compare dependencies and the accepted dirty baseline in
`plans/schema-import-migration/`. Existing changes include UI checker removal
and current verification policy; preserve them. Record before snapshots.
Stay on the current branch. Do not commit, push, or publish.

Use `.agents/skills/skill-creator/SKILL.md`,
`.agents/skills/writing-for-agents/SKILL.md`, the pit-of-success skill, and
`.agents/skills/domain-modeling/SKILL.md` for language ownership. Read the
domain-modeling context format if creating a glossary. Its generic-term limit
means these entries must describe Carta roles, not general programming lessons.
Read `DESIGN.md` and the current resource architecture before editing web
guidance. Read improve's execution/review reference.

## Steps and verification

1. Read the final schema exports, entity seam, Vite enforcement, real import
   consumers, and their proof. Search current docs/skills with
   `rg -n 'entity.*schema|schemas\.|workflow|backend|@southneuhof/api' .agents/skills docs/architecture docs/resource_system_overhaul/ARCHITECTURE.md packages/sprindle/README.md`.
   Completion: every conflicting current passage in scope is accounted for;
   history and ordinary business workflow usage are excluded.
2. Choose one small authoritative vocabulary owner. Write the agreed meanings
   and cross-link it from the relevant skills. Keep implementation mechanics in
   one architecture owner, not repeated across all skill entry points.
   Verify links and read the resulting guide as an agent with no chat history.
3. Update current authoring examples to real named backend schema values and
   literal physical imports. Show one short table-derived shape in the module
   folder and its entity/route consumers, using live symbols. Explain why table
   foreign keys import tables. Show single-consumer versus shared operation
   placement without imposing a new service layer. Correct stale statements
   that forbid all backend source imports; portable exported schema entries are
   the supported exception, while route contracts stay type-only.
4. Point verification guidance to normal web dev/build and the actual focused
   graph proof. Explain its material limit: bundling proves dependency
   portability, not API authorization or rendered behavior. Keep non-browser
   module verification and existing design approval policy. Add no special
   preflight, approval step, copied command inventory, or browser requirement.
5. Validate edited skills and architecture. Review all edits against before
   snapshots for scope and duplicated meanings. Record evidence and mark
   IMPLEMENTED for root review.

## Commands and done criteria

- Run `/tmp/carta-schema-skill-validator/bin/python -B .agents/skills/skill-creator/scripts/quick_validate.py <skill-directory>`
  once for each edited skill. Every command exits 0. Do not initialize or
  regenerate UI metadata for existing skills.
  Root prepared this temporary Python environment with PyYAML because system
  Python lacks it. It does not change project dependencies. Use another
  existing PyYAML interpreter if the temporary environment is unavailable.
- `pnpm run test:surface-architecture` exits 0.
- `node --test scripts/web-validation-workflow.test.mjs` exits 0 if verification
  guidance is changed.
- `node --test scripts/web-schema-boundary.test.mjs` exits 0, using the actual
  filename from Plan 080. Do not alter source/tests to make prose checks pass.
- `git diff --check` exits 0.
- Current frontend example paths match identity exports and real files. Links
  resolve. No example recommends extracting schemas from backend operations
  or entities, separate domain packages, aliases, codegen, or a workflow layer.
- Each agreed meaning has one source. Relevant skills link to it. No duplicate
  handbook, mandatory operations file, restored retired tool, source comment,
  or unrelated rule change.
- Record the complete files edited and any checks not run.

## STOP conditions

Report to root if implemented source contradicts the accepted architecture,
if a required test fails because the dependency is incomplete, or if a current
guide outside scope contains a material conflict. Propose a bounded scope
update; do not silently broaden the rewrite or weaken the implementation.

## Maintenance

Vocabulary describes stable ownership. Config and real exports own exact
resolution. Skills route agents to those owners and add only the decisions
that cannot be inferred from code. Update examples when their real owners move.

## Execution record

STATUS: COMPLETE; ready for root review.

STEPS:

- Step 1 — Read the final 078–080 execution records, the live API schema,
  table, entity, web import, package export, Vite boundary, and graph proof.
  The in-scope search found the stale `user.schemas.*` example, mixed web and
  API schema ownership, the `+scope.ts` entity wording, and a blanket ban on
  backend source imports. Business workflow language describes business
  behavior and remains in place.
- Step 2 — Added one Carta vocabulary owner at `CONTEXT.md`. Linked the API,
  module, planning, web, and verification skills to it. Kept boundary mechanics
  in the web application architecture guide.
- Step 3 — Added the live users table/schema/entity/route example, the foreign
  key table-owner rule, and real single-consumer versus shared operation
  placement. Updated web examples to use API schema values and a physical
  package import. Corrected the current Loom authoring guide and Sprindle
  package export description.
- Step 4 — Linked web verification to normal Vite dev/build and the real
  schema graph proof. Kept module verification non-browser and stated the
  proof limit for authorization and rendered behavior.
- Step 5 — Validated each changed skill, the architecture checks, web
  validation workflow, schema graph proof, links, exports, and whitespace.
  Self-review follows this implementation record.

FILES CHANGED:

- `CONTEXT.md`
- `.agents/skills/api-conventions/SKILL.md`
- `.agents/skills/api-conventions/references/standard-crud.md`
- `.agents/skills/api-conventions/references/file-routing.md`
- `.agents/skills/carta-module-development/SKILL.md`
- `.agents/skills/carta-module-plan/SKILL.md`
- `.agents/skills/web-ui-surfaces/SKILL.md`
- `.agents/skills/web-ui-surfaces/references/verification.md`
- `.agents/skills/verify-carta-module/SKILL.md`
- `docs/architecture/web-application-architecture.md`
- `docs/resource_system_overhaul/ARCHITECTURE.md`
- `packages/sprindle/README.md`
- This plan and its row in `plans/README.md`.

CHECKS:

- `pnpm run test:surface-architecture` — passed (18 tests and architecture check).
- `node --test scripts/web-validation-workflow.test.mjs` — passed (2 tests).
- `node --test scripts/web-schema-boundary.test.mjs` — passed (15 tests).
- Skill quick validation — passed for `api-conventions`,
  `carta-module-development`, `carta-module-plan`, `web-ui-surfaces`, and
  `verify-carta-module`.
- Link and export check — passed for 21 local links, the boundary anchor, the
  physical users schema example, and both API identity exports.
- `git diff --stat 8046201..HEAD -- .agents/skills docs packages/sprindle/README.md`
  — no committed drift from the planned revision.
- `git diff --check` — passed.

SELF-REVIEW: APPROVE. The full change matches the allowed file list. The
before snapshots preserve the accepted UI and pagination edits. The baseline
manifest hashes match the pre-edit snapshots for all seven overlapping skill
and architecture files. No conflicting current authoring rule remains in
scope. Root review is pending.

NOTES:

- The accepted dirty baseline was snapshotted before edits at
  `/tmp/plan081-before/repo`; `CONTEXT.md` was absent in the snapshot.
- No source code, test code, script, dependency, or configuration changed. No
  database work, Vite dev session, or browser journey ran. This change does
  not reverify application behavior. Plan 080's root review remains the full
  web build and module verification evidence; the schema graph proof was
  rerun here.
- No deviations. Root owns the final review and `DONE` status.

Root review: APPROVE — 2026-10-02. Root read the complete change against the
worker's before snapshots. The change adds one glossary and current schema
ownership guidance without changing prior UI rules, approval policy, or module
verification scope. Real examples preserve the distinction between the entity
insert schema and the custom user create request. Five skill validators, the
18 architecture tests, two workflow tests, 15 real graph tests, link/export
checks, and whitespace check pass. Source portability and app type/build
evidence remain in Plan 080. No new browser or database claim is made.

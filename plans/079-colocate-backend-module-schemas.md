# Plan 079: Colocate backend module schemas

> Execute this plan with GPT-6 Luna, maximum reasoning effort, after Plan 078
> is DONE. Read all sections. Implement, test, review, and record results. The
> root reviewer owns the final DONE status in `plans/README.md`.

## Status

- Priority: P1
- Effort: M
- Risk: MED
- Depends on: `078-make-entity-declarations-portable.md`
- Category: migration
- Planned at: `8046201`, 2026-10-01

## Why this matters

The current users, roles, and permissions files combine table definitions,
schema derivation, and entity setup. Their foreign keys import other entity
files, so importing a schema can also import backend behavior. Keep each
module together while making its `schema.ts` the portable value boundary.
Database-derived validation remains supported without generated code.

## Agreed architecture

Backend ownership and physical location are essential. A module can have:

```text
apps/api/src/routes/(authenticated)/pos/sales/
  schema.ts
  sales.table.ts
  sales.entity.ts
  sales.operations.ts
  +scope.ts
  create/+server.ts
  close/[id]/+server.ts
```

This is an example, not a scaffold checklist. Implement only the real users,
roles, and permissions modules. A table defines storage metadata; a schema
parses accepted values; an entity pairs those declarations with persistence
configuration; an operation performs one application action; a route exposes
HTTP; a scope supplies inherited context and policy. Keep an operation in its
route when it has one real consumer. Use an operations file only for real
sharing. Workflow means a business process, not a code layer or file suffix.

Drizzle metadata and Zod may run in a browser. Database connections, execution,
auth, storage clients, and route runtime remain backend code. Derive schemas
from table values as today. There is no new shared package, schema compiler,
codegen, registry, or import alias. Preserve every request, response, database,
access, audit, transaction, default, and validation behavior.

## Current state

- `users/users.entity.ts` owns `users`, the status enum, `user`, and
  `userPublicSchema`. Its create/update omit lists differ: update omits email.
- `users/users.create.contract.ts` owns a different operation input:
  trimmed name/email, password length 8–200, and nonempty unique `roleIds`.
  It is used by the create route and web form. Preserve that distinction.
- `roles/roles.entity.ts` owns `roles`, `rolePermissions`, `roleAssignments`,
  `auditFields`, and `role`. Foreign keys import permissions/users entities.
- `permissions/permissions.entity.ts` owns `permissions` and `permission`,
  with an audit foreign key to users.
- `users/users.ts`, `roles/roles.ts`, and `permissions/permissions.ts` compose
  domain parts. `auth/auth.entity.ts` and other callers import the users table.
- Web schemas currently read `entity.schemas`; the old API path alias is
  removed in the next plan. Migrate these real callers now to new schemas.

Exemplar derivation to preserve:

```ts
createUpdateSchema(users).omit({
  id: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
}).extend({ statusCode: userStatusCodeSchema.optional() })
```

## Scope

Allowed source files:

- The three named API module directories: new `*.table.ts` and `schema.ts`,
  narrower existing entity files, and their real importers under `apps/api/src`
  and `apps/api/scripts` for import-only changes.
- Remove `users/users.create.contract.ts` after migrating every real caller.
- `apps/api/package.json`, adding only physical-path identity exports.
- Web `settings/{users,roles,permissions}/*.schema.ts` and
  `apps/web/src/framework/__tests__/entity-schema-import.spec.ts`.
- One focused schema test if necessary to preserve a real validation rule.
- This plan and its own index row.

Do not modify UI components, pages, Loom, SDK, route behavior, SQL/migrations,
database bindings, env files, dependencies, lockfile, or pagination behavior.
Existing `apps/api/src/schema.ts` stays the shared helper owner; do not create
a second shared-schema layer. Import-only edits must preserve existing dirty
pagination changes in role routes/tests.

## Drift and work protection

Compare live files against excerpts and Plan 078's result. Run
`git diff --stat 8046201..HEAD -- apps/api apps/web/src` and read
`plans/schema-import-migration/baseline.json` and `baseline.patch`.
HEAD does not contain the current accepted UI/pagination work. Record before
snapshots for your edited files. Preserve unrelated hunks. No commits or
external writes. A completed dependency is expected drift, not a reason to
discard it or ask the user to approve again.

## Skills and references

Use `.agents/skills/api-conventions/SKILL.md` and
`.agents/skills/web-ui-surfaces/SKILL.md` for the affected layers. Read
`DESIGN.md` and `docs/resource_system_overhaul/ARCHITECTURE.md`; UI and resource
contracts stay unchanged. Use the pit-of-success skill for ownership and
test-audit for any changed tests. Old guidance to define everything together
means module colocation under this user-approved architecture, not one file.
Read the improve execution/review reference. The root agent will align stale
skill wording in Plan 081; do not change skills in this plan.

## Steps and verification

1. Run `rg -n 'users\.entity|roles\.entity|permissions\.entity|users\.create\.contract' apps/api apps/web/src`.
   Account for every imported symbol, distinguishing table, entity, and schema.
   Completion: all live callers identified, including test/seed imports.
2. Move unchanged table definitions into `users.table.ts`, `roles.table.ts`,
   and `permissions.table.ts`. Update table consumers in the same step so
   compilation stays valid. Foreign keys import table owners. Put enum and
   table type dependencies where they produce no runtime schema/table cycle;
   a type-only import is allowed. Do not duplicate enum meaning. Verify
   `pnpm --filter @southneuhof/api type-check` (exit 0).
3. Add module `schema.ts` files with named create/update/select schemas. Move
   `createUserSchema` and `CreateUserInput` into users `schema.ts` unchanged.
   Preserve user public schema meaning, omission behavior, defaults, status
   values, and refinements. Entity files import table and schema values and
   construct entities. Update all API callers to each symbol's owner. Remove
   moved exports and the replaced contract file; add no forwarding files.
   Verify API type-check and focused lint again.
4. Add package exports that retain the physical path:

   ```json
   "./src/routes/*/schema.ts": "./src/routes/*/schema.ts",
   "./src/schema.ts": "./src/schema.ts"
   ```

   Preserve existing server and type-only route-contract exports. Update the
   three web schema owners and the existing schema test to imports such as
   `@southneuhof/api/src/routes/(authenticated)/users/schema.ts`. Until the next
   plan removes the broad alias, verify these via API checks and real package
   resolution, not the old Vite alias. Do not introduce a temporary alias.
5. Adapt the useful existing schema tests to values, not entity presence.
   Remove the two shallow direct-import scans only when the next plan's real
   graph test replaces their responsibility; record their pending replacement.
   Record validation evidence, scope review, and unrun database checks. Mark
   IMPLEMENTED for the root reviewer.

## Test plan and done criteria

- `pnpm --filter @southneuhof/api type-check` exits 0.
- `pnpm --filter @southneuhof/api lint` exits 0.
- A focused test uses the actual new schema entry to accept/reject meaningful
  role and user inputs, including duplicate roles and an invalid status. Run
  plain Vitest or tsx with no DB setup and record the exact command. Do not
  call the API `test` or `test:focused` scripts: they migrate a database.
- `rg -n 'users\.create\.contract' apps/api apps/web/src` returns no matches.
- No runtime schema/table import reaches entity, db, auth, source construction,
  or a backend operation. Table foreign keys use table imports.
- No database column, constraint, default, operation schema, or endpoint policy
  changed. Review moved definitions directly; do not generate migrations.
- `git diff --check` exits 0. Only listed owners/importers changed. No new code
  comments, schema copies, aliases, wrappers, or speculative operation files.

The web aliases still need Plan 080, so a web check blocked by the old alias
is an expected intermediate limitation. State it; do not weaken configuration
or create a compatibility export to hide it.

## STOP conditions

Report to root if behavior must change to split declarations, if a schema
requires database execution at module import, or if a failed check points
outside the bounded migration. Do not run database mutation to resolve a
source-only migration check. Report exact evidence and a bounded proposal.

## Maintenance

Future table-derived schemas belong in the backend module's `schema.ts`.
Consumers import schema values rather than extracting them from an entity.
Foreign keys must not pull persistence configuration into table metadata.

## Execution record

- **STATUS:** COMPLETE. Implementation is ready for root review.
- **STEPS:** Step 1 inventoried API, script, and web callers. Step 2 moved the three table groups and changed table consumers. Step 3 moved table-derived schemas and the user create-operation schema, then changed API callers. Step 4 added identity package exports and full physical web schema imports. Step 5 added value checks to the existing schema test and kept the two source scans for Plan 080.
- **FILES CHANGED:**
  - API package and importers: `apps/api/package.json`, `apps/api/scripts/seed-shared.ts`, `apps/api/src/authorization.ts`, `apps/api/src/testing/session.ts`, `apps/api/src/routes/auth/auth.entity.ts`, `apps/api/src/routes/auth/auth.ts`, `apps/api/src/routes/auth/auth.routes.spec.ts`.
  - Users module: `apps/api/src/routes/(authenticated)/users/users.table.ts`, `schema.ts`, `users.entity.ts`, `users.ts`, `users.create.contract.ts` (removed), `users.routes.spec.ts`, `users.compensation.spec.ts`, `+scope.ts`, `list/+server.ts`, `create/+server.ts`, `update/[id]/+server.ts`, `[userId]/role-assignments/role-assignments.ts`, `[userId]/role-assignments/+server.ts`, `[userId]/role-assignments/[roleId]/+server.ts`.
  - Roles module: `apps/api/src/routes/(authenticated)/roles/roles.table.ts`, `schema.ts`, `roles.entity.ts`, `roles.ts`, `delete/[id]/+server.ts`, `[roleId]/permissions/+server.ts`, `[roleId]/permissions/[permissionId]/+server.ts`, `role-mapping.routes.spec.ts`.
  - Permissions module: `apps/api/src/routes/(authenticated)/permissions/permissions.table.ts`, `schema.ts`, `permissions.entity.ts`, `permissions.ts`.
  - Web schema owners and test: `apps/web/src/routes/(authenticated)/settings/users/users.schema.ts`, `roles/roles.schema.ts`, `permissions/permissions.schema.ts`, `apps/web/src/framework/__tests__/entity-schema-import.spec.ts`.
  - Plan record: this file and the Plan 079 row in `plans/README.md`.
- **CHECKS:** `git diff --stat 8046201..HEAD -- apps/api apps/web/src` exited 0 with no output because HEAD is the planned commit. The before snapshots for the dirty role permission route and test match `baseline.json`. `pnpm --filter @southneuhof/api type-check` passed. `pnpm --filter @southneuhof/api lint` passed. `pnpm --filter @southneuhof/api exec vitest run --root ../web/src --config ../../api/vitest.config.ts framework/__tests__/entity-schema-import.spec.ts` passed all 6 tests. The API Vitest config has no database setup; this command did not run a database script. The Node package resolution command below passed. `rg -n 'users\.create\.contract' apps/api apps/web/src` and `rg -n '\.schemas\.(create|update|select)' apps/api apps/web/src` returned no matches (exit 1, as expected). `git diff --check` passed.
- **PACKAGE RESOLUTION COMMAND:** `pnpm --filter @southneuhof/api exec node --import tsx --input-type=module -e 'await Promise.all([import("@southneuhof/api/src/routes/(authenticated)/permissions/schema.ts"), import("@southneuhof/api/src/routes/(authenticated)/roles/schema.ts"), import("@southneuhof/api/src/routes/(authenticated)/users/schema.ts"), import("@southneuhof/api/src/schema.ts")]);'` exited 0.
- **VITEST ATTEMPTS:** The first command, `pnpm --filter @southneuhof/api exec vitest run --config vitest.config.ts ../web/src/framework/__tests__/entity-schema-import.spec.ts`, found no files because Vitest used the API root. The next command used a config path relative to the wrong root and failed to load the config. The final command above set the web source root and API config and passed.
- **BEHAVIOR REVIEW:** The moved `users`, `roles`, `role_permissions`, `role_assignments`, and `permissions` table declarations match their before snapshots. The three table-derived schema definitions keep their old omit lists. The user create-operation schema body and `CreateUserInput` type moved unchanged. API route behavior and access rules did not change. Foreign keys now import table owners. `userSelectSchema` replaces the old public select schema at the user scope.
- **TEST REVIEW:** The test now checks valid user and role inputs, a missing role code, normalized user creation input, duplicate role IDs, and an invalid user status. The old entity-property checks did not test schema behavior, so they were removed. The two direct source scans stay until Plan 080 adds the graph proof.
- **SCOPE REVIEW:** Changes stay within Plan 079. The accepted role pagination default of 10 and no maximum remain unchanged. No SQL, migration, database binding, dependency, lockfile, UI, Loom, or SDK file changed for this plan.
- **UNRUN CHECKS:** API `test` and `test:focused` were not run because they migrate a database. The web type check, build, and Vite test path were not run because current broad API aliases still rewrite the new `@southneuhof/api/src/...` imports. Plan 080 owns alias removal and browser graph proof. The Node package check and the focused Vitest run verified package exports without those aliases; they do not prove browser bundle behavior.
- **SNAPSHOTS:** Before copies of 35 existing files and an absent-file manifest for the six new module files are under `/tmp/plan079-before/`. The dirty role route and test hashes match `plans/schema-import-migration/baseline.json`.
- **DEVIATIONS:** None. Root owns the final DONE review.

Root review: APPROVE. API type check and lint, all six focused schema tests,
physical package imports, and whitespace check pass on root re-run. The new
schema owners preserve validation and the users table uses an erased status
type import, so there is no runtime schema/table cycle. API route changes use
the same parser values from their new owner. Table foreign keys import tables.
No migration or database operation was run. The two shallow entity scans remain
until Plan 080 replaces them with real graph proof. Normal web checks remain
pending Plan 080's alias removal as declared in this plan.

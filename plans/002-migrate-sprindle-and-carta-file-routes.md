# Plan 002: Migrate Sprindle and Carta to file routes

## Status

- Priority: P1
- Effort: L
- Risk: HIGH
- Category: migration
- Planned at: `00763ed`, 2026-09-08
- Depends on: Plan 001, including its editor-host gate
- Status: DONE

Work only in this checkout. Do not inspect other branches or worktrees.
Do not commit, push, publish, or deploy. Start with `git status --short` and
re-read the cited code. Preserve unrelated work. Plan 001 will add tooling;
verify its recorded contracts and tests before this coordinated cutover.

## Required result

Every HTTP route is defined by a `+server.ts` file and a named method export.
Parent `+scope.ts` files supply shared request behavior. `(group)` directories
do not add URL segments; `[name]` directories supply parameters. Developers
can add, move, and delete routes without knowing that generation exists.

Use `import { list, detail, defineRoute, defineScope } from
'@southneuhof/sprindle'` as applicable. `defineRoute` has no path or method.
Resource constructors take their entity from the nearest entity scope.
`detail({})` reads `id`; `detail({ param: 'userId' })` binds another declared
parameter. Preserve current URL, status, validation, and response contracts.

This plan changes the framework and all affected callers together. Remove
the old route-registration interface when the callers are migrated. Do not
ship a compatibility wrapper or a second public registration system.

## Current state

- `apps/api/src/routes/index.ts` exports a manual `modules` tuple with
  `defineModule({ domain, models })` entries.
- `apps/api/src/app.ts:32` passes
  `[...modules, openapiRoute(modules, ...)]` to `installSprindle`.
  Lines 34–37 install identity, logging, audit values, and asset response work.
- `apps/api/src/db.ts:13` has
  `return modules.flatMap((module) => ('domain' in module && module.domain ? [module.domain] : []))`.
  Database schema ownership is coupled to HTTP registration.
- `packages/sprindle/src/model/define-model.ts` binds an entity and compiles
  an object route tree. `model/route-tree.ts` joins object keys with route paths.
- `packages/sprindle/src/routes/detail.ts` supplies `path: '/:id'`.
  The file path must become the complete path, with no repeated suffix.
- `packages/sprindle/src/routes/pipeline.ts` owns operation stages and error
  responses. `hono/index.ts` currently composes install, bundle, and model hooks.
- `packages/sprindle/src/openapi/index.ts:42` walks installable models.
  `model/route-schema.ts:36` builds Hono schemas from route and entity types.
- `packages/sdk/src/client.ts:5` imports `modules` and derives separate model
  and bare-route clients. It must consume the new route contract.
- The old application-authoring commands used route index text that conflicts
  with this file-route contract. This plan migrated the framework and callers.

Use current `users/users.model.ts` and `roles/roles.ts` for behavior evidence,
not as final layout templates. User updates invalidate sessions inside a
transaction. User creation has compensation checks. Preserve both behaviors.
Use the API conventions skill for app work and the web surfaces skill only
if consumer changes require web UI changes. Loom internals remain out of scope.

## Scope

In scope:

- `packages/sprindle/src/`, framework tests, package exports, and reference docs.
- `apps/api/src/`, `apps/api/scripts/dev.ts`, package/TypeScript/test config,
  and tests. Existing migrations may be read but not changed.
- `packages/sdk/` and direct web API consumers/types under `apps/web/src/`.
  No UI redesign or URL change.
- Root task config and backend/TypeScript CI paths, `.gitignore`, and project
  editor configuration needed to activate the completed language support.
- API runbooks, architecture docs, and `.agents/skills/api-conventions/` plus
  direct module-tooling skill references that still require manual registration.
  Use the writing-for-agents skill when changing these instruction files.

Out of scope: other branches/worktrees, Loom internals, new business features,
database resets, schema changes, applied migration edits, external publication.

## Verification commands

```sh
pnpm --filter @southneuhof/sprindle type-check
pnpm --filter @southneuhof/sprindle lint
pnpm --filter @southneuhof/sprindle test
pnpm --filter @southneuhof/api type-check
pnpm --filter @southneuhof/api lint
pnpm --filter @southneuhof/api test
pnpm --filter @southneuhof/sdk type-check
pnpm --filter @southneuhof/sdk test
pnpm --filter @southneuhof/framework-web type-check
pnpm --filter @southneuhof/framework-web test
pnpm test:module-tooling
pnpm build
```

Sprindle, API, and SDK type-check passed during planning. Other commands above
were read from package files, but not run during planning. API tests apply
migrations to the test target. First run this read-only target check:

```sh
cd apps/api
node --env-file-if-exists=.env --env-file=.env.test scripts/test-target.mjs
```

It must report VALID for an isolated test database. If it fails, stop database
tests and report the exact configuration issue. Do not reset development data.
Return to the repo root for the verification commands above.

## Steps

### 1. Record the current HTTP contract

Add `apps/api/src/__tests__/route-contract.spec.ts`. Capture method/path pairs
and access behavior for the current app before edits. Include public health,
three explicit auth endpoints, `/me`, files, users, roles, permissions, role
assignments, role permissions, and `/openapi.json`. Record the OpenAPI route's
current public status; do not move it under authentication without a separate
requirement. Use the current OpenAPI output as evidence, with HTTP checks for
contracts that OpenAPI does not prove. Do not include session tokens in output.

Verify with the test-aware focused command:
`pnpm --filter @southneuhof/api test:focused -- src/__tests__/route-contract.spec.ts`.
It must pass before and after the migration, without editing its expected URLs.

### 2. Replace route ownership in Sprindle

Use Plan 001's directory model and shared definition types. Add the runtime
scope executor and manifest installer. Bind fresh request context per request;
do not mutate installed model objects. The method export and file path own
HTTP dispatch. Resource operations retain input parsing, response envelopes,
status codes, record conversion, and their narrow custom `run` behavior.

Separate shared app dependencies, request context, and parsed operation state.
Resolve identity once per request. For each scope: create its context, run its
access checks, then enter the child. A parent rejection prevents child context
work. A child cannot remove parent access checks. Entity binding and record
conversion use the nearest declaration. Apply context field replacement in
the same way as the language types.

Keep operation stages explicit: after scope entry and route authorization,
initialize parsed state, apply canonical write values, run before/validate,
perform the action, and run operation after hooks. Keep server-owned read/write
scope and audit rules intact. Do not use full-response hooks for transactions.
Outer request middleware owns headers, logging, and cleanup for all responses,
including rejection and errors. Operation `after` keeps its success semantics.
Errors unwind only through entered scopes; preserve safe error envelopes.

Reject incompatible method/resource pairs and missing entity or parameter
bindings before startup. Validate parameter values at request time. Implement
HEAD fallback without response bodies, explicit HEAD override, OPTIONS/CORS,
405 with Allow, and 404 behavior with tests. Do not infer access policy from a
URL string or HTTP method. Do not add endpoints from entity declarations.

Verify: framework tests pass, with new cases in `src/routes/` and `src/hono/`
for nested scope order, early rejection, error unwinding, independent requests,
named parameters, resource state, audit values, record conversion, and HTTP
dispatch. Convert existing relevant tests to the new installation contract;
do not delete their business assertions merely to remove old syntax.

### 3. Connect one manifest to runtime, OpenAPI, and the SDK

Replace object-tree path inference in `model/route-schema.ts`. Generate literal
method/path contracts using the same file model as runtime. Keep schemas bound
to Zod parsed output and request input. Preserve status unions and custom
responses. Change OpenAPI generation to consume these compiled definitions.
Create the OpenAPI endpoint through its own `+server.ts` file in the app.

Replace `modules` extraction in `packages/sdk/src/client.ts` with the compiled
app contract. Preserve `createRpcClient` and credentials behavior. The normal
web type check must consume the published app type without running an app
generator manually or importing virtual source internals. If needed, the
ordinary API build emits private declarations before dependent checks; update
Turbo outputs and dependencies so fresh checkouts and cache hits are correct.

Verify: framework OpenAPI tests, SDK tests, SDK type-check, and web type-check
pass. Include type tests for list records, create/update input, named parameters,
custom output, errors, and a moved/deleted route. Compare runtime and OpenAPI
method/path sets. A wrong SDK call must fail a negative type test.

### 4. Move app handlers into the accepted tree

Use these mappings. `(authenticated)` is omitted from each URL:

| Existing endpoint | New location under `src/routes/` |
| --- | --- |
| GET `/health` | `health/+server.ts` |
| POST `/api/auth/sign-in/email` | `api/auth/sign-in/email/+server.ts` |
| GET `/api/auth/get-session` | `api/auth/get-session/+server.ts` |
| POST `/api/auth/sign-out` | `api/auth/sign-out/+server.ts` |
| GET `/me` | `(authenticated)/me/+server.ts` |
| GET `/files` | `(authenticated)/files/+server.ts` |
| POST `/files/presigned-url` | `(authenticated)/files/presigned-url/+server.ts` |
| GET/DELETE `/files/object` | `(authenticated)/files/object/+server.ts` |
| Users/roles/permissions resource operations | `(authenticated)/<resource>/<operation>/[id]/+server.ts`; omit `[id]` for list/create |
| User role assignments | `(authenticated)/users/[userId]/role-assignments/+server.ts` and `[roleId]/+server.ts` |
| Role permissions | `(authenticated)/roles/[roleId]/permissions/+server.ts` and `[permissionId]/+server.ts` |
| GET `/openapi.json` | `openapi.json/+server.ts` |

The file compiler must allow normal static segments containing dots for the
existing OpenAPI URL; add that grammar case to Plan 001's tests before use.
Do not mount operations that the current app does not expose.

Root scope owns shared identity and request behavior. The authenticated group
requires a session. Each resource scope owns its entity and public-record
conversion. Keep operation permission checks on the operation files. Move
business functions only as needed for clean imports; retain transaction logic.

Move domain ownership declarations to ordinary `src/domains.ts` and existing
entity/domain files. `db.ts` must not import the route manifest. Domain schema
registration is separate from URL registration. A route move must not add or
remove tables. No SQL migration should be required by this refactor.

Connect ordinary dev, build, type-check, and test startup to the tooling. Root
commands and CI must work from a clean cache. Preserve graceful process exit,
environment loading, test-target checks, Hono middleware, and auth cookies.

Verify: the API route contract and all existing API tests pass against the
isolated database. Run API lint/type-check and affected SDK/web checks.

### 5. Remove the old interface and update module tooling

Delete manual route registration, model route trees, module route bundles,
and unused route path-joining types. Keep entity/source behavior that still
serves resource execution. Update scaffolding to emit scope and endpoint
files, and verify compiled route behavior instead of route-index text.
Domain, permission, seed, and navigation integration remain explicit where
needed; do not use file routing to hide unrelated business registration.

Update the API skill, then its linked runbooks and framework reference. Replace
the old no-generator rule with the hidden-tooling contract. Project setup must
include the language support validated by Plan 001. Do not add generator
instructions. Keep the public route/import shape in documentation examples.

Verify: `pnpm test:module-tooling` passes. Search production source and tooling
with `rg -n 'defineModel|defineModule|compileRouteTree|BundleModels' apps/api/src packages/sdk/src scripts`.
No obsolete registration use may remain. Historical proof documents are not
part of this removal check.

## Done criteria

- All listed verification commands pass, including both Plan 001 integration
  scripts. Report any missing test service or failed check; do not mark DONE.
- An isolated editor-host test adds, moves, and deletes a route with no dev
  server, generated artifacts, manual refresh, or source type annotation.
- A clean-cache ordinary build and type-check pass, then pass from a cache hit.
- Runtime, OpenAPI, and SDK agree after route moves/deletes.
- API URLs, access rules, response contracts, and stored effects are preserved.
- No public manual route registry, compatibility wrapper, or generated import
  remains. Database ownership no longer depends on the route tree.
- No source scan or compiler dependency is required by the production server.
- Record evidence and status in `plans/README.md`.

Stop and report if a URL change, schema migration, permission change, Loom
change, or weakened type contract becomes necessary. Do not skip the editor
activation gate or compensate with a manual generation command.

## Maintenance

Treat the file model as the only source of route locations. Resource behavior
and generic helper types must change together. Test tooling after compiler
upgrades, and test route-type generation after route conventions change.

## Parent approval, 2026-09-09

APPROVE. The parent ran forced workspace build, type-check, lint, and tests;
module tooling; both proofs; isolated editor checks; cold development reload;
plain Node production; and cache restoration after output removal. All passed.
The final evidence and accepted editor limits are in `plans/README.md`.
No commit or deployment was made.

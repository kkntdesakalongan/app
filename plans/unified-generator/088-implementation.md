# Plan 088 implementation evidence

Status: accepted by the parent on 2026-10-05.

The parent inspected the caller changes, isolated process proof, guard test,
browser bundle proof, and CI routing. The SDK import and conversion are
unchanged. Independent final checks passed: the actual launcher/source proof
(1 test), the full frontend type check, the browser boundary (16 tests), and
`git diff --check`. The proof uses unmodified launcher/dev scripts and an
external type dependency outside runtime-owned `src`. Plan 089 owns retirement
of the old emitter and final performance acceptance.

The API package now exports `@southneuhof/api/routes-contract` from
`.sprindle/routes.ts`. The SDK keeps its public type import and Hono conversion.
The web freshness guard runs the normal API route producer and checks for that
source file. Its test now compiles the SDK contract with the installed
TypeScript 6 compiler. A type-only API dependency change reaches the consumer
before the route producer runs again.

The normal development entry stays on its existing route watcher. It writes
the source contract during the initial compile while the executable route
manifest stays at `.sprindle-dev/routes.mjs`. The API does not run a second
type job. The API verification command now includes the new source-contract
proof, and backend CI already runs that command. The web CI step now names the
generated source contract.

The new proof copies the actual launcher, dev entry, runtime watcher, and SDK
client source into an isolated workspace. It runs a synthetic Hono server and
the installed TypeScript 6 compiler with strict checking, Bundler resolution,
and the frontend `.web` module suffix. It does not change copied entry scripts
or connect to a database. It checks route addition, movement, and deletion;
request and response types; inherited scope changes; live external type-only
changes; syntax failure and recovery; rapid edits; standalone generation while
the watcher runs; runtime restart behavior; and shutdown. The external type
package lives outside API `src`. After its type changes, the frontend accepts
the new SDK type while the source and runtime artifact states and server
instance stay the same.

The browser boundary test now builds a consumer of the actual SDK client. The
bundle contains neither the generated route source nor API route, database, or
server runtime modules. The source pointer and old declaration output both
remain available in Plan 088; Plan 089 owns removal of the declaration
emitter.

## Verification

- `node --test apps/api/scripts/dev-source-contract.proof.mjs` — exit 0; 1 test.
- `node --test apps/web/scripts/ensure-routes-contract.test.mjs` — exit 0; 1 test.
- `pnpm --filter @southneuhof/api test:dev-routes` — exit 0; 3 tests passed.
- `node --test apps/api/scripts/ensure-tooling.test.mjs apps/api/scripts/dev-launcher.test.mjs` — exit 0; 9 tests passed.
- `pnpm --filter @southneuhof/sprindle test:tooling` — exit 0; 6 files and 66 tests passed.
- `pnpm --filter @southneuhof/api type-check` — exit 0; route build, route check, and TypeScript 7 check passed.
- `pnpm --filter @southneuhof/sdk type-check` — exit 0.
- `pnpm --filter @southneuhof/framework-web type-check` — exit 0; Vue and TypeScript 6 checks passed.
- `pnpm --filter @southneuhof/api routes:compile` — exit 0; wrote `.sprindle-test/routes.mjs`.
- `pnpm --filter @southneuhof/api exec tsx scripts/build-production.ts` — exit 0; no database connection.
- `pnpm --filter @southneuhof/framework-web build` — exit 0; transformed 1,588 modules. Vite reported its existing large-chunk warning.
- `node --test scripts/web-schema-boundary.test.mjs` — exit 0; 16 tests passed, including the SDK bundle boundary.
- `pnpm --filter @southneuhof/api lint` — exit 0.
- `pnpm --filter @southneuhof/framework-web lint:focused -- scripts/ensure-routes-contract.mjs scripts/ensure-routes-contract.test.mjs` — exit 0.
- `node --test scripts/web-validation-workflow.test.mjs` — exit 0; 2 tests passed.
- `node --check` passed for the new proof, web guard, guard test, and browser boundary test.
- Oxlint passed for the changed browser boundary test. Oxfmt passed for the new proof and browser boundary test with the web formatter config.
- `git diff --check` — exit 0.

The database-dependent API suite did not run. This plan does not authorize a
database setup or write. The Windows tooling job and the low-file-limit watcher
job remain in CI and were not run locally.

The API uses `.server` suffixes and the frontend uses `.web` suffixes. The full
frontend checks pass with those settings. Plan 087 records the compiler limit:
when an unsuffixed source and a distinct `.web` source share a base name, two
separate TypeScript configs can select different files. The current API has no
such `.server` or `.web` pair. No source copy or alias was added to mask this
resolution difference.

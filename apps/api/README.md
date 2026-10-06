# API

## Environment

Run `pnpm setup:local` from the repository root, then configure the database
and auth settings in the created files. `apps/api/.env` holds development,
`apps/api/.env.test` holds the isolated Vitest target, and `apps/api/.env.e2e`
holds E2E database and bucket overrides. Check readiness with
`pnpm module:preflight -- --needs api,test,browser,storage`. The API trusts `APP_ORIGIN` only. Change `API_PORT` and the related API URLs only in `apps/api/.env`; the sample values in `.env.example` are templates. The database is `carta`, admin seed via `CARTA_ADMIN_EMAIL` and `CARTA_ADMIN_PASSWORD`.

## Development

API route commands prepare current Sprindle tooling and public framework types
before they run. The API development command watches Sprindle source and build
inputs. A valid framework edit rebuilds the package, closes the active
development worker, and starts a new one. A failed preparation keeps the
working worker active until a later edit succeeds.

The development worker compiles the route graph to
`.sprindle-dev/routes.mjs`. The same producer updates the canonical typed source
at `.sprindle/routes.ts` for SDK inference. The runtime and SDK use the same
route definitions. The worker also watches runtime source under `src` and `.env`.
A change to startup code or environment restarts the API without route
generation.

Normal web type-check and build run
`pnpm --filter @southneuhof/api routes:build` before frontend checks. This
command refreshes the SDK contract at `apps/api/.sprindle/routes.ts`. The
frontend checker reads the generated source graph and its live ordinary
imports.

## Route import agreement

Route generation records the API compiler and runtime target for each
supported route import in the immutable source graph. Generation fails if
those selections disagree. The standalone SDK `type-check` refreshes the API
contract, then checks imports with its TypeScript 7 `tsconfig.json`. The web
`type-check` checks imports with TypeScript 6 and `tsconfig.vitest.json`.

A disagreement reports the importer, import text, API target, consumer target,
and consumer config. A package can use separate runtime and declaration files
when its `exports` or `main` and `types`/`typings` fields, or its `@types`
package, declare that relationship. The check validates package identity and
the selected conditional export branch against the API runtime and compiler.
It does not prove that a third-party declaration matches its runtime. It
checks route imports with literal specifiers; computed imports and direct
compiler or editor checks bypass this command gate.

Auth is served at `/api/auth/*`. All routes except `/health`, `/openapi.json`, and
`/api/auth/*` require a valid Better Auth session cookie.

`src/routes/` is the public API surface. Group related route files in folders.
## Direct S3/MinIO uploads

The API can issue an authenticated, short-lived `PUT` URL. The API does not
receive the file bytes.

Configure these variables in `.env`:

```text
S3_ENDPOINT
S3_BUCKET
S3_ACCESS_KEY
S3_SECRET_KEY
```

Request a URL:

```sh
curl -c cookies.txt -b cookies.txt -X POST "$API_URL/api/auth/sign-in/email" \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@example.com","password":"demo-password"}'

curl -c cookies.txt -b cookies.txt -X POST "$API_URL/files/presigned-url" \
  -H 'Content-Type: application/json' \
  --data '{"filename":"sample.txt","contentType":"text/plain","size":12}'
```

Copy `data.uploadUrl` from the response, then upload the file directly to
MinIO with the returned `Content-Type` header:

```sh
curl -X PUT '<paste-data.uploadUrl-here>' \
  -H 'Content-Type: text/plain' \
  --upload-file ./sample.txt
```

The response includes `data.downloadUrl`, a stable authenticated API URL for
displaying the object. The API creates a short-lived MinIO `GET` signature when
the browser opens that URL. The API does not store file metadata.

List objects under the application prefix:

```sh
curl -b cookies.txt "$API_URL/files?prefix=uploads/"
```

Delete an object with its server-generated key:

```sh
curl -b cookies.txt -X DELETE "$API_URL/files/object" \
  -H 'Content-Type: application/json' \
  --data '{"key":"uploads/<object-key>"}'
```

`S3_ENDPOINT` must be reachable by the browser that performs the `PUT`. The
MinIO bucket CORS policy must allow `PUT` from the browser origin and allow the
signed request headers, including `Content-Type`.

HTTP routes use files. A `+server.ts` file exports named HTTP methods. The
nearest `+scope.ts` supplies shared context, access, and an entity. Group
directories in parentheses do not add a URL segment.

```ts
// src/routes/health/+server.ts
import { defineRoute } from '@southneuhof/sprindle'

export const GET = defineRoute({
  action: () => ({ ok: true }),
})
```

Normal build, type-check, test, and development commands maintain the private
route artifact. Developers do not register routes or import generated files.
Database domains are registered separately in `src/domains.ts`.

Run `pnpm setup:editor` after checkout to install the Sprindle language
extension for VS Code. API development checks an existing installation and
prints this command when its files are old or incomplete. The check cannot tell
if an open VS Code window has reloaded the extension. Route changes then update
editor types without a route generation command.

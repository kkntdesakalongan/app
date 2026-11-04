# Disaster report delivery

Design: [design.md](design.md)

Public intake is at `/disaster-reports/new`. Administrator management is at
`/disaster-reports`. Images are stored with the report as validated data URLs.
They do not use the general file store. A public submission returns only its ID.

The development migration and authorization seed passed. The migration generator
now reads the table files and the authentication tables. An earlier generated
migration was incorrect and was run before review. PostgreSQL rejected it and
rolled back its transaction. A fresh database query confirmed that the existing
tables remained present. The discarded migration is not part of this change.
The replacement SQL creates only the two new module tables. A second generation
reported no schema changes.

Proof:

- API lint and type check passed. SDK type check passed.
- Web lint and type check passed. Existing lint warnings remain outside this module.
- Web production build and surface architecture checks passed.
- `pnpm --filter @southneuhof/api test:focused -- src/routes/public/public-modules.routes.spec.ts` passed both cases. The report case checks anonymous submission, private reads, invalid image rejection, administrator changes, and deletion against a real isolated database.
- `E2E_ITERATION=1 SKIP_E2E_PREPARE=1 pnpm --filter @southneuhof/framework-web test:e2e -- public-modules.spec.ts` passed both cases. The report case checks a browser File submission, image display, preservation on edit, and removal.
- The affected navigation and layout regression checks passed all 16 cases. The layout test now supplies its real router dependency.

The route tests protect application access and persistence decisions. The browser
checks protect local file conversion and custom map interaction. Standard CRUD
mechanics use the existing framework proof. No framework packages changed.

Local evidence is in `.local/verification/disaster-map/`. Isolated PostgreSQL
was prepared on port 55432 for test and browser proof. These checks did not reset
the development database or use the shared storage bucket. Playwright owned and
stopped its preview servers. Development preview uses `pnpm dev`.

Administrator creation has been removed from the resource, page routes, API
routes, and permission catalog. Public intake remains available.
The four focused API cases, web type check, API lint, web lint, and diff check
passed. Existing lint warnings remain. No database seed was performed for this
change. The removed API route prevents administrator creation regardless of
previous permission grants.

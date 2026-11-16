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

Report detail uses the standard DetailView body. The declared image field uses
the supported value slot with the shared ImagePreview component. The custom
body, duplicate Detail, and native image element have been removed. Browser
proof passed for opening and closing the preview, preserving the image after
editing, and removing it. Evidence uses `report-detail` filenames.

The list and standard detail show the formatted submission timestamp with the
label Submitted at. The browser report journey checked both labels.

Public intake presentation now uses the framework Form directly. The shared input renderers, schema, payload conversion, and create operation remain in use. The page has a title and logo header, Bahasa Indonesia labels, and fixed bottom actions over progressive blur. The submit action fills the row beside an icon-only cancel link. Bottom clearance derives from the blur and safe-area dimensions. No framework packages changed.

Selected proof for this presentation change: web type check, scoped lint, production build, surface architecture checks, and source review. All passed. Scoped lint reports one `vue/no-restricted-syntax` warning for the user-approved custom actions slot. The production build reports old Browserslist data and large chunks. The Impeccable detector returned no findings. No automated tests were added.

Source review found no material issue. Live browser verification remains incomplete because a reliable preview was not obtained. Actual phone layout, end-of-scroll clearance, zoom, keyboard focus, success announcements, and submission were not verified in this pass. Global design artifacts remain unchanged because this is a refinement within the current visual system.

The public success view now centers a large shared check icon and confirmation text. It moves keyboard focus to the confirmation heading after save. One full-width `Kembali` link to `/map` uses the bottom action row. The user-approved intake header uses a smaller, heavier title and a thin theme-token divider below the title and logo. No new automated tests were added for standard presentation.


The public intake now has an optional Lokasi field as its last field, below the image.
The shared location input binds directly to nullable latitude and longitude.
The server validates coordinate limits and complete pairs. A database check
keeps each pair complete. Existing reports have no location. Administrator edit
loads both coordinates and can change or clear the location.

The application now registers a location display renderer. It uses the shared
OpenStreetMap with selection and marker dragging disabled. Report detail reads
its saved coordinate pair into that renderer. A report without a location shows
a dash. The existing public LocationMap shows public pins and EWS stations; it
does not accept a report position, so it is not used for private report detail.
No framework packages changed.

Kategori Laporan is now a list column. The action adapter resolves current
category names for both list and detail through the existing public source.
This replaces the detail-only name mapping. List pagination metadata remains
with the report response.

The development database target and migration history matched before writes.
The additive location migration passed. A fresh read confirmed both nullable
columns and the coordinate-pair constraint. No database reset or seed was needed.

The existing public report route case now proves location persistence,
authorized detail output, and clearing through the real update route. Its
assertions detect dropped or uncleared coordinates. Other existing report
submissions still omit location. No new case was added for basic validation,
standard field bindings, or map presentation. The selected proof passed all
three API cases. API lint and type check, SDK type check, web type check, scoped
web lint, production build, surface architecture checks, and diff check passed.
The web type check initially rejected an untyped computed display reader; the
reader now derives its record type from the schema. A later formatting check
required formatting that reader; the scoped check was rerun after correction.

Evidence is under `.local/verification/report-location/`. Existing intake
custom-action lint and build size/data warnings remain. The build also reports
schema-boundary plugin timing. Browser map selection, map tiles, and rendered
category cells were not driven in this pass. The test PostgreSQL instance
started for this check was stopped after the tests.

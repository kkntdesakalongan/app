# GIS delivery

Implementation is in progress under the user-approved design.

Throughput checkpoint: split work by disjoint ownership. API owns persistence,
permissions and publication; web owns settings and map interaction; conversion
owns browser parsing and projection. The parent owns integration and acceptance.

The shared catalog is the application source of truth. No framework changes.
The existing file control owns file selection; browser GIS conversion and preview
are the unsupported domain behavior implemented locally.

Selected proof covers source interpretation and projection against supplied files,
immutable seeded records, update authorization, validated publication, and browser
preview and independent map-layer toggles. Standard CRUD glue needs no new tests.

Checks and remaining limitations will be recorded after implementation.

## Delivered

Five fixed GIS records are seeded empty in the audited configured development
database. Migration 20261117134449_gis-data was applied without a reset.
Settings supports list, detail and file replacement only. Browser workers convert
GeoPackage and zipped shapefile sources, including the supplied TM-3 and UTM
projections. The server publishes only validated converted GeoJSON to the existing
bucket. Failed publication preserves the active file. Successful replacement
cleans the prior owned object; a cleanup failure remains a saved-with-warning result.

The existing bottom map toolbar now contains Lapisan. Its flat list has six
independent selections. GIS styles and legends share one owner; polygons draw
below pins and EWS. Keterpaparan supplies two views from one stored file.

## Verified

- API type-check and focused lint passed.
- SDK type-check passed.
- Web type-check, focused lint, and production build passed.
- Surface architecture gate passed, including its 34 existing checks.
- git diff --check passed. A separate scoped scan found no new comments or suppressions.
- All five actual source conversions passed canonical server validation and
  preserved expected feature counts. Six wrong-category source cases rejected.
- Population source p totals 14,063. Missing land-use cells remain explicitly unknown.
- Independent parcel representations in TM-3 and UTM agreed for 12,500 matching
  first vertices within the one-metre comparison tolerance.
- Real HTTP proof verified authentication, fixed seeded rows, no create/delete,
  publication to the bucket, fresh public reads, attribute stripping, and rejection
  of an invalid replacement without changing its active reference.
- Built-app Chromium proof verified desktop and mobile empty states, settings,
  actual source conversion and preview, publication through the form, all six
  overlays enabled together, and one independent deselection. No page errors.
- The proof restored empty database records, removed its owned bucket objects,
  and signed out the final browser session.

Evidence lives in .local/verification/gis-api, gis-conversion, and gis-20261117.
The final browser log is gis-20261117/browser.log. Screenshots include the source
preview and simultaneous layer display. These are local evidence, not source assets.

## Limits

Initial full E2E preflight failed because the isolated carta_modules_e2e database
is absent. No E2E database reset or bucket clear ran. Bounded real proofs used the
configured development target, restored records, and removed only proof objects.
Development Vite dependency optimization stalled during live edits; the successful
full browser proof used the standard production build and preview command.
Concurrent publication races and storage cleanup failures were not fault-injected.
The application does not promise support for arbitrary GIS inputs or repair
self-intersecting source geometry. Source dimensions, coordinate systems, canonical
properties, coordinate ranges, and closed rings are checked.

## Jalur Evakuasi

The migration adds the dataset to existing installations. The administrator can
preview and publish both route stages and the TES and TEA points from the supplied
GeoPackage. The public map and dashboard share one overlay and legend.

- The supplied GeoPackage converted to 19 route features and five evacuation
  points. Conversion rejected a missing group, an incorrect geometry type, and
  an unrelated GeoPackage. The existing exposure file still gave 14,063 people.
- Chromium verified preview, authorized publication, a fresh public read, and
  rejection of an incomplete replacement without a change to the active data.
  On a mobile viewport, both route colors, both marker types, and the legend
  rendered. Disabling the layer removed the routes and markers.
- Type checks, focused lint, the web build, and surface architecture checks
  passed. The configured E2E database and bucket were absent. The browser check
  used the development database and temporary local storage. It restored the
  empty dataset record and removed the proof object.
- Local evidence is in `.local/verification/jalur-evakuasi`.

## Vulnerability and evacuation support layers

The catalog and migration add 14 independently replaceable datasets. The
converter selects named shapefiles and GeoPackage tables from the three Drive
files. Large upload requests use gzip and the bucket stores complete GeoJSON.

- Converted all 14 source layers and the existing evacuation overlay. Feature
  counts matched the source files. The converter rejected a ZIP that lacked
  the selected shapefile.
- Applied the migration to the configured development database. It contains 20
  GIS records. API and SDK type checks, focused API and web lint, the web build,
  and surface architecture checks passed.
- Chromium published physical vulnerability, environmental vulnerability, and
  warning signs through the admin form. Fresh public reads matched the source
  counts. The mobile map exposed 21 controls and allowed independent selection.
- The E2E database and bucket were absent. Browser proof used the migrated
  development database and an isolated local MinIO bucket. Evidence is in
  `.local/verification/gis-layer-expansion`.

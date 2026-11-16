# Kategori Laporan delivery

Design: [design.md](design.md)

The master is at `/master/report-categories`. It has standard list, detail, create,
update, and delete pages. Name is the only editable field. Metadata consists
of ID, created time, and updated time. The navigation entry and six operation
permissions use the existing access model.

The public category endpoint returns IDs and names in the standard collection
envelope. The public form uses the shared SelectInput below Keterangan and
above the image. Category selection is optional. Report edit loads the saved
reference and permits selection or clearing. Report detail resolves the current
category name through the public source. Existing image and success flows remain.

The database foreign key rejects unknown references and prevents category
deletion while reports use it. Local error hooks convert only this constraint
into a field error or deletion conflict. This is the custom API behavior needed
for the application rule; standard CRUD remains with Sprindle. The report detail
loader adds the current category label to the standard detail data. No framework
packages changed.

The development target and migration history were inspected before writes.
The additive migration and authorization seed passed on the configured Neon
development database. A fresh read confirmed the migration, nullable report
reference, category metadata, and all six active administrator grants. No initial
category rows were added and no database reset was used.

The existing isolated test database on port 55432 was stopped at first. The
first test migration failed with ECONNREFUSED. The existing local PostgreSQL
instance was started and the test command then passed. An early web type check
found that the raw category array did not meet the adapter's collection envelope
contract. The endpoint now returns `{ data }`; no adapter change was needed.

Selected proof protects public category access, administrator write access,
report reference persistence, invalid-reference rejection without an extra report,
rename visibility, deletion protection without data loss, and release of the
reference before deletion. The added route case uses the real application and
database. It does not test standard field validation or form mechanics.

Checks:

- API lint and type check passed.
- SDK type check passed.
- Web type check, scoped lint, and production build passed.
- Surface architecture checks passed: 34 cases and the source gate.
- Focused API route checks: all three cases in `src/routes/public/public-modules.routes.spec.ts`.
- Source review of navigation, access, field order, edit hydration, payload conversion, and detail display.
- `git diff --check` passed.

The public intake custom action slot still reports its existing design-review
lint warning. The build reports existing Browserslist data and chunk-size
warnings. Browser interaction and rendered layout were not verified in this pass.
Evidence is under `.local/verification/report-categories/`.

The PostgreSQL process started for verification was stopped after the checks.

The category pages now use the Master navigation group, like Settings. All intake
field labels omit the optional suffix. Validation and optional values stay the same.

For the Master route and label update, web type check, scoped lint, production
build, and diff check passed. The same existing warnings remain. Source review
confirmed the collection, create, detail, and edit paths under
`/master/report-categories`, and the absence of optional suffixes in web source.
No tests were added for this standard presentation and routing change. Browser
interaction was not verified.

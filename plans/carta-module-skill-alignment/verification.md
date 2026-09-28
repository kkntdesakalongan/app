# Carta module skill alignment

Updated seven skills: development, design, planning, API, web surfaces, forms and
acceptance review. Framework packages and application source in Carta were unchanged.

The workflow now requires reviewed component and journey mappings before execution.
Workers receive explicit contract paths and run worksheet preflight. Distinct UI
paths come from behavior and conditional inputs, before existing test coverage.
Asset checks retain the real form schema and submit boundary. Conditional validation
accounts for retained values.

`module-ui-check.mjs` checks rendered imports, component resolution, standard Views
and Create overrides. Custom record layouts retain `Detail`. Exceptions return exit
2 for parent review; they cannot produce a static pass. The worksheet checker checks
journey mappings, selected Playwright results and stable passing command reports.
Semantic coverage and current input freshness still require their separate checks.

| Check | Result |
|---|---|
| `pnpm run test:module-tooling` | 55 Node tests and 2 Python tests passed. |
| Skill Creator validator | All seven skills passed. |
| `git diff --check` | Passed. |
| Final command evidence freshness | Passed. |
| Original SWA UI against standard View choices | Failed as expected: unresolved Buttons, Create override, absent DetailView. |

The command fingerprint reports were retired under Plan 073 because they
included source tools removed from the supported workflow. [Original UI
failures](reports/baseline-ui.txt) remain preserved. An existing text-only
assertion for an obsolete worksheet heading was removed. Preservation and path
validation tests remain.

Two fresh GPT-5.6 Sol workers, with low reasoning effort, used isolated copies of
SWA and the revised skills. Neither received the defect list. The first prompt also
asked to preserve app language, which may have encouraged its label override.

Both initial runs still missed detail reuse and the unsafe browser path. They fixed
the asset schema but did not establish module acceptance. The second run returned
UI exceptions and recorded command evidence. Review rejected those exceptions.
These results led to stronger preflight, surface-kind and exception checks.

Directed planning rework then selected the default Create action, DetailView,
framework file rendering, and safe/unsafe journeys with required, optional and
retained investigation evidence. The parent checked the mappings and ran the final
worksheet checker successfully. The UI checker still rejected the unfinished source.
Planning approval therefore did not become implementation acceptance.

The corrected artifacts remain in
`/var/folders/yr/2grq5szx5db3cbkbg6wr59ph0000gn/T/carta-skill-forward-02-uqsztr1v/plans/swa`.

Browser and database runs were excluded from these isolated tests. There is no
independent end-to-end success result. The forward test demonstrates detected
failures and correction through review, not guaranteed autonomous delivery.

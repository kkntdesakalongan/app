# Verification

- Loom and web type checks passed.
- LocationInput suite passed: nine tests, including search popover empty state and keyboard selection.
- Focused web adapter lint and formatting passed.
- Surface architecture checks passed.
- Geoapify live autocomplete for Jakarta returned HTTP 200 with five results.
- Geoapify live tile request returned HTTP 200 with image data.
- Browser map clicks, marker dragging, provider switching, and multi-location dialogs remain unverified.
- Search popover tests cover loading versus empty results, Escape dismissal, and keyboard selection. Existing tests retain the Google coordinate and stale callback checks.

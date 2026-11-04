# Interactive map delivery

Design: [design.md](design.md)

The public map is at `/map`. The dashboard map is at `/dashboard` and fills the
content area with absolute positioning. Administrator pin management is at
`/map-pins`. Create and edit forms use the same OpenStreetMap position input.
A map click or the keyboard-accessible Use map center action sets the position.
Both map routes read the same public pin endpoint through the typed app client
and Loom collection runtime.

Leaflet uses OpenStreetMap tiles with visible attribution. No Google Maps
component is used by these modules. `VITE_MAP_TILE_URL` can select another
OpenStreetMap tile service. The default view covers Indonesia; the first pin
read fits the saved locations. Tile failure has a separate retry action.

The development migration and administrator permission seed passed. See the
[report delivery record](../public-disaster-reports/delivery.md) for the corrected
migration configuration and shared setup.

Proof:

- API, SDK, and web type checks passed. API and web lint passed; existing web warnings remain.
- Web production build and surface architecture checks passed.
- The real route/database pin case in `src/routes/public/public-modules.routes.spec.ts` passed. It checks anonymous and unprivileged write rejection, coordinate validation, public pin reads, updates, and deletion.
- Both browser cases in `e2e/public-modules.spec.ts` passed. The map case creates a pin through the position input, selects it on both maps, compares the dashboard map with its content bounds, checks public viewport bounds at desktop and mobile widths, and checks attribution.
- The affected navigation and layout regression checks passed all 16 cases.

Local evidence, browser results, and inspected desktop and mobile screenshots
are in `.local/verification/disaster-map/`. The test and browser databases were
isolated from development. Playwright stopped its preview servers after proof.
Development preview uses `pnpm dev`. Tile availability depends on the external
OpenStreetMap service.

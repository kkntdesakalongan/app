# Interactive map delivery

Design: [design.md](design.md)

The public map is at `/map`. The dashboard map is at `/dashboard` and fills the
content area with absolute positioning. Administrator pin management is at
`/map-pins`. Create and edit forms use Loom LocationInput with the existing OpenStreetMap
provider and location adapter. Its coordinate value maps to the pin latitude
and longitude at the form boundary. The custom position input was removed.
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

The map refinement moves Dashboard first and uses map-pin and warning icons.
The map controls use progressive backdrop blur and Loom buttons. Shell padding
stays fixed while the absolutely positioned map covers the content area. This
prevents an outgoing list page from losing its padding during the route fade.
Zoom and tile animation follow the reduced-motion preference. The HKA incident
map reference uses Leaflet defaults; the previous explicit animation disablement
has been removed. Zoom controls sit below the blur area at bottom-left.

The focused navigation/layout checks passed all 14 cases. Both browser cases
passed, including frame samples during navigation and animated zoom in/out.
Desktop and mobile screenshots were inspected in the bounded visual review.
The Impeccable detector returned no findings. Web type checking and production
build passed. Evidence uses the `map-polish` filenames in the shared local run
directory.

The toolbar now spans the map width without a card, border, or rounded surface.
Its progressive blur has a slight dark tint. Titles and status text align left;
framework text actions align right, including retry actions.
The browser module cases passed after the LocationInput change. Desktop and
mobile screenshots were inspected. Evidence uses `toolbar-location` filenames.

The route viewport now owns full-bleed map placement. Both map pages declare
`fullBleed`; AppRouterView renders them in a stable absolute viewport with the
same 200 ms fade and small vertical slide as ordinary pages. Map cleanup runs
after the route exit completes, so layers and toolbar remain visible together.
This removes the dependency on an unsized transformed ancestor. A browser frame check reproduced incorrect map dimensions
before the change. The same check now passes while entering and leaving the
dashboard; it also checks that the toolbar is not left without map panes. Both
browser module cases passed.
The 16 focused routing/layout cases, web type check, web lint, production build,
and diff check passed. Existing lint and build warnings remain. Verification
evidence uses `map-viewport` filenames in the local run directory.

The animation regression check failed when the map had no page transition and
passed after the shared transition was restored. It requires visible fade and
slide frames and a 200 ms duration while entering and leaving Dashboard, as
well as stable dimensions and intact map panes throughout both transitions.
Both browser module cases passed.
The 16 focused routing/layout cases, web type check, lint, production build,
and diff check passed for the restored transition. Existing warnings remain.
Evidence uses `map-transition` filenames in the local run directory.

The application is named Kalongan WebGIS in runtime configuration, the shell,
HTML title, and web manifest. Both map titles read WebGIS. Create and Manage
location actions were removed from the map toolbar; the report action is filled
and includes a warning icon. Marker details use a Leaflet popover above the
marker, with name and description assigned as text. The appended top detail
section and selected-pin action slot were removed.

The public map uses viewport-fit=cover, fixed positioning, and large viewport
height. Toolbar and map controls use safe-area insets; controls follow the
dynamic viewport. Four browser cases passed across Chromium and mobile WebKit,
including resize and rotation. Desktop and mobile screenshots were inspected.
Web type checking, lint, and production build passed, with existing warnings.
The detector returned no findings. Evidence uses `webgis-update` filenames.
Native iPhone Safari chrome remains for the user to check on-device. Further
verification was stopped at the user's request.

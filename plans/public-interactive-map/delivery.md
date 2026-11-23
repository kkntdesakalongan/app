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

The bottom toolbar opens one sheet above Search, Stations, Readings, and
Lapisan. The map owns the sheet so its edges align with the toolbar and users
can switch sections while it is open. Search uses the highest container surface.

Chromium checks on `/map` confirmed the search and range subscriptions, the
tsunami status restriction, keyboard focus return, and independent GIS layer
selection after a filter reset. The sheet matched the toolbar width in desktop,
phone, and landscape views. Touch and reduced-motion checks passed. Web type
checking, focused lint, and the production build passed. Screenshots are in
`.local/verification/map-filter-sheet/`.

The sheet uses the low container surface and extends to the bottom of the pill.
The filled pill slides between buttons. The label contrast follows the pill. The heading and controls fade
as one section. The sheet resizes between sections. In Chromium, the pill and all four buttons held their
positions during rapid tab changes at four viewport sizes with station and GIS
filters active. Frame samples and a recording are in
`.local/verification/filter-motion/`.

The mobile bottom toolbar puts the legend on the left and the layers button
on the right. The layers menu shares its width, height, and content transition
timing with the global mobile menu. On desktop, the legend and layers icon
are side by side at the bottom right, with the legend first. The zoom buttons
appear on desktop.

Chromium checks on `/map` and `/dashboard` used fixture data. They checked
portrait and landscape layout, the desktop breakpoint, keyboard dismissal
and focus return, reduced motion, and the legend update after layer selection.
Screenshots are in `.local/verification/map-bottom-toolbar/`. The configured
Playwright suite requires a local API, test database, and storage target.

The legend toggle and layers button now match the 40 px refresh button.
Refresh stays above the layers button when the legend opens or closes.
The smaller layers panel has its own animation and leaves the map interactive.
Chromium checked both map routes at mobile and desktop widths with fixture
data. It checked the refresh position, map panning, and panel dismissal.
Screenshots are in `.local/verification/map-compact-controls/`.

The layers surface now expands from the button in width and height with a
fixed lower-right corner. The contents fade in after the expansion starts.
Chromium checked intermediate frames in both directions at phone, landscape,
and desktop sizes. It also checked that refresh and map panning work with
the layers panel open. Screenshots are in `.local/verification/map-layers-expansion/`.

The layers panel now covers refresh as it expands. The layer rows fill the
card width, and the close button stays at its original position in the bottom
row. The card uses a broad shadow. The map stays undimmed and interactive.
Chromium checked the animation and open card over live map tiles at phone,
landscape, and desktop sizes. Screenshots are in `.local/verification/map-layers-card/`.

The title now sits on the left of the bottom row. The card and close button
share a 20 px corner radius. The close button has an inset keyboard focus
outline and returns focus to the layers button when it closes the panel.
Chromium and WebKit checked the footer geometry and keyboard dismissal.

The title and icon now share one centerline. Both button states use
borderless hover and press feedback. One icon morphs between the layers
stack and the close symbol, with an immediate change in reduced motion.
Chromium and WebKit checked the transition in both directions.

The root route opens the public map for signed-out visitors. Signed-in users
go to the existing authenticated default. The public map toolbar puts Masuk
or Admin before Buat Laporan. Both states use an icon. Below 380 px, the icon
keeps the accessible name and the toolbar stays on one row.
Chromium and WebKit checked the root redirect and both destinations with
session fixtures. Screenshots are in `.local/verification/map-home/`.

Clicking outside an open legend closes it. Clicking inside keeps it open.
Peta opens `/map`.
Chromium and WebKit checked both actions on the preview.

The login card fits a 320 px viewport and permits scrolling on short screens.
Chromium and WebKit checked the layout, form errors, and Peta link. Chromium
checked that the logo sits on the left and Peta sits on the right at 320 px
and 1280 px. The login still uses Geist Sans.

The app suppresses touch gestures that zoom the browser page. Chromium kept
the viewport at 1× while Leaflet pinch zoom and drag panning worked. Touch
scrolling worked on the login page. The native Safari gesture was not tested
on an iPhone.

Each EWS station shows a light blue 1 km fill when it loads. The outer part fades
to transparent. A shared pane keeps overlapping fills from darkening the map.
The browser permission and geolocation APIs supply the device position.
Position updates move the dot and stop when the viewer leaves the map.
The solid secondary location button and fixed refresh button share a row
above the toolbar. The open legend covers the row where they overlap.

Chromium and WebKit verified the range and action row on the preview.
Chromium checked permission, the location dot with emulated coordinates, and
revocation. Focused lint, web type checking, and the production build passed.
Screenshots are in `.local/verification/map-location-range/`.

Blocked location access replaces the prompt with a warning icon beside
WebGIS. Chromium changed the browser permission and opened the warning
tooltip by tap and keyboard focus. Chromium and WebKit held failed pin,
station, and tile requests open to check that refresh stays visible and
soft-disabled until completion. A failure re-enabled refresh. Successful
recovery removed it. Focused lint, web type checking, and the build passed.
Screenshots are in `.local/verification/map-location-warning-refresh/`.

Chromium and WebKit checked that the range fills appear before any marker
interaction and update when the station list changes. Screenshot samples
confirmed the edge fade and the opacity of overlapping fills. Focused lint,
web type checking, and the build passed.

The public map and dashboard open at the GeoNames coordinates for Desa
Kalongan. The initial zoom fits the viewport. Chromium checked that a
device position in Jakarta leaves the map centered on Kalongan, with
permission granted before opening the public map and after opening the
dashboard. Focused lint and web type checking passed. Screenshots are in
`.local/verification/kalongan-opening-view/`.

# Mobile navigation integration

The user approved the pill proof and authorized integration into main with the existing design system and Material colors.

## Ownership and scope

The app navigation manifest owns visible destinations and permissions. Its shared deepest-path match supplies the current menu on entry, detail, and edit routes.
The authenticated shell owns placement and content clearance. The new mobile component owns one open state and the approved interaction.
Loom Button and Icon own control styling. Existing Material surface, container, scrim, text, and state tokens own colors. No prototype font, palette, or page styling enters the app.
The existing ProfileSegment owns account appearance and sign-out. The desktop sidebar and public shell retain their behavior.

The shared dialog wrapper fixes the content at the center and supplies its own entry transitions. It cannot compose the approved anchored expansion. The app uses Reka Dialog primitives locally for this requirement. No framework package changes are authorized or required.

The prototype remains on proof/mobile-navigation-pill. Only production source and its required dependencies enter main.

## Throughput checkpoint

- Blocking first steps. Inspect shared control APIs, navigation identity, and runtime prerequisites before implementation.
- Independent workstreams. Read-only architecture candidates and runtime setup run independently.
- Shared mutable state. One worker owns the coupled application source. The parent owns dependency and delivery records.
- Smallest safe decomposition. Keep surface, label, icon, and focus behavior under one implementation owner.

## Selected proof

Check the real authenticated app through its existing browser fixture and public login form. Select current-menu identity on direct child entry, routing, permission-filtered links, mobile dialog dismissal and focus, account actions, desktop resize, existing dialog layering, reduced motion, and persistent surface/label/icon continuity.
Run app type checks, focused lint, the affected retained tests, and the app build. Do not add unit tests for static colors or DOM arrangement.

The configured remote E2E database host was unreachable. A task-owned local PostgreSQL cluster supplies a new isolated E2E database. Existing migrations and E2E seed commands prepare it. Existing Playwright configuration and fixtures are reused with preparation skipped after this explicit setup. No reset or storage clear runs against the original configuration. Its original contents are held in a process lease and restored after verification.

## Results

The production shell uses one mobile navigation component. It replaces the drawer
and its toolbar trigger. The prototype files and private palette remain on the
proof branch. Page content has a stacking context so sticky table cells cannot
paint above navigation. The toolbar stays above scrolling page content.

Passed checks:

- Web type check and production build.
- Web lint and formatting. Existing warnings remain, with no lint errors.
- Surface architecture checks.
- Retained breadcrumb and authenticated layout tests.
- Live Chromium and WebKit routing. Mobile, narrow mobile, tablet, desktop resize,
  Back and Forward, child-page identity, nested account appearance controls,
  Escape, focus return, reduced motion, and command-palette layering.
- Frame inspection of the continuous label, stationary icon, intermediate icon
  shapes, and rapid toggles.
- Source review of Material tokens, shared controls, and added comments.

The full web unit suite has two failures. Both also fail on main at b2285a2.
The main CI run is
[42801091632](https://github.com/southneuhof/carta/actions/runs/42801091632).
One resource-completion test expects a warning toast. One route-generation test
expects TS2322, but TypeScript returns TS2769 for the same rejected route.
These failures are outside this change and remain unchanged.

Local browser evidence and check logs are under
`.local/verification/mobile-navigation-integration`. The browser probe uses the
existing fixture and is not a permanent application test.

Delivery uses GitHub CLI because the Origin CLI is unavailable. Independent
runtime review and main promotion are tracked in
[PR 13](https://github.com/southneuhof/carta/pull/13). Restore the temporary E2E
configuration and stop the task-owned database after the review.

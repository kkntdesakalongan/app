# App design

Use this file when you design, build, or review an `apps/web` page. It owns the
app's visual conventions. An explicit user requirement can change a convention;
record that change in the feature's existing work record. Component APIs still
define the supported implementation.

Keep app design rules here. Skills describe implementation and checks, and link
to the applicable section. Feature records contain required exceptions and
their reasons, not copies of these rules.

## Shell and navigation

Use one authenticated shell, with persistent navigation on wide screens, a
bottom-right navigation pill on narrow screens, a global toolbar on wide screens, and one main content region.
Public and sign-in pages use their own shell. A module supplies the page body.
Keep navigation available on direct entry to a child page and hide empty groups.
Add search, notifications, or a dashboard only when the task requires them.
Keep the top and side safe areas outside the authenticated scroll area.

The narrow-screen pill identifies the current menu and expands into its navigation
window. Narrow screens have no shell header; show the logo and app name at
the top of the navigation window in a row with space between them. Derive the current menu from the permission-filtered navigation manifest,
including on direct entry to a detail or edit page. Keep the label and menu icon
continuous through expansion and closure. Keep the menu and Close hit targets
stationary. Use shared controls, existing Material color tokens, and the app's
typography. Let page content scroll behind the pill. Place safe-area and pill
clearance at the end of the scrollable content so the last controls can clear it.

## Page structure

Use `ListView`, `DetailView`, and `FormView` for their standard tasks. `DetailView`
and `FormView` own the page header through `NavigationHeader`. A custom page
without those Views uses `NavigationHeader` directly. `ListView` renders its own
title and toolbar header. Show one `NavigationHeader` on each page; sections
below it keep their own titles. Add content through
the View's supported slots or below the View. Give additional content a short
section heading. Choose one
surface treatment: an unframed section with normal page spacing, or a framework
card when the content needs visual containment. Keep unframed sections free of
card-like borders, backgrounds, corner rounding, and container padding. Keep
module titles in the standard header; omit decorative banners, repeated titles,
and slogans.

A record with one additional section shows that section directly below
`DetailView` on entry. Use an adjacent component for a section of the same
record. Use a default child `detail/index.route.vue` with `AppRouterView` only
when the section owns an identity that users can link, refresh, and return to.
The user does not need an Open button or a single tab to see that section.
For several child sections, place Loom `Tabs` below `DetailView`,
then `AppRouterView`. Use named `RoutedTabItem` targets. The route owns the default-child redirect. The detail remains visible.
Length alone does not earn a route.
See [file routing](docs/architecture/file-routing.md)
for file placement, replacement pages, and Back targets.

Keep the record summary first, with the primary task and its controls. Show
each field or attachment once. Use a sidebar for companion context: facts about
the same record with no row actions and no collection of its own. Companion
context sits beside the primary content on wide screens and below it on narrow
screens. Disclose supporting content that the user does not need to choose the
next action with the shared `Disclosure` section. A linked collection with
its own rows owns the full width below the summary. Several sections alone do
not require a custom record shell.

Give the record summary, related collections and distinct workflow areas named
sections. On a custom detail page, use separate framework cards by default for
areas with independent content or controls. Use unframed sections when headings
and spacing make their boundaries clear. Keep each section's heading, content
and controls together. A standard View can already supply this grouping.

For collections, show the primary name or reference first, then useful status
and dates. Put long prose and secondary audit fields in detail. Use cards when
images or summaries help users compare records. Add a Table/Cards switch only
when both views serve the task.

## Actions and forms

Keep standard Create controls and list row View/Edit/Delete actions in their normal
locations. Put requested record workflow actions in the detail controls area.
Group related actions. Keep header actions right-aligned and final form actions
together at the bottom-right. The page header does not repeat form actions.

Use `FormView` for an independent form page, `DialogForm` for a short contextual
form, and `Form` inside an existing surface. Group fields by task and put
prerequisite fields before dependent fields. Use the smallest filter width that
fits the control; use a full row only when needed.

A contextual dialog form opens from its own action and owns its normal open and
close interaction. In repeated content, use one dialog form for each record
action. Let the page control visibility only when another page control must
coordinate the same dialog.

## Controls and values

Use shared controls and keep their standard designs. Customize only for an
explicit user request or a required interaction they cannot support. Change
wording through label configuration. Import components from public exports or
verify their runtime registration.

Choose display behavior for every visible field. Use a reusable display
fragment when several fields share a renderer, accessor, or format. Pass the
needed fragments to each `defineTable` column map and `defineDetail` field map.
Keep form inputs in their own `defineForm` map. Show attachments as previews
or named file links, states as labelled framework chips, relations as names,
and dates and units with the applicable format. Show structured values as
readable content; use raw JSON only when the task requires JSON.

## Text and spacing

Use labels, values, validation, and short instructions that help the user do
the current task. Add help where a format, dependency, or consequence is unclear.
The standard submit label is `Submit`; collection view labels are `Table` and
`Cards`. Use the existing app language and domain terms.

Use the selected framework surface's spacing and theme tokens. Start peer
sections and action groups with `gap-2`. Let actions wrap on narrow screens.
Use colour with a text label for status. Keep content and controls usable at
narrow widths and with browser zoom.
Keep page actions separate from global actions. Use restrained borders and
surfaces. Reserve strong emphasis for the primary action, selected state, and
urgent feedback. Support the app's light and dark themes.

## Access and feedback

Use links for navigation and buttons for actions. Keep focus visible and
headings in order. Give icon controls accessible names. Support keyboard use;
keep focus inside an open navigation window and return it to the trigger when
Escape closes the window. When a resize closes mobile navigation, move focus to
a visible app region. Respect reduced motion preferences.

Preserve reading order when columns collapse. Keep labels, errors, and long
values accessible. Keep page scrolling usable; isolate wide table scrolling
and avoid other nested scroll areas unless the task needs them.

Keep loading, empty results, no filter matches, access denial, and failure
distinct. Offer Create or Clear filters when applicable. Preserve input on
failure and prevent duplicate submission. Confirm destructive actions with the
record and consequence. Show success after the write succeeds. If refresh then
fails, report stale data without asking the user to repeat the write.

## Technical references

Read the applicable [UI reference](docs/ui/README.md) for surface slots, form
selection, and collection controls. Use current source for exports and props.
Examples show implementation facts; compare their layout with this file before
you copy them.

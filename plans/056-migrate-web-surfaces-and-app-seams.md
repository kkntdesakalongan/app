# Plan 056: Migrate every web resource, route, preset, and app boundary

> Read architecture §§1-2, 6, 8-10 and `DESIGN.md`. Use `$web-ui-surfaces` for page work. Run drift check, then update row 056 after review. Do not commit or push unless asked.
>
> **Drift check:** `git diff --stat 40afee2..HEAD -- apps/web/src/configs apps/web/src/framework apps/web/src/routes apps/web/src/main.ts apps/web/src/router`. Compare excerpts and inventory before editing; stop on changed endpoint or route contracts.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** HIGH; **Depends on:** 054, 055; **Category:** migration; **Planned at:** `40afee2`, 2026-09-23.

## Why this matters

The actual app still declares a shared field catalog, aggregate resource schema, and field defaults. All five settings resources, route consumers, app adapters, and acceptance fixtures must use the new surface API before the old public paths can be removed.

## Current state

- `apps/web/src/routes/(authenticated)/settings/users/users.resource.ts:1-19` imports `defineFields`, creates one catalog, and calls `defineResource(usersSchema, ...)`; lines 21-46 put standard operations under `actions`.
- `.../users/users.schema.ts:18-23` uses `defineSchema(rpc.users, {...})`, retaining the role-selection transform at lines 7-16.
- `.../users/index.route.vue:7-9` calls `users.list()`.
- `apps/web/src/configs/defaults.ts:23-55` mixes labels, display, table, form, and implicit requiredness by property name.
- `apps/web/src/main.ts:36-40` installs `fieldDefaults` and old mixed renderer registration.
- `apps/web/src/framework/schema.ts:1-19` imports `fromZod` and aggregate `WebResourceSchema` types. `DESIGN.md:25-39,59-93` requires standard Views, one header, useful status/date/relation display, and unchanged page workflows.

Current app declaration (`users.resource.ts:19-24`):

```ts
export const users = defineResource(usersSchema, {
  key: 'users',
  actions: {
    list: {
      run: usersActions.list,
      fields: [fields.name, fields.email, fields.statusCode, fields.createdAt],
```

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | exit 0 |
| Web unit | `pnpm --filter @southneuhof/framework-web test` | exit 0 |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | exit 0 |
| E2E | `pnpm --filter @southneuhof/framework-web test:e2e` | exit 0 in configured environment; otherwise report blocked |

## Scope

**In:** `apps/web/src/configs/{defaults,labels,input-presets,display-presets,statuses,dictionary}.*`, `framework/{schema,hono/contracts,inputs/registry,fields/*,display/*,adapters/*,acceptance/*}` and related tests/type fixtures, `main.ts`, all `settings/{users,roles,permissions}` resource/schema/action/route files including nested role permissions and role assignments, router tests/generated route contracts when touched by the new bags. Remove app `framework/fields/` when its retained parts have moved.

**Out:** `apps/api` endpoints, auth/permission semantics, dependency versions, visual redesign, unrelated provider APIs. Preserve all current route names and displayed field membership. Backend response envelopes stay fixed.

## Git workflow

Continue on `resource_system_overhaul` after Plans 054-055. Do not ship an intermediate state. Do not commit or push unless asked.

## Steps

1. Split `appFieldDefaults` into labels, input fragments, display fragments, and status catalog with explicit editable subset. Move app display renderers to `framework/display/renderers.ts`; update plugin installation. Keep timestamp, HTML, asset, and `createdBy`/`updatedBy` captions. Add tests at the new owners. **Verify:** `pnpm --filter @southneuhof/framework-web exec vitest run src/configs/labels.spec.ts src/configs/statuses.spec.ts src/framework/display/renderers.spec.ts --environment jsdom` exits 0; tests prove labels do not change input or display behavior.
2. Replace `framework/schema.ts` aggregate UI schema builder with direct operation-specific raw schema checks against Hono endpoint types. Keep transport inference in `framework/hono/contracts.ts`; remove `AppResourceContract`/UI-wide aliases. Convert app input source registry to explicit `{ load, namespace? }` functions and explicit lookup `loadDetail`. **Verify:** `pnpm --filter @southneuhof/framework-web exec vitest run src/framework/hono/actions.spec.ts src/framework/inputs/registry.spec.ts --environment jsdom` exits 0 and included Hono type fixtures compile.
3. Convert users, roles, permissions, role-permissions, and role-assignments `.schema.ts` files to raw schemas and `.resource.ts` files to labels/fragments, `defineForm`, `defineTable`, `defineDetail`, and one-object `defineResource`. Keep the users role-selection-to-ID transform, named set commands, contextual filters, permissions, and route metadata. Use operation-local draft mapping for update; do not fabricate visible detail for update-only flows. **Verify:** `pnpm --filter @southneuhof/framework-web test` exits 0 after each converted module; `pnpm --filter @southneuhof/framework-web type-check` exits 0 when all five are converted.
4. Convert all affected `.route.vue` files and acceptance fixtures to static `list`/`create` bags and identity-bound `detail`/`update` bags. Preserve one NavigationHeader, dirty-page guard, query namespace, collection slots, row controls, export, and file/asset preview. **Verify:** `pnpm --filter @southneuhof/framework-web type-check && pnpm --filter @southneuhof/framework-web test` exits 0; run the E2E command in the Commands table when configured.

## Test plan and done criteria

- Follow `users` route specs, `framework/acceptance/QueryOwnershipFixture.spec.ts`, and `framework/adapters/assets.form.spec.ts` for test setup.
- [ ] Every five settings resources use the one-object contract and independent surface definitions.
- [ ] No `defineFields`, `defineSchema`, `fromZod`, or `appFieldDefaults` executable use remains in `apps/web/src`.
- [ ] All current pages, permissions, route names, field memberships, and workflow commands still pass the cited tests.
- [ ] Web/Loom type-check and web unit test commands exit 0; blocked E2E is explicitly reported.

## STOP conditions

- A current endpoint lacks the data needed for an existing visible relation caption and no app loader can batch/enrich it without a backend change.
- A proposed change alters server authorization, route names, or a transport envelope.
- Type correctness needs `as never`, a public `any` facade, or suppression.

## Maintenance notes

Keep small-module labels, fragments, surfaces, and resource composition together in `.resource.ts`; raw schemas stay in `.schema.ts`, transport in `.actions.ts`. Review all role/permission command and denied-row paths, not only standard CRUD.

Users, roles, and permissions use `sort_by` and `sort` in their table query schemas. Their list actions map these keys to the existing API keys `sort` and `order`. Keep the table and API query schemas separate.

The nested role permission route has no usable inferred query type, so its table query schema stays local. The role assignment response item is `any` in the RPC type. Its action parses each item with the record schema at runtime; this does not provide a static Hono record check. Revisit these limits if the API route types become more precise.

Node 26 exposes a Web Storage global that conflicts with jsdom in this workspace. Run the web unit suite with `NODE_OPTIONS=--no-experimental-webstorage` so jsdom provides `localStorage`.

## Review result

Accepted on 2026-09-24. All five settings resources use independent surfaces and the one-object resource contract. The app source has no executable `defineFields`, `defineSchema`, `fromZod`, or `appFieldDefaults` use. Nested list routes use file-route permission metadata for direct access; their resource list bags do not hold fabricated route IDs. The users route mounts with the real resource and loads its list.

The web unit suite passed (47 files, 230 tests), and the full web E2E suite passed (10 tests). `git diff --check` passed. The web type-check still reports only Loom type-fixture errors, and the Loom type-check still reports the `Drawer.vue` and `Tabs.vue` errors assigned to Plan 058. The route test was revised to wait for visible content and always unmount.

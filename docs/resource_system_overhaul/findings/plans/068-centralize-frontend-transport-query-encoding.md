# Plan 068: Put collection wire encoding in the existing Hono adapter

## Status

- Status: TODO
- Priority: P3
- Effort: M
- Fix risk: MEDIUM
- Category: correctness, architecture, types, verification
- Source baseline: `223fc622d9a897014fcbad48df838a19cec398db` (2026-09-24). Live source check: `b57c6f8` (2026-09-24); production source is unchanged, and the user revised `ARCHITECTURE.md` during review.
- Depends on: 064, 065, 066, 067; canonical loader/query types and wrapper ownership must exist
- Findings owned: F23

**Execution:** Work in the current checkout; source paths are repository-relative. Do not commit, push, upgrade dependencies, change backend contracts, or alter unrelated work. Record commands and exit codes in this bundle's `README.md`. Follow `AGENTS.md`: write no implementation comments and no tautological tests. Expected-red regression tests are preparation, not completion. Missing dependencies or services are BLOCKED, never a passing result.

**Architecture:** Components own their public props, model values, events, and explicitly supported native attributes. Form derives requiredness from its schema, owns one tracked session, and forwards canonical component configuration. Authored inputs name their renderer. Inputs receive loaders in component props; no field `source`, inferred choice synthesis, prop-normalizer, or form-only model conversion exists in the completed architecture. App-level asset services are configured once and used by inputs and previews alike. `defineForm` preserves optional `submit`; a later explicit `:submit` replaces it. Form/DialogForm props are flat; page views contain nested primitive bags. Shared labels, input fragments, and read-only display fragments remain ordinary data. Changes are frontend-only; existing transport adapters remain the explicit API boundary.

## Intent

Users, roles, permissions, and generated modules should not each implement the same collection-to-HTTP spelling conversion. The frontend component query remains canonical inside Loom. The existing Hono adapter owns validation and encoding into the unchanged endpoint protocol. This is an explicit transport boundary, not a form prop converter.

## Current state and evidence

`users.actions.ts:1–12`, `roles.actions.ts:1–12`, and `permissions.actions.ts:1–12` repeat sort_by/sort -> sort/order and two schema parses. Their schema files repeat pagination/search/direction and maintain separate table/wire variants. `framework/hono/actions.ts` already owns wireQuery, request dispatch, cancellation, and response normalization; it is the correct existing owner. The users resource additionally supplies the same table query schema before the action wrapper parses it again.

This is source-confirmed duplication, not a claim of measured runtime overhead. Match `framework/hono/actions.spec.ts` and `routes/(authenticated)/settings/resource-list-query.spec.ts`. Keep endpoint-specific allowed sort keys and filters; do not replace them with a permissive untyped query.

`apps/web/src/routes/(authenticated)/settings/users/users.actions.ts:1–12`

```ts
import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import type { CollectionLoadContext } from '@southneuhof/loom'
import { usersQuerySchema, usersTableQuerySchema } from './users.schema'

const api = createHonoResourceActions(rpc.users)

async function list(context: CollectionLoadContext) {
  const { sort_by, sort, ...query } = usersTableQuerySchema.parse(context.query)
  return api.list({ ...context, query: usersQuerySchema.parse({ ...query, sort: sort_by, order: sort }) })
}

```

`apps/web/src/framework/hono/actions.ts:14–19`

```ts

function wireQuery(values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => [key, Array.isArray(value) || (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) ? JSON.stringify(value) : String(value)])
```

`apps/web/src/framework/hono/actions.ts:39–48`

```ts
  const actions = {
    list: async ({ query, searchParameters, signal }: { query: Record<string, unknown>; searchParameters: Record<string, unknown>; signal?: AbortSignal }) =>
      dataAdapter.normalizeCollection(await payload(await source.list.$get({ query: wireQuery({ ...searchParameters, ...query }) }, { init: { signal } }))) as CollectionResult<
        Record<string, unknown>
      >,
    detail: async ({ id, searchParameters, signal }: { id?: RecordIdentity; searchParameters: Record<string, unknown>; signal?: AbortSignal }) => {
      if (id === undefined) return undefined
      return dataAdapter.normalizeRecord(await payload(await source.detail[':id'].$get({ param: { id: wireIdentity(id) }, query: wireQuery(searchParameters) }, { init: { signal } })))
    },
    create: async (input: object) => dataAdapter.normalizeRecord(await payload(await source.create.$post({ json: input }))),
```

`apps/web/src/routes/(authenticated)/settings/users/users.schema.ts:23–42`

```ts
export const usersQuerySchema = checkedHonoQuerySchema(
  rpc.users,
  z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    statusCode: z.string().optional(),
  })
)

export const usersTableQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['name', 'email']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  statusCode: z.string().optional(),
})
```

Evidence is source inspection plus the earlier isolated probes stated above, not a claim that pinned Vue/browser tests passed. The probe harness used explicit test doubles. Establish real regressions before implementation. Use Vitest `describe/it/expect` and deferred promises as in the cited existing tests; keep schemas, compiler, session, and the component under test real.

## Scope

Modify these owners, their callers reached through the named contract, and their focused tests:

- `apps/web/src/framework/hono/{actions,contracts,index}.ts and actions.spec.ts`
- `apps/web/src/framework/hono/collectionQuery.ts (create: plain shared field definitions and private encoder)`
- `apps/web/src/framework/hono/__type-tests__/contracts.type-test.ts`
- `apps/web/src/framework/schema.ts: remove redundant query-specific guard when its checks move to the adapter`
- `apps/web/src/routes/(authenticated)/settings/{users,roles,permissions}/*.{actions,schema,resource}.ts and tests`
- `apps/web/src/routes/(authenticated)/settings/resource-list-query.spec.ts`
- `Other actual createHonoResourceActions callers and their query schema bindings`
- `scripts/scaffold-bounded-module.mjs, scripts/test-support/bounded-fixture.mjs, generator tests and generated type fixtures`
- `docs/architecture/web-application-architecture.md and active Hono/resource generator guidance`

Out of scope: Backend/API/SDK protocol changes, unrelated Hono endpoint wrappers, introducing a second resource constructor, component query aliases, generic frontend schema converters, and weakening filter/sort types.

## Preparation and commands

```sh
git status --short
git diff --stat 223fc622d9a897014fcbad48df838a19cec398db..HEAD -- packages/loom/src apps/web/src scripts .agents/skills docs/ui docs/architecture docs/resource_system_overhaul/ARCHITECTURE.md .github/workflows
```

Compare these excerpts with live code and read the revised `docs/resource_system_overhaul/ARCHITECTURE.md` as the required end contract. Its revision is expected drift from the source baseline. Changes made by declared prerequisite plans are also expected; verify their stated end contracts. Report other unexplained drift before editing. Do not discard unrelated working-tree changes.

Use installed package-local tools pinned by `package.json` and the lockfile. Record the actual Node/pnpm versions. The live baseline passed the listed unit, browser, tooling, architecture, and cold package type gates; rerun them after implementation. The Node 26 Web Storage flag applies to local web and workspace unit runs. CI uses Node 20.19.0.

| Gate | Command | Required result |
|---|---|---|
| Unit | `pnpm --filter @southneuhof/loom test` | Exit 0; scoped regressions run. |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; new files registered in the explicit include list. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0 with strict Vue fixtures. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 without boundary suppressions. |
| Web behavior | `NODE_OPTIONS=--no-experimental-webstorage pnpm --filter @southneuhof/framework-web test` | Exit 0 on this Node 26 checkout. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; no acceptance allowlist for removed executable paths. |
| Tooling | `pnpm test:module-tooling` | Exit 0 when callers, generators, docs fixtures, or checkers change. |
| Final workspace | `pnpm type-check && NODE_OPTIONS=--no-experimental-webstorage pnpm test && pnpm lint && pnpm build` | Exit 0 on this Node 26 checkout after the coordinated implementation. |

## Steps

### 1. Lock the existing wire contract with request-level tests

Capture the requests produced by the three current action adapters. Cover ascending/descending/no sort, page/limit, search, empty values, false/zero filters, arrays, nested filter objects, contextual searchParameters, and cancellation. Record accepted endpoint-specific sort keys. Use the real serializer and response envelope normalization; stub only the HTTP endpoint.

**Verify:** Web behavior and Web types; current request controls pass. Add a generated-module check demonstrating the duplicated wrapper before replacing it.

### 2. Make the existing Hono factory own collection query validation and encoding

The target factory call is:

```ts
const api = createHonoResourceActions(rpc.users, {
  querySchema: usersQuerySchema,
})

export const usersActions = {
  list: api.list,
  detail: api.detail,
  create: api.create,
  update: api.update,
}
```

`usersQuerySchema` describes the frontend Collection query: page, limit, search, sort_by, sort, and user filters. The factory's required querySchema is the sole parse owner for its list loader, including direct use in option component props. Run asynchronous parse so explicit asynchronous validation is honored. Validate/transform this query once per loader invocation. The encoder then maps sort_by to wire sort and direction sort to wire order once, before existing wireQuery serialization. Keep resource metadata, response normalization and AbortSignal forwarding unchanged.

Infer the loader's query type from that schema and statically check the encoded fields against the endpoint request query type. Keep runtime wire encoding private to the existing adapter. Do not export a generic normalizer or add a component-side wire mode. Wire query values are not fed back into Collection.

Preserve merge precedence: parse the authored query, then merge contextual searchParameters with parsed query values winning for explicitly present same-named inputs, then encode reserved sort members into the wire contract. Do not mutate either source. Only emit wire sort/order when the corresponding canonical member is present; do not send sort_by or duplicate directional sort. Context filters outside the managed query retain their existing explicit transport behavior and server validation.

**Verify:** Web behavior/type gates; exact request assertions remain unchanged, invalid allowed-sort values dispatch zero HTTP calls, and direct api.list/option-loader calls are validated without a Table wrapper.

### 3. Keep one authored UI query schema per module

Move common pagination/search/direction field schemas into `framework/hono/collectionQuery.ts` as ordinary reusable schema fields. Modules spread those fields and explicitly add their allowed sort_by enum and domain filters. Keep these plain fragments; add no query-schema constructor language.

Remove the redundant wire-query schema and action wrapper from users/roles/permissions. Move the relevant compile-time endpoint check into createHonoResourceActions. Remove the obsolete checkedHonoQuerySchema export after migrating all real callers; leave checked record/create/update schema helpers outside this plan unless the boundary work proves them redundant separately.

Resource list bags bind `load: usersActions.list` without also supplying that same querySchema to Table. The adapter already validates it, including when extracted directly; installing the same parser twice would repeat declared transformations. Table's querySchema capability remains for standalone loaders whose query validity Table explicitly owns. The standard Hono-generated path has exactly one parser in the adapter and does not add runtime markers or inspect loaders to discover their implementation.

**Verify:** Web behavior/types, Unit, Architecture and Tooling; query transformation counters equal one per call. Existing Table standalone query validation tests remain valid; resource extraction does not bypass the Hono query schema.

### 4. Migrate generators and remove module-local conversion

Emit the single raw UI query schema, canonical Hono factory call and direct list binding in generated modules. Keep update-only endpoint adapters explicit; do not fabricate visible detail operations. Update schema-import/query contract fixtures and the active resource example from actual generated output.

**Verify:** Tooling, Architecture, both type gates and final workspace gates. Fresh generated modules compile; users/roles/permissions contain no handwritten `{ sort_by, sort, ...query }` conversion or alternate wire-query schema. HTTP request assertions still match the original endpoint protocol.

## Test plan

Extend Hono actions.spec.ts with exact request objects, signal identity, runtime parsing, invalid-sort rejection, direct source-loader calls, and one-transform counters. Test shared query fragments with module-specific filters and sort restrictions. Use existing scaffold fixtures to compile the actual new generated schema/action/resource trio rather than an unrelated hand-authored example.

## Done criteria

- [ ] One adapter implementation owns collection sort/order wire spelling.
- [ ] Each module authors one frontend query schema; query parsing occurs once on the standard Hono path.
- [ ] Direct resource loaders satisfy component-native contexts and retain cancellation/access behavior.
- [ ] Endpoint-specific sort/filter checks remain; backend requests and envelopes are unchanged.
- [ ] Generators no longer reproduce a query codec in each module.
- [ ] Scoped unit/browser/type gates pass with exact executed commands, counts, skips, and exit status recorded.
- [ ] Only scoped owners, dependent callers, tests, current documentation, and plan status changed; review `git diff --check` and `git diff --stat`.
- [ ] No compatibility alias, fallback to a removed contract, public `any` facade, or type-suppression escape was added.

## STOP conditions

Stop if an endpoint uses a genuinely different wire protocol from the inspected standard Hono route contract, or normalization requires weakening endpoint-specific accepted fields. Keep that endpoint's explicitly named transport implementation separate rather than adding hidden protocol detection. Do not change server parameter names to simplify the frontend.

Do not improvise a new backend contract or suppress a required check. Report a repeated verification failure after two targeted repair attempts. A missing browser, dependency, database, or storage prerequisite blocks that gate rather than justifying a stubbed substitute.

## Maintenance

Wire encoding belongs next to HTTP dispatch. Shared schemas are reusable data, not a UI-to-wire configuration language. A new standard resource should require only its allowed query schema and endpoint, not copied normalization logic.

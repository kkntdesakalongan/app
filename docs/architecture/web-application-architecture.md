# Web application architecture

Use [Carta module terms](../../CONTEXT.md) for module ownership language.
Use the [current Loom authoring path](../resource_system_overhaul/ARCHITECTURE.md#direct-module-authoring)
when you add a module. This file summarizes the app owners and route rules. Read
[file routing](file-routing.md) for route placement and parent ownership.

## Owners

Routes own URLs, page composition, navigation, dialogs, confirmations,
notifications, and workflow state. App adapters own transport and response
normalization. API module schemas define create, update, select, and operation
input values. Web modules define Collection query schemas and form adapters.
Loom constructors define one form, table, or detail surface. A resource binds
the surface bags to standard operations and access metadata.

```mermaid
flowchart LR
  Routes["Filesystem routes"] --> Views["ListView / DetailView / FormView"]
  Views --> Surfaces["Table / Detail / Form"]
  Surfaces --> Controls["Display renderers and inputs"]
  Schemas["Raw operation schemas"] --> Definitions["defineForm / defineTable / defineDetail"]
  Definitions --> Resource["defineResource"]
  Actions["App operation adapters"] --> Resource
  Resource --> Views
```

## API schema boundary

The API module owns schemas for backend values. Keep the `schema.ts`,
`*.table.ts`, entity, route, and scope files that the feature needs within its
module folder. Import a schema value in web code through the physical API
package export:

```ts
import {
  createUserSchema,
  userSelectSchema,
  userUpdateSchema,
} from '@southneuhof/api/src/routes/(authenticated)/users/schema.ts'
```

The package export maps this path to the same file. Shared API values use
`@southneuhof/api/src/schema.ts`. Keep `RouteContract` as an `import type` from
`@southneuhof/api/routes-contract`.

The schema names describe different inputs. `userCreateSchema` is generated
from the users table for an insert. `createUserSchema` accepts the password and
role IDs for the custom user create operation. The web users module extends
that operation schema for the role selector; see its
[current schema adapter](../../apps/web/src/routes/%28authenticated%29/settings/users/users.schema.ts).
Do not read schema values from a Sprindle entity.

Normal Vite dev/build checks the resolved web runtime graph. Dependency
optimization and worker bundles use the same boundary. The real
[schema graph proof](../../scripts/web-schema-boundary.test.mjs) covers these
imports. It proves dependency portability; it does not prove API authorization
or rendered behavior.

## Route ownership

Filesystem route names are part of the app contract. Keep a parent route when
it owns the authenticated shell, persistent navigation, or a record summary
that remains visible on a child page. A child owns its query state, data load,
and workflow. Use a nested file route only when the section needs its own
identity, link, refresh, or return path.

```text
settings/roles/
  index.route.vue
  create.route.vue
  [roleId]/detail.route.vue
  [roleId]/edit.route.vue
  [roleId]/detail/permissions/index.route.vue
```

The detail page remains visible for a child section. Use named route tabs for
several child sections. Route files and Back targets must follow
[the file-routing convention](file-routing.md).

## Schemas and surface definitions

Import backend create, update, and record values from the API module schema.
Keep web query schemas and form value conversion in the web module. The
compiled app examples are
[users.schema.ts](../../apps/web/src/routes/%28authenticated%29/settings/users/users.schema.ts),
[users.actions.ts](../../apps/web/src/routes/%28authenticated%29/settings/users/users.actions.ts),
and [users.resource.ts](../../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts).
The web adapter checks returned record and update values against the typed Hono
route:

```ts
import {
  userSelectSchema,
  userUpdateSchema,
} from '@southneuhof/api/src/routes/(authenticated)/users/schema.ts'
import { rpc } from '@/framework/rpc'
import { checkedHonoRecordSchema, checkedHonoUpdateSchema } from '@/framework/schema'

export const userRecordSchema = checkedHonoRecordSchema(rpc.users, userSelectSchema)
export const userUpdateFormSchema = checkedHonoUpdateSchema(rpc.users, userUpdateSchema)
```

The user create form uses `createUserSchema` as its request base and keeps its
role selector transform and duplicate check in the web adapter. The query
schema stays in that web module:

```ts
import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'

export const usersQuerySchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['name', 'email']).optional(),
  statusCode: z.string().optional(),
})

export type User = z.output<typeof userRecordSchema>
```

Define the three UI surfaces separately. A reusable display fragment is a
plain object and can be spread into a table column or detail field:

```ts
const statusDisplay = { renderer: 'chip', props: { options: statusLabels } }

const usersTable = defineTable({
  schema: userRecordSchema,
  labels: userLabels,
  columns: {
    name: { sortable: true },
    statusCode: { ...statusDisplay },
  },
})

const userDetail = defineDetail({
  schema: userRecordSchema,
  labels: userLabels,
  fields: {
    name: {},
    statusCode: { ...statusDisplay },
  },
})

const createForm = defineForm({
  schema: createUserFormSchema,
  labels: userLabels,
  fields: { name: { renderer: 'text' } },
  submit: usersActions.create,
})
```

Table and detail maps select record keys. Form maps select input keys. Each
surface checks its own schema. Display fragments do not define form behavior.
Use a `read` accessor when the displayed value comes from a joined relation.
The API must return that relation data; do not fetch one label per row.

The module query schema describes the canonical Collection values. Share only
the page, limit, search, and direction fields; define sortable columns and
filters in that module's schema. Bind it to the Hono list adapter once:

```ts
const api = createHonoResourceActions(rpc.users, { querySchema: usersQuerySchema })

export const usersActions = {
  list: api.list,
  detail: api.detail,
  create: api.create,
  update: api.update,
}
```

The adapter validates the query before dispatch and encodes `sort_by` as wire
`sort` and direction `sort` as wire `order`. A resource table binds the loader
directly; it does not also receive this query schema. Keep `querySchema` on a
standalone Table only when that Table owns query validation for its loader.
Pass `querySchema` only when the typed Hono route includes list. A route that
only creates, reads one record, updates, or deletes does not need query options.

## One-object resource declarations

`defineResource` receives one object with `key`, `identity`, and only the
operations that the module supports:

```ts
export const users = defineResource({
  key: 'users',
  identity: (record: Pick<User, 'id'>) => record.id,
  list: {
    permission: 'view-users',
    route: { name: 'settings-users' },
    table: { ...usersTable, load: usersActions.list },
  },
  create: {
    permission: 'create-users',
    route: { name: 'settings-users-create' },
    form: createForm,
  },
  detail: {
    permission: 'view-users',
    route: {
      name: 'settings-users-detail',
      params: id => ({ userId: String(id) }),
    },
    detail: ({ id }) => ({
      ...userDetail,
      load: context => usersActions.detail({ ...context, id }),
    }),
  },
  update: {
    permission: 'update-users',
    route: {
      name: 'settings-users-edit',
      params: id => ({ userId: String(id) }),
    },
    form: ({ id }) => ({
      ...updateForm,
      load: async context => {
        const record = await usersActions.detail({ ...context, id })
        return record ? { name: record.name } : undefined
      },
      submit: output => usersActions.update(id, output),
    }),
  },
  delete: { permission: 'delete-users', run: usersActions.delete },
})
```

Every declared standard operation has a permission string or explicit `null`.
The list and create bags are static: `users.list` and `users.create`. Detail
and update bind an identity: `users.detail({ id })` and `users.update({ id })`.
Detail and update factories are pure; they do not load data. Their returned
bags own their loaders. An update loader selects draft keys explicitly. Do not
add a flat page loader or fabricate a detail operation for an update-only
resource.

Custom commands stay under `actions`. They declare `run` and a permission,
and return guarded `can` and `run` functions. Standard operation members do
not live in `actions`.

`run` and `can` receive exactly the declared business arguments. For a
row-dependent policy, bind the row with `command.withContext({ record })` and
call `can` or `run` with those same arguments. A policy that needs a row denies
when the command has no bound record.

A routed command with static permission uses that value for route entry. A
routed command with an argument-dependent permission callback needs a static
`routePermission` value for entry. Do not call the callback without command
arguments. `can` and `run` still apply the callback with their actual arguments.

Resource list, detail, create, and update declarations use the matching
complete View prop contracts. The binder removes operation metadata, forwards
page options such as filters, export, back targets and completion callbacks,
and supplies the guarded primitive bags. Extracting a primitive keeps its
access and cache behavior without adding page navigation.

## Route pages

Routes pass the static or identity-bound bags directly to views:

```vue
<ListView v-bind="users.list" title="Users" />
<FormView v-bind="users.create" title="Create user" />
<DetailView v-bind="users.detail({ id })" />
<FormView v-bind="users.update({ id })" title="Edit user" />
```

The route owns the route param and converts it to the resource identity value.
Vue Router route names and params are type-checked against the generated route
map. Resource routes use the registered operation and its static entry
permissions. Use `meta.permission` for extraordinary routes without a resource
registration.

## Data, access, and cache

Use the Hono action adapter or a typed app service in the web layer. Keep
transport out of Loom. Standard resource reads and writes use the resource
cache namespace. Successful standard writes invalidate affected collections
and records. A custom command that changes another resource invalidates that
resource through its owner.

Client permission checks control visible actions. The API repeats access and
domain checks on every request. Resource identity remains required for record
detail, update, and delete operations. Do not invent IDs for nested pages.

## Check changes

Run the web lint and type checks plus focused tests for each changed owner. Vue
types own schema membership and component props. Review displayed values,
authorization and workflow behavior in source and tests. See the
[web verification guide](../../.agents/skills/web-ui-surfaces/references/verification.md)
for lint findings and source review.

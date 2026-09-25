# Web query cache contract

Loom owns the TanStack Query client and the cache namespace for bound resource
operations. Routes do not create query clients or raw query keys for standard
resource screens.

## Standard resource reads

The list bag is static. `ListView` or `Table` owns its loader:

```vue
<ListView v-bind="users.list" />
```

The bound operation exposes its loader at `users.list.table.load`. A detail
bag captures its identity and owns its record loader:

```ts
const detail = users.detail({ id })
detail.detail.load(context)
```

An update form owns its draft loader at `users.update({ id }).form.load`. The
loader maps the record to form input values. Do not load an update draft from a
flat page loader or show a fabricated detail operation.

Use the standard `ListView`, `DetailView`, and `FormView` to retain the shared
loading, cache, error, and refresh behavior. Use `useLoader` for a separate
custom data set only when no existing surface owns it.

## Standard writes

The form's `submit` function and the resource binder own access checks and
invalidation for the declared standard write. Do not wrap a standard submit in
another `run` call or repeat invalidation after the write. A successful
mutation invalidates the resource collection and the affected record/draft
cache. A detail or update binding carries its identity.

Custom commands live under `resource.actions`. `run` and `can` receive exactly
the declared business arguments. Use `withContext({ record })` to attach row
policy data; it does not change those arguments. The command checks its policy
when it runs and invalidates the owning resource after success. If a command
also changes another resource, await that resource's
`invalidate({ id? })` call after the write. Report refresh failure separately
from the successful write.

A successful create or update result must contain a valid resource identity.
An invalid result fails after the write, invalidates the resource, and reports
`RESOURCE_RESULT_INVALID` as a non-retryable post-write error. Explain that the
write may have completed. Do not submit again automatically.

## Custom data sets

Use `collectionKey` or `recordKey` with `useLoader` for a custom data set:

```ts
const query = { page: 1, limit: 100 }
const loader = useLoader({
  key: collectionKey({ resource: users.key, namespace: 'active-users', query, searchParameters: {} }),
  context: { query, searchParameters: {} },
  load: context => userActions.list(context),
})
```

Include every input that changes the result in the key and request context.
Use a distinct namespace when the same resource has another logical
collection. Keep parent identity in both the request and key. Do not add
manual `onMounted` loads or duplicate refresh state.

`useLoader` accepts `key`, `context`, `load`, optional `enabled` and `data`; it
returns `data`, `loading`, `error`, and `refresh`. Use `enabled` while required
inputs are absent. Do not pass both `data` and `load`.

## Review checklist

- Standard views use the static or identity-bound bags from the resource.
- Standard reads have one loading and cache owner.
- Update drafts load and map values inside the bound form bag.
- Standard writes do not repeat the binder's invalidation.
- Custom data sets include their query and parent inputs in the cache key.
- Cross-resource writes refresh each affected resource after success.

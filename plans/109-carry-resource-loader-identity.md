# Plan 109: Carry resource identity with framework loaders

## Decision and status

The user accepted this direction on 2026-10-27. Implementation and parent review are complete on
`feat/resource-authoring-simplification`. See the shared
[verification record](108-unify-resource-configuration-contracts.md#verification). This plan records the decision.

Framework-created resource loaders carry their source identity internally.
Consumers obtain resource ownership and cache identity from the loader instead
of requiring authors to copy `load`, `resource`, and `namespace` together.

This follows [Plan 108](108-unify-resource-configuration-contracts.md). Its
callable resource bindings remain a separate accepted change.

## Authoring change

The Users form currently declares this resource-backed input:

```ts
roleIds: {
	renderer: 'checkbox-group',
	props: {
		load: roles.list.table.load,
		resource: roles.list.table.resource,
		namespace: roles.list.table.namespace,
		pick: 'id',
		view: 'name',
		searchParameters: { active: true },
	},
}
```

The target removes the repeated identity properties:

```ts
roleIds: {
	renderer: 'checkbox-group',
	props: {
		load: roles.list.table.load,
		pick: 'id',
		view: 'name',
		searchParameters: { active: true },
	},
}
```

These examples retain current resource access syntax to isolate this decision.
Plan 108 changes resource surface consumption to callable bindings.

The framework knows the resource and operation when it creates the loader.
Retain that information internally and consume it at the read boundary. Do not
infer ownership from function text, a namespace string, or arbitrary closures.
Do not introduce a mandatory application source wrapper or registry.

## Identity responsibilities

Resource ownership determines which reads a resource write invalidates.
Source identity and effective request parameters determine which reads may
share cached data. Keep distinct response families, including collection,
record, form hydration, and option data, separate when their shapes differ.

View identity determines which table query state the URL restores. Keep this
separate from resource ownership. A normal resource table already receives a
generated namespace and does not need another author declaration.

Retain an explicit namespace for deliberate state sharing or separate persistent
views when the framework has no stable view identity. Two Users tables on the
same page can use `assigned-users` and `available-users` to preserve independent
pagination and filters. Random mount IDs cannot replace persistent URL names.

Standalone custom loaders use instance isolation by default. Authors must still
declare resource ownership if such a loader needs resource invalidation and the
framework has no ownership information. A custom function that wraps a bound
loader does not automatically preserve its identity.

## Implementation requirements

- Give the internal identity contract one framework owner. Resource binding
  creates it, and supported read consumers use it.
- Preserve existing access checks, cancellation, retries, error feedback, and
  resource invalidation when consuming a bound loader outside its page bag.
- Include all request-changing parameters in cache identity. Fresh bound
  closures for the same logical request must not create new cache entries.
- Keep explicit view identity available. Do not derive resource ownership from
  a caller's namespace override.
- Select the internal carrier during implementation. Private metadata or an
  internal association must not become a new authoring requirement.
- Define how generated identity interacts with explicit ownership and namespace
  props. Remove repeated declarations from affected application consumers in
  the same change.
- Check invalidation through option consumers, independent URL query state,
  source changes, and reuse across resource bindings. Use `test-audit` before
  test changes. Select proof appropriate to the changed framework owners.

## Implementation scope

The user later authorized Carta implementation and Git publication. External
application migrations and global freshness changes remain outside this work.

The implementation uses a private WeakMap for loader identity. Bound ownership
conflicts are rejected. Explicit namespace overrides remain available for view
state. Option consumers use the bound owner and request parameters.

Minimize Reader Load removes repeated identity plumbing from resource-backed
inputs. Resource and view identity remain separate because they control
different behavior.

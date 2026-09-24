# Plan 065: Bind immutable operation identities and forward complete View contracts

## Status

- Status: TODO
- Priority: P1
- Effort: L
- Fix risk: HIGH
- Category: correctness, architecture, types, verification
- Planned against: `223fc622d9a897014fcbad48df838a19cec398db` (2026-09-24); the supplied ZIP has no `.git` metadata.
- Depends on: 062, 064; the tracked session and canonical component-prop boundaries must exist
- Findings owned: F10, F11, F12, F13, F18 (runtime result identity), F24

**Execution:** Work on the supplied branch; source paths are repository-relative. Do not commit, push, upgrade dependencies, change backend contracts, or alter unrelated work. Record commands and exit codes in `plans/README.md`. Expected-red regression tests are preparation, not completion. Missing dependencies or services are BLOCKED, never a passing result.

**Architecture:** Components own their public props, model values, events, and explicitly supported native attributes. Form derives requiredness from its schema, owns one tracked session, and forwards canonical component configuration. Authored inputs name their renderer. Inputs receive loaders in component props; no field `source`, inferred choice synthesis, prop-normalizer, or form-only model conversion exists in the completed architecture. App-level asset services are configured once and used by inputs and previews alike. `defineForm` preserves optional `submit`; a later explicit `:submit` replaces it. Form/DialogForm props are flat; page views contain nested primitive bags. Shared labels, input fragments, and read-only display fragments remain ordinary data. Changes are frontend-only; existing transport adapters remain the explicit API boundary.

## Intent

A bound operation targets exactly the identity that was checked. Null permission never bypasses row policy. Business arguments are never reinterpreted as framework context. Resource bags remain complete View configurations, and extracting a primitive retains access and invalidation without navigation.

## Current state and evidence

| Finding | Verified baseline behavior |
|---|---|
| F10 | `bindResource.ts:143–166` returns true before the access adapter for null permission. The actual app adapter also checks `allowedOperations`; a prior null-permission delete probe dispatched despite a denied row. This is client policy, not a proven backend bypass. |
| F11 | `bindResource.ts:484–497` captures the caller's mutable binding. A prior probe bound A, changed `binding.id` to B, then deleted/invalidated B using A's policy context. |
| F12 | `bindResource.ts:242–273` detects custom context using `run.length` and a trailing `record` object. A default-parameter command lost its legitimate `{ record, note }` payload. |
| F13 | `operations.ts:139–186` and `bindResource.ts:42–64` duplicate partial View prop lists. A valid ListView filters declaration was rejected; page callbacks are likewise omitted. |
| F18 | `bindResource.ts:211–225` returns malformed create identities through direct submit; navigation is not a mandatory validation seam. Static union guards are covered by plan 067. |
| F24 | `identity.ts:15–28` retains an unused string/key-array identity declaration helper. `runtime.ts:15–19,41–46` repeats the same runtime through aliases. |

Use `resources/__tests__/boundResource.spec.ts`, the current access adapter in `apps/web/src/framework/adapters/bundle.ts`, and route/identity type fixtures as conventions. Preserve scalar/composite identities, existing error normalization, and server-returned operation metadata.

`packages/loom/src/resources/bindResource.ts:143–166`

```ts
function permissionRequest(
  access: AccessAdapter,
  operation: ResourceOperation | string,
  permission: string | null,
  record?: object,
): boolean {
  if (permission === null) return true
  const currentRecord = recordContext(record)
  return access.allows({
    operation,
    permission,
    ...(currentRecord && isStandardRowOperation(operation) ? { record: currentRecord } : {}),
  })
}

function standardAllowed<TRecord extends object>(
  access: AccessAdapter,
  operation: ResourceOperation,
  permission: string | null,
  visible: ((context: { record?: TRecord; access: AccessAdapter }) => boolean) | undefined,
  record?: TRecord,
): boolean {
  return permissionRequest(access, operation, permission, record)
    && (!visible || visible({ record, access }))
```

`packages/loom/src/resources/bindResource.ts:246–253`

```ts
function splitCustomContext<TRun extends (...args: never[]) => unknown, TRecord extends object>(
  args: [...Parameters<TRun>, context?: ResourceCustomContext<TRecord>],
  runLength: number,
): { args: Parameters<TRun>; record?: Record<string, unknown> } {
  const last = args[args.length - 1]
  if (args.length > runLength && rowContext(last)) return { args: args.slice(0, -1) as unknown as Parameters<TRun>, record: last.record }
  return { args: args as unknown as Parameters<TRun> }
}
```

`packages/loom/src/resources/bindResource.ts:484–497`

```ts
  if (definition.delete) {
    const declaration = definition.delete
    page.delete = (binding: { id: ResourceIdentityValue<TIdentityFunction>; record?: IdentityRecord<TIdentityFunction> }) => {
      assertBinding(resourceKey, identity, binding, 'delete')
      const record = binding.record
      return {
        can: () => standardAllowed(useResourceOperationRuntime().adapters.access, 'delete', declaration.permission, declaration.visible, record),
        route: declaration.route,
        run: async () => {
          const runtime = useResourceOperationRuntime()
          assertAllowed(resourceKey, runtime.adapters.access, 'delete', declaration.permission, declaration.visible, record)
          const result = await declaration.run(binding.id)
          await invalidateResourceData(runtime.queryClient, { resource: resourceKey, id: binding.id })
          return result
```

`packages/loom/src/resources/operations.ts:139–156`

```ts
  permission: string | null
  route?: ResourceStaticRoute
  title?: string
  description?: string
  visible?: (context: { access: AccessAdapter }) => boolean
  table: TTable
}

export type ResourceCreateDeclaration<TForm extends FormBagShape = FormBagShape> = {
  permission: string | null
  route?: ResourceStaticRoute
  title?: string
  description?: string
  visible?: (context: { access: AccessAdapter }) => boolean
  defaultTo?: RouteLocationRaw | ((result: FormSubmitResult<TForm>) => RouteLocationRaw | undefined) | false
  successMessage?: string | false
  form: TForm
}
```

Evidence is source inspection plus the earlier isolated probes stated above, not a claim that pinned Vue/browser tests passed. The probe harness used explicit test doubles. Establish real regressions before implementation. Use Vitest `describe/it/expect` and deferred promises as in the cited existing tests; keep schemas, compiler, session, and the component under test real.

## Scope

Modify these owners, their callers reached through the named contract, and their focused tests:

- `packages/loom/src/resources/{defineResource,bindResource,operations,identity,runtime,index}.ts`
- `packages/loom/src/contracts/{components,forms,tables,details}.ts and contracts/views.ts (create)`
- `packages/loom/src/components/views/{FormView.types.ts,FormView.vue,ListView.vue,DetailView.vue}: canonical public prop declarations`
- `packages/loom/src/resources/__tests__/** and __type-tests__/**`
- `apps/web/src/framework/adapters/bundle.ts and access/row-policy tests`
- `apps/web/src/router/{guards,routeAccess}* and router/__tests__/**: resource registration consumers`
- `apps/web/src/routes/(authenticated)/settings/**: custom-command, delete, and resource declaration callers`
- `scripts/{scaffold-bounded-module,module-ui-check,check-surface-architecture}.mjs and their tests`
- `docs/resource_system_overhaul/ARCHITECTURE.md, docs/ui/{forms,collections}.md, active command/resource authoring skills`

Out of scope: Backend authorization and endpoint identity formats, unrelated router functionality, editing state, component-specific props, and a general command/workflow framework. The existing delete handle remains; fix its capture rather than inventing another delete API.

## Preparation and commands

```sh
git status --short
git diff --stat 223fc622d9a897014fcbad48df838a19cec398db..HEAD -- packages/loom/src apps/web/src scripts .agents/skills docs .github/workflows
```

Compare these excerpts with live code. Changes made by declared prerequisite plans are expected; verify their stated end contracts. Report unexplained drift before editing. Do not discard unrelated working-tree changes. In a snapshot without Git, compare source content and record that limitation.

Use installed package-local tools pinned by `package.json` and the lockfile. Record the actual Node/pnpm versions. These commands are verification requirements, not previously observed passes:

| Gate | Command | Required result |
|---|---|---|
| Unit | `pnpm --filter @southneuhof/loom test` | Exit 0; scoped regressions run. |
| Browser | `pnpm --filter @southneuhof/loom test:browser` | Exit 0; new files registered in the explicit include list. |
| Loom types | `pnpm --filter @southneuhof/loom type-check` | Exit 0 with strict Vue fixtures. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 without boundary suppressions. |
| Web behavior | `pnpm --filter @southneuhof/framework-web test` | Exit 0. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; no acceptance allowlist for removed executable paths. |
| Tooling | `pnpm test:module-tooling` | Exit 0 when callers, generators, docs fixtures, or checkers change. |
| Final workspace | `pnpm type-check && pnpm test && pnpm lint && pnpm build` | Exit 0 after the coordinated implementation. |

## Steps

### 1. Add direct-operation regressions

Reproduce mutable scalar/composite binding targets, null permission with denied rows, ambiguous command payloads, malformed mutation-result identity, and valid page props rejected by a resource. Exercise extracted functions, not only generated buttons. Run positive controls for ordinary permissions and compatible results. Record baseline failures separately.

**Verify:** Unit and Web behavior gates; the new tests fail at the specified public seams before the fixes.

### 2. Snapshot identity and preserve execution-time policy

At binding, validate and copy the scalar/composite identity into binder-owned immutable data before invoking a surface factory. Use that exact snapshot for load context checks, operation arguments, cache keys, and invalidation. A caller mutating its original object cannot redirect the handle.

Keep a detached snapshot of supplied record context, including row-operation metadata; preserve its complete shape. Validate that snapshot's identity matches the target. Evaluate visibility, current permission state, and snapshot row policy each time the bound operation executes. Updated row metadata requires a fresh binding; changing a retained caller object is not a supported way to retarget a handle. Backend authorization always checks current server state.

Always invoke the access adapter with the nullable permission. Null disables only permission-code checks. Row-operation restrictions still apply. Retain the app's existing handling of absent versus malformed metadata; document and test it rather than silently interpreting a malformed explicit restriction as permission.

**Verify:** Unit, Web behavior and both type gates; mutated original bindings do not change targets, policy-denied operations dispatch zero requests, and permitted controls still work.

### 3. Give command context a separate binding operation

Use this single public shape:

```ts
const command = resource.actions.reject
await command.run(payload)

const rowCommand = command.withContext({ record })
if (rowCommand.can(payload)) {
  await rowCommand.run(payload)
}
```

`run` and `can` accept exactly the business-argument tuple declared by the command. `withContext` is a pure context binder returning the same run/can/route capabilities; it starts no work. A later `withContext` replaces context rather than layering it. Apply identity consistency and record snapshot rules at this binding seam. A record-dependent visible policy explicitly returns false when record is absent; both can and run enforce it. Root commands otherwise retain context-free behavior. Do not infer a row requirement from payload contents, and do not add a second context argument to run.

Remove `splitCustomContext`, arity checks, trailer detection, and all overloads that append context to business arguments. Permission callbacks and the business function receive the unchanged argument tuple. Default parameters, rest parameters, optional arguments, and payload properties named `record` remain ordinary business input. Migrate every current custom-command caller and generator example.

**Verify:** Unit, Web behavior, both type gates and Tooling. Exact argument spies show no insertion/removal; denied contextual commands dispatch zero writes; reserved command names remain rejected.

### 4. Validate mutation results without implying rollback

Capture the executing app runtime and binding generation before asynchronous work. On a successful server response, validate that the result satisfies the identity-bearing contract independently of navigation. Update results must identify the captured target. Create results need valid identity, not joined display-only properties. Preserve the original result and its operation-specific type; do not project it to an identity object or hydrate it using display renderers.

A malformed successful response is a post-write protocol failure. Invalidate the known target and collections for update; invalidate the whole resource when create identity cannot be recovered. Report `RESOURCE_RESULT_INVALID` as a non-retryable post-write error explaining that the operation may have completed. Do not fabricate identity, automatically retry, claim rollback, navigate, or emit normal Form success for the malformed response. A cache invalidation failure after a successful write is also a post-write error, not permission/validation rejection.

For valid results, invalidate once and return once. Old Form sessions may ignore presentation completion, but the resource operation still completes its own invalidation.

**Verify:** Unit and Browser gates; extracted submits with malformed results fail the post-write contract without a second mutation; valid minimal identity results work without display joins.

### 5. Derive resource page declarations from canonical View contracts

Put reusable public View prop types under `contracts/views.ts`; SFCs and resource declarations import them. Resource declarations add permission/visibility/typed-route metadata and substitute identity factories for identity-bound primitive bags. They do not re-list a subset of page props.

The canonical target is:

```ts
const users = defineResource({
  key: 'users',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'view-users',
    route: { name: 'settings-users' },
    table: { ...usersTable, load: usersActions.list },
    filters: usersFilterForm,
    export: usersExportOptions,
  },
  create: {
    permission: 'create-users',
    form: createUserForm, // includes submit; binder wraps this effective function
    backTo: { name: 'settings-users' },
    afterSubmit: handlePageCompletion,
  },
})
```

Use the actual View export/options types, not new resource-specific versions. Runtime binding strips declaration metadata only, forwards supported View props, and adds generated sibling actions. Explicit caller values win over derived defaults; explicit false disables the corresponding default. Binder-owned cache identity and access-wrapped function members cannot be replaced by declaration metadata. Keep generated route names/parameters typed.

The extracted `users.create.form.submit` performs the same access/invalidation as FormView; it contains no navigation, toast, or dialog closing. A later component-level submit override is an intentional different operation and inherits none of the replaced handler's policies.

**Verify:** Unit, Browser, both type gates and Architecture. Every View prop is forwarded or listed as binder-owned in a contract test; filters/export/afterSubmit/backTo survive direct v-bind. Default and overridden submits execute once.

### 6. Delete unused identity/runtime language and update consumers

Delete unused `checkIdentityDeclaration` and its private key-list helper. Remove `ResourceOperationRuntime` and `useResourceOperationRuntime` aliases when they are identical to the real runtime. Replace imports with the single owner; keep still-used identity-value validation. Remove old command overloads, resource prop allowlists, and context promises from current docs rather than adding compatibility paths.

**Verify:** Architecture, Tooling, Unit and type gates. `rg -n 'checkIdentityDeclaration|splitCustomContext|useResourceOperationRuntime|ResourceOperationRuntime' packages/loom/src apps/web/src` has no executable matches. Review the diff for retained guards hidden behind renamed wrappers.

## Test plan

Extend boundResource and route/access tests with immutable scalar/composite bindings, conflicting load contexts, null/string permission crossed with row allow/deny, result identity independent of routes, and command argument tuple preservation. Add source-backed View parity fixtures, resource declaration type fixtures, and direct extracted-operation browser cases. Do not claim a client policy test proves backend authorization.

## Done criteria

- [ ] Bound identity is owned by the binder and cannot be redirected by caller mutation.
- [ ] Null permission still evaluates row policy; denied operations dispatch nothing.
- [ ] Custom context uses withContext; arity and payload-shape guessing are absent.
- [ ] Malformed successful mutation results trigger invalidation and a non-retryable post-write error, never automatic redispatch.
- [ ] Resource declarations cover complete canonical View props and preserve extracted operation policies.
- [ ] Dead identity declaration and identical runtime aliases are removed.
- [ ] Scoped unit/browser/type gates pass with exact executed commands, counts, skips, and exit status recorded.
- [ ] Only scoped owners, dependent callers, tests, current documentation, and plan status changed; review `git diff --check` and `git diff --stat`.
- [ ] No compatibility alias, fallback to a removed contract, public `any` facade, or type-suppression escape was added.

## STOP conditions

Stop if existing custom command consumers cannot be migrated without changing their business payload, identity snapshots would lose supported composite identity types, or a proposed repair requires server authorization changes. Preserve the backend contract and report the conflicting caller. Unexpected access-adapter handling of absent metadata requires a source-backed regression before changing it.

Do not improvise a new backend contract or suppress a required check. Report a repeated verification failure after two targeted repair attempts. A missing browser, dependency, database, or storage prerequisite blocks that gate rather than justifying a stubbed substitute.

## Maintenance

Keep operation policy at execution, identity at binding, and page presentation in Views. New View props become available to resource declarations through their shared contract, not a second forwarding checklist. Adding a custom command must not add any argument-introspection convention.


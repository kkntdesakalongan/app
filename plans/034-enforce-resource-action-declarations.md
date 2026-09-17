# Plan 034: Enforce resource action declarations

Follow the steps in order. Run each check. Record the result before the next
step. This file contains the implementation contract; no conversation context
is required. Update this plan's row in `plans/README.md` after review.

## Status

- Priority: P1
- Effort: M
- Risk: MED — declaration checks become stricter and custom calls gain managed
  client permission checks.
- Confidence: HIGH — source inspection and compiler probes confirmed the gaps.
- Depends on: none
- Category: correctness, type safety
- Planned at: `9d5f03e`, 2026-09-17
- Revised at: `f4ef560`, 2026-09-18
- Status: TODO

## Why this matters

The compiler accepts `permisson` inside a standard action. The runtime ignores
it and treats an absent permission as `null`. Correctness must not depend on an
agent finding invalid options inside a standard action.

An action named `udpate` is different: it is a valid custom action name. Keep
the current architecture in which `list`, `detail`, `create`, `update`, and
`delete` use the supported framework paths, while every other action name is a
developer-defined custom action. The API remains responsible for server
authorization; this plan makes no claim of a server access bypass.

Custom actions currently return their raw `run` function. Their callers must
know separate permission-store conventions and can call `run` without any
framework check. Put the client permission rule on the custom action itself.
The obvious `resource.actions.name.run(...)` call must check that rule before it
calls application code. This is a client capability guard; server authorization
remains authoritative.

## Current state

- `packages/loom/src/resources/defineResource.ts:15` infers `TActions` through
  a generic constraint. Extra action properties survive that constraint.
- `packages/loom/src/resources/actionResource.ts:145` defines:

  ```ts
  export type ResourceCustomAction = { run: (...args: any[]) => any }
  // ResourceActionDefinitions ends with:
  } & Record<string, ResourceCustomAction>
  ```

- `actionResource.ts:247` extracts custom actions from non-standard keys.
  At line 657 it constructs their returned `run` objects without permission
  metadata or a capability check.
- `actionResource.ts:441` uses `declaration.permission ?? null`.
- `packages/loom/src/resources/__type-tests__/resource-actions.type-test.ts`
  shows the desired inference: `resource.actions.verify.run('1', 'approved')`.
- `packages/loom/src/resources/__tests__/resources.spec.ts:47` supplies a
  complete standard resource and a custom `verify` action. Match its Vitest
  setup and `afterEach` runtime cleanup.
- Two application resources declare custom `set` actions in the same `actions`
  map as their standard actions:
  `apps/web/src/routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.resource.ts`
  and `apps/web/src/routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.resource.ts`.
- These resources are in the users, roles, and permissions modules that ship in
  the Carta template. They are the complete current template migration for
  custom action declarations and callers.
- Their route components check permission stores before they call `set.run`.
  Role assignment requires both create and delete permissions. Role permission
  selection chooses create or delete permission from the next assigned state.
  These are the direct consumers to move to the resource action seam.
- Standard action permission checks control standard presentation and selected
  helpers. Direct standard `run` calls are not generally blocked. This plan does
  not change standard action execution.

The repository uses Vue, TypeScript, pnpm, Vitest, and `vue-tsc`. Type test files
under `__type-tests__` are included in Loom's normal type check. Use
`// @ts-expect-error <reason>` immediately above a deliberately invalid expression.
An unused directive must fail the check. Match single quotes, no semicolons,
and the current public export files.

## Target contract

Preserve this declaration shape:

```ts
defineResource(schema, {
  key: 'records',
  actions: {
    list: { run: list, fields: [fields.name] },
    verify: { run: verify, permission: 'verify-records' },
    udpate: { run: udpate, permission: null },
  },
})
```

1. `actions` remains required. Empty `actions` is valid.
2. `list`, `detail`, `create`, `update`, and `delete` are standard action names
   and use their existing framework contracts. Every other string key is a
   valid custom action name, including a name that resembles a misspelling such
   as `udpate`.
3. Each custom action entry contains exactly `run` and `permission`. Permission
   is required. Use `null` for an intentionally open custom action.
4. A custom permission is a nonempty string, a nonempty readonly string array
   whose entries are all required, `null`, or a synchronous resolver over the
   exact `run` argument tuple that returns one of those values. Do not add route
   semantics to custom actions.
5. Return `resource.actions.verify.can(...)` and
   `resource.actions.verify.run(...)`. Both use the same exact argument tuple.
   `run` preserves the declared return type.
6. `can(...)` resolves the permission and checks it through the installed access
   adapter with the custom action name as the operation. `run(...)` calls the
   same check and throws before the application callback when access is denied.
   Do not rely on callers to call `can` first.
7. Keep `resource.permissions` as standard-action metadata. Custom permissions
   can depend on arguments and remain owned by `resource.actions[name]`.
8. Reject unknown keys at the definition level and within standard and custom
   action objects, including variables and object spreads whose types retain
   those keys. An unknown action name is a custom action, not an error. Standard
   options remain the options of the existing interfaces.
9. Preserve inferred callback input types, return types, action presence,
   route-name checks, and supplied route-parameter checks. Keep route parameters
   partial: parent route context is intentional in Plans 031–032.
10. Keep omitted standard permissions and explicit `null` behavior unchanged.
   Delete still requires an explicit permission. Do not require new standard
   permissions.
11. At runtime, reject unknown definition and action-option keys, malformed
   action objects, non-function `run`, and invalid permission declarations before
   route registration has side effects. Validate a permission resolver result
   when `can` or `run` uses it. Validate a non-standard action as a custom action;
   do not reject it because of its name. Name the resource, action, and invalid
   property in the error when they apply. Do not log arguments or record data.

## Scope

Modify only these owners and their direct declaration consumers:

- `packages/loom/src/resources/defineResource.ts`
- `packages/loom/src/resources/actionResource.ts`
- `packages/loom/src/contracts/access.ts`
- `packages/loom/src/resources/index.ts` if a public type export changes
- Resource type tests and runtime tests under `packages/loom/src/resources/`
- Existing Loom tests that declare custom actions
- The two application resource files named above
- Their two route components and focused route tests
- `apps/web/src/framework/adapters/bundle.ts` only if the widened custom
  operation type needs a type-only correction; do not change its standard logic
- `packages/loom/README.md` and
  `docs/architecture/web-application-architecture.md`: update the custom action
  declaration, `can`, and guarded `run` contract
- This plan and its status row

Before editing, find direct callers with
`rg -n 'defineResource\(|actions\.[A-Za-z]+\.run' apps/web/src packages/loom/src`.
Use them as regression inputs. Do not move or rename their custom declarations.
Move the two direct callers from permission-store checks to their custom
action's `can(...)`. If another direct caller relies on an invalid standard
option or an extra custom action property, record it in this plan before changing
that caller. The current module generator creates standard actions only. Do not
change it unless this search finds a generated custom action.

Out of scope: a separate `customActions` declaration map, API or server
authorization changes, new permission codes, database work, UI layout, standard
action execution changes, skills, route generation changes, dependencies,
publishing, and a generic exact-object utility used throughout the repository.

## Commands

Run from the repository root. Dependencies already exist; do not install them.

| Name | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat f4ef560..HEAD -- packages/loom apps/web/src` | Review changed owners before editing |
| Local work | `git status --short` | Preserve unrelated changes |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0; negative type tests are used |
| Resource tests | `pnpm --filter @southneuhof/loom test src/resources/__tests__/resources.spec.ts src/fields/__tests__/defineFields.spec.ts` | All selected tests pass |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; generated route file has no unexplained diff |
| Custom action tests | `pnpm --filter @southneuhof/framework-web test 'routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.route.spec.ts' 'routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.route.spec.ts'` | Both selected files pass |
| Web tests | `pnpm --filter @southneuhof/framework-web test` | All unit tests pass; no browser task |
| Loom suite | `pnpm --filter @southneuhof/loom test` | All non-browser tests pass |
| Whitespace | `git diff --check` | Exit 0 |

For changed application files, run `pnpm --filter @southneuhof/framework-web
lint:focused -- '<path relative to apps/web>'` with each changed file as an
argument. The Loom package has no lint script; do not invent one. These are
source changes, so no build or deployment is required.

## Steps

### 1. Establish the failing compiler cases

Run Drift, Local work, Types, and Resource tests. At planning time Loom Types
passed and the five related test files passed 50 tests. A new baseline failure
must be recorded separately.

Extend `resource-actions.type-test.ts`. Add invalid literals and named variables
for `permisson`, `pageSze`, an option valid on another standard action, an extra
top-level option, and an extra custom action property. Add valid declarations
for every standard action and valid custom actions named `verify` and `udpate`.
Add invalid custom actions with missing permission, empty permission strings,
empty permission arrays, invalid permission values, and permission resolvers
with wrong arguments or returns. Use actual field references and schema types
from the existing fixture. No casts or `any` in compiler acceptance cases.

Verify with Types: before the fix, new negative cases produce unused
`@ts-expect-error` diagnostics. Confirm each diagnostic is on the intended case,
not an import or fixture error.

### 2. Enforce exact option keys in the existing action map

Keep standard and custom declarations together in `actions`. Replace the broad
intersection constraint with a small mapped guard over the inferred action map.
For each standard name, compare its keys with the matching existing action
interface. For each other name, compare its keys with the custom action contract.
Map extra keys to `never`. Infer a custom permission resolver from its `run`
argument tuple. Preserve custom function inference in the return type.

Apply the same exactness check to the inferred outer definition. A constraint
alone or `satisfies` only at callers is not a fix. Do not recursively close
application records, initial data, or route parameter objects with a universal
deep-exact helper.

Keep contextual typing for `run`, `visible`, `route.params`, and `defaultTo`.
Add positive inference checks that use these callback parameters without
annotations. Prove that `udpate` and `verify` keep their exact custom `run`
arguments and returns and that `can` accepts the same arguments. Do not replace
inference with caller-provided generic arguments.

Verify with Types and Web types: exit 0. Wrong custom call arguments and wrong
standard returns must still fail their negative tests.

### 3. Reject invalid runtime declaration shapes

Before registering routes, validate the whole definition. Use own enumerable
keys and per-standard-action allowed-key tables. Type the tables against the
action interfaces and add a type assertion for exhaustive key coverage so that
a new interface property cannot silently be omitted from runtime validation.
For each non-standard action name, allow only `run` and `permission`.

Reject arrays/null where action maps or entries are required. Check `run` and
static permission declarations. Check all entries before registering any route.
Do not call a custom permission resolver during construction. Keep construction
validation separate from running application code: it must not call `run`,
permission resolvers, `visible`, loaders, validators, or route parameter
functions.

Runtime negative tests may use one explicit test-only cast at the call boundary
to represent JavaScript input. Assert that a bad later action leaves the route
registry unchanged and that no application callback ran. Test each target rule,
including missing delete permission and permitted `null`. Add a positive runtime
test that a custom action named `udpate` is accepted and returned through
`resource.actions.udpate`.

Verify with Resource tests and Types: exit 0. Existing route and access tests pass.

### 4. Put custom permission checks on the action seam

Build each returned custom action with `can` and a wrapped `run`. Resolve a
static or argument-dependent permission once per call. For a permission array,
require every entry through the access adapter. Use the custom action name as
the access operation. An explicit `null` returns true without an adapter denial.

The wrapped `run` must call the same capability check. On denial, throw
`[loom] Resource "<key>" action "<name>" is not allowed.` before the declared
`run` callback starts. Preserve synchronous and asynchronous return types. Do
not catch or rewrite application errors.

Add focused type and runtime proof for:

- Static string, string array, resolver, and explicit `null` permissions.
- Exact resolver and `can` arguments.
- Allowed `run` calls the application callback once.
- Denied `run` does not call the callback.
- A malformed resolver result fails before the callback.
- Permission error messages do not contain action arguments.

Verify with Resource tests and Types.

### 5. Migrate the existing Carta template modules

Declare both existing `set` permissions on their resource actions. Preserve the
current role-assignment rule that requires both create and delete permissions.
Preserve the role-permission rule that selects create or delete permission from
the requested assigned state.

Replace direct permission-store checks in both route components with
`resource.actions.set.can(...)`. Keep pending-state checks, calls, invalidation,
toasts, labels, and server requests unchanged. The `run` wrapper remains the
final guard if a caller forgets the UI check.

Update the Loom README and web architecture document. Remove the statement that
custom actions are plain functions. Show that custom actions require an explicit
permission or `null`, expose `can(...)`, and check again in `run(...)`. Keep the
API as the final authorization boundary.

The other users, roles, and permissions resources contain only standard actions.
They need no declaration change, but Web types and Web tests must verify them as
part of the template baseline. Do not add custom actions or permissions to those
modules.

Verify with Web types, Custom action tests, and focused lint for the four changed
application files.

### 6. Finish and review

Run all command gates, including both unit suites. Inspect `git diff` and the
original dirty state. The worktree was clean before this revision. Record test
results and update the index only after review passes.

Verify with Whitespace and Local work: only planned changes were added.

## Done criteria

- [ ] All command gates pass, with selected test counts recorded.
- [ ] Negative tests reject unknown definition keys and action-option keys in
      literals, variables, and spreads.
- [ ] Custom calls retain exact argument and return inference.
- [ ] Arbitrary custom action names, including `udpate`, remain in `actions` and
      work through `resource.actions`.
- [ ] Every custom action declares an explicit managed permission or `null`.
- [ ] Custom `can` and `run` use the same permission rule and exact arguments.
- [ ] A denied custom `run` cannot call application code.
- [ ] Current custom callers contain no duplicate permission-store rules.
- [ ] Both custom actions in the Carta template are migrated, and the other
      template resource declarations still pass the web type check.
- [ ] Loom and architecture documents describe the new custom permission shape.
- [ ] Runtime rejection happens before route registration or application calls.
- [ ] Existing route-name and partial-parameter tests still pass.
- [ ] No separate custom declaration map or compatibility path is added.
- [ ] Source diff stays in scope; index status includes review and checks.

## STOP conditions

Stop and report if the baseline fails in an unrelated owner, a proposed change
would alter server authorization or a current permission decision, or inference
can only be recovered by `any`, a broad overload, or caller casts. If an owner
changed since the planned commit, compare it with the excerpts before proceeding.
Stop on a material contract difference. Also stop if exact standard option
checks require restricting the names available for custom actions, or if custom
permission management requires changing standard action execution. After two
failed attempts at the same check, report the remaining diagnostic.

## Maintenance

When adding a standard option, update its interface and runtime allowed-key
table in the same change. Keep tests for callback inference beside rejection
tests. A name becomes standard only when its interface and framework behavior
are added explicitly; all other names remain custom. Custom actions are explicit
functions with an explicit client permission contract; this plan does not
introduce a custom workflow engine. Keep server authorization authoritative. Do
not commit, push, publish, or deploy unless requested.

# Plan 034: Enforce resource action declarations

Follow the steps in order. Run each check. Record the result before the next
step. This file contains the implementation contract; no conversation context
is required. Update this plan's row in `plans/README.md` after review.

## Status

- Priority: P1
- Effort: M
- Risk: MED — public declaration shape changes; custom calls must retain their types.
- Confidence: HIGH — source inspection and compiler probes confirmed the gaps.
- Depends on: none
- Category: correctness, type safety
- Planned at: `9d5f03e`, 2026-09-17
- Status: TODO

## Why this matters

The compiler accepts `permisson` inside a standard action. The runtime ignores
it and treats an absent permission as `null`. It also accepts `udpate` as a
custom action. Correctness must not depend on an agent finding these errors.
Reject invalid declarations in the framework. The API remains responsible for
server authorization; this plan makes no claim of a server access bypass.

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
  At line 657 it constructs their returned `run` objects.
- `actionResource.ts:441` uses `declaration.permission ?? null`.
- `packages/loom/src/resources/__type-tests__/resource-actions.type-test.ts`
  shows the desired inference: `resource.actions.verify.run('1', 'approved')`.
- `packages/loom/src/resources/__tests__/resources.spec.ts:47` supplies a
  complete standard resource and a custom `verify` action. Match its Vitest
  setup and `afterEach` runtime cleanup.
- Two application resources declare custom `set` actions:
  `apps/web/src/routes/(authenticated)/settings/users/[userId]/detail/role-assignments/role-assignments.resource.ts`
  and `apps/web/src/routes/(authenticated)/settings/roles/[roleId]/detail/permissions/role-permissions.resource.ts`.

The repository uses Vue, TypeScript, pnpm, Vitest, and `vue-tsc`. Type test files
under `__type-tests__` are included in Loom's normal type check. Use
`// @ts-expect-error <reason>` immediately above a deliberately invalid expression.
An unused directive must fail the check. Match single quotes, no semicolons,
and the current public export files.

## Target contract

Use this declaration shape. This is a required API decision, not an example
of several options:

```ts
defineResource(schema, {
  key: 'records',
  actions: {
    list: { run: list, fields: [fields.name] },
  },
  customActions: {
    verify: { run: verify },
  },
})
```

1. `actions` remains required and contains only `list`, `detail`, `create`,
   `update`, and `delete`. Empty `actions` is valid.
2. `customActions` is optional. Each entry contains only `run`. Reject standard
   action names in this map. Do not add permission or routing semantics to it.
3. Preserve the returned `resource.actions.verify.run(...)` API. Preserve its
   exact argument tuple and return type. There is no old declaration alias.
4. Reject unknown keys at the definition level and within standard and custom
   action objects, including variables and object spreads whose types retain
   those keys. Standard options remain the options of the existing interfaces.
5. Preserve inferred callback input types, return types, action presence,
   route-name checks, and supplied route-parameter checks. Keep route parameters
   partial: parent route context is intentional in Plans 031–032.
6. Keep omitted standard permissions and explicit `null` behavior unchanged.
   Delete still requires an explicit permission. Do not require new permissions.
7. At runtime, reject unknown declaration keys, unknown standard action names,
   malformed action objects, non-function `run`, invalid permission values,
   and reserved custom action names before route registration has side effects.
   Name the resource, action, and invalid property in the error. Do not log data.

## Scope

Modify only these owners and their direct declaration consumers:

- `packages/loom/src/resources/defineResource.ts`
- `packages/loom/src/resources/actionResource.ts`
- `packages/loom/src/resources/index.ts` if a public type export changes
- New `packages/loom/src/resources/actionDefinition.ts` if needed for one shared
  type/runtime declaration check; keep it private
- Resource type tests and runtime tests under `packages/loom/src/resources/`
- Existing Loom tests that actually declare custom actions
- The two application resource files named above
- `packages/loom/README.md` and `docs/architecture/web-application-architecture.md`:
  update only the custom declaration example and the declaration contract
- This plan and its status row

Before editing, find additional direct callers with
`rg -n 'defineResource\(|actions\.[A-Za-z]+\.run' apps/web/src packages/loom/src`.
An additional caller is in scope only for moving its existing custom declaration.
Record that file in this plan before editing it. Leave its function and call sites
unchanged. Framework test fixtures may need the same mechanical change.

Out of scope: API code, business rules, database work, UI layout, skills,
permission policy changes, route generation changes, dependencies, publishing,
and a generic exact-object utility used throughout the repository.

## Commands

Run from the repository root. Dependencies already exist; do not install them.

| Name | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat 9d5f03e..HEAD -- packages/loom apps/web/src docs/architecture/web-application-architecture.md` | Review changed owners before editing |
| Local work | `git status --short` | Preserve unrelated changes |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0; negative type tests are used |
| Resource tests | `pnpm --filter @southneuhof/loom test src/resources/__tests__/resources.spec.ts src/fields/__tests__/defineFields.spec.ts` | All selected tests pass |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; generated route file has no unexplained diff |
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
for `permisson`, `pageSze`, an option valid on another action, `udpate`, an extra
top-level option, and an extra custom action property. Add valid declarations
for every standard action. Use actual field references and schema types from
the existing fixture. No casts or `any` in compiler acceptance cases.

Verify with Types: before the fix, new negative cases produce unused
`@ts-expect-error` diagnostics. Confirm each diagnostic is on the intended case,
not an import or fixture error.

### 2. Separate custom declarations and enforce exact option keys

Remove the standard map's arbitrary-string index signature. Infer standard and
custom maps separately. Add a default empty custom generic to public resource
types where necessary. Preserve custom function inference in the return type.

Use a small mapped guard over the actual inferred declaration keys. For each
standard action, compare its keys with the matching existing action interface;
map extra keys to `never`. Apply the same check to the inferred outer object
and each custom entry. A constraint alone or `satisfies` only at callers is not
a fix. Do not recursively close application records, initial data, or route
parameter objects with a universal deep-exact helper.

Keep contextual typing for `run`, `visible`, `route.params`, and `defaultTo`.
Add positive inference checks that use these callback parameters without
annotations. Do not replace inference with caller-provided generic arguments.

Move custom declarations in the listed fixtures and application owners into
`customActions`. Build returned custom actions from that map. Preserve calls.

Verify with Types and Web types: exit 0. Wrong custom call arguments and wrong
standard returns must still fail their negative tests.

### 3. Reject invalid runtime declaration shapes

Before registering routes, validate the whole definition. Use own enumerable
keys and per-action allowed-key tables. Type the tables against the action
interfaces and add a type assertion for exhaustive key coverage so that a new
interface property cannot silently be omitted from runtime validation.

Reject arrays/null where action maps or entries are required. Check `run` and
permission values. Check all entries before registering any route. Keep this
validation separate from running application code: it must not call `run`,
`visible`, loaders, validators, or route parameter functions.

Runtime negative tests may use one explicit test-only cast at the call boundary
to represent JavaScript input. Assert that a bad later action leaves the route
registry unchanged and that no application callback ran. Test each target rule,
including missing delete permission and permitted `null`.

Verify with Resource tests and Types: exit 0. Existing route and access tests pass.

### 4. Finish the migration and review

Update the two documentation examples. Run all command gates, including both
unit suites. Inspect `git diff` and the original dirty state. At planning time,
the vendor registration detail route was already modified and
`plans/admin-vendor-applications/` was untracked; neither belongs to this plan.
Record test results and update the index only after review passes.

Verify with Whitespace and Local work: only planned changes were added.

## Done criteria

- [ ] All command gates pass, with selected test counts recorded.
- [ ] Negative tests reject unknown keys in literals, variables, and spreads.
- [ ] Custom calls retain exact argument and return inference.
- [ ] Runtime rejection happens before route registration or application calls.
- [ ] Existing route-name and partial-parameter tests still pass.
- [ ] All direct custom declarations use `customActions`; no compatibility path remains.
- [ ] Source diff stays in scope; index status includes review and checks.

## STOP conditions

Stop and report if the baseline fails in an unrelated owner, a proposed change
would alter server authorization or custom action execution, or inference can
only be recovered by `any`, a broad overload, or caller casts. If an owner changed
since the planned commit, compare it with the excerpts before proceeding. Stop
on a material contract difference, not on expected mechanical caller movement.
After two failed attempts at the same check, report the remaining diagnostic.

## Maintenance

When adding a standard option, update its interface and runtime allowed-key
table in the same change. Keep tests for callback inference beside rejection
tests. Custom actions are explicit functions; this plan does not introduce a
custom workflow engine. Do not commit, push, publish, or deploy unless requested.

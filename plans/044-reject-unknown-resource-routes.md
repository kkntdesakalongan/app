# Plan 044: Reject unknown resource routes at the app seam

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat 2d6b378..HEAD -- apps/web/src/framework/hono/actions.ts apps/web/src/framework/hono/actions.spec.ts packages/sdk/src/__tests__/client.spec.ts scripts/scaffold-bounded-module.mjs scripts/scaffold-bounded-module.test.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 042 (contract present, so the check runs against real
  types instead of `unknown`)
- **Category**: correctness, tests
- **Planned at**: commit `2d6b378`, 2026-09-19

## Why this matters

Even with the contract present, the failure for a wrong `rpc` key is a long
generic TS2339 against an intersection of 20+ routes. An agent reads that as
noise and may widen a type or cast instead of fixing the key. The app seam
`createHonoResourceActions` (`apps/web/src/framework/hono/actions.ts:33`)
also trusts whatever it receives: it casts to `RuntimeRoute` with no check,
so a structurally close-but-wrong object fails deep inside a fetch, not at
the call. This plan adds a fail-fast runtime guard plus regression tests that
name the rule in one line: the first segment must be the kebab-case route dir,
`rpc['kebab-case']`. Verified during planning: with the contract present the
compiler already rejects `rpc.coffeeSales` (TS2339, proved against a scratch
probe); the missing piece is the readable guard and the committed tests.

## Current state

- `apps/web/src/framework/hono/actions.ts:6-13` defines `RuntimeRoute`
  (`list`/`detail`/`create`/`update`/`delete` with `$get`/`$post`/`$patch`/`$delete`)
  and `actions.ts:33-34` casts the input with no validation:

  ```ts
  export function createHonoResourceActions<const TRoute>(route: TRoute): HonoResourceActions<TRoute> {
    const source = route as TRoute & RuntimeRoute
  ```

- Test exemplar `actions.spec.ts:30-59` builds a real in-memory `Hono` app
  and drives `createHonoResourceActions(rpc.rows)` through list/detail/
  create/update/delete, asserting normalized output, query serialization, and
  error payload passthrough. New tests go in this file in the same style.
- SDK type-test exemplar `packages/sdk/src/__tests__/client.spec.ts:6-15`
  asserts the exact client shape (`client.users.list.$get`,
  `client.api.auth['sign-out'].$post`, ...). New hyphen assertions go here.
- Scaffold already emits the correct shape in all three places
  (`scripts/scaffold-bounded-module.mjs:533,615,656`): always
  `rpc['${config.slug}']` with the kebab-case slug. The generator test at
  `scaffold-bounded-module.test.mjs:144` asserts the schema form. No
  scaffold change is needed; plan scope covers tests only plus the guard.
- Live web call sites: no `rpc.camelCase` dot access exists today
  (grep `rpc\.[A-Za-z_$][\w$]*[A-Z]` returns zero matches); single-word
  routes use `rpc.roles`, `rpc.users`, `rpc.permissions`, hyphenated routes
  use bracket form (`rpc.files['presigned-url']`, `rpc.api.auth['sign-in']`).
  The guard must accept all of these and reject only unknown shapes.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Web unit tests | `pnpm --filter @southneuhof/framework-web exec vitest run src/framework/hono/actions.spec.ts` | all pass |
| Web type-check | `pnpm --filter @southneuhof/framework-web type-check` | exit 0 |
| SDK tests | `pnpm --filter @southneuhof/sdk exec vitest run src/__tests__/client.spec.ts` | all pass |
| Scaffold tests | `node --test scripts/scaffold-bounded-module.test.mjs` (from root) | all pass |
| Diff hygiene | `git diff --check` | exit 0, no output |

Run from the repository root unless noted. No database needed.

## Scope

**In scope** (the only files you may create or modify):

- `apps/web/src/framework/hono/actions.ts` (add the guard only)
- `apps/web/src/framework/hono/actions.spec.ts` (two new tests)
- `packages/sdk/src/__tests__/client.spec.ts` (hyphenated-path assertions)
- `scripts/scaffold-bounded-module.test.mjs` (assert `resource.ts` + edit-route
  templates emit `rpc['<slug>']` bracket form)

**Out of scope** (do NOT touch, even though they look related):

- `packages/sdk/src/client.ts` contract types — already correct.
- `packages/sprindle/**` route scanning — path rule already correct.
- Any `apps/web/src/routes/**` application module.
- The boundary spec `route-resource-boundary.spec.ts` — static camelCase
  lint is deliberately NOT this plan (type-check already rejects it).

## Git workflow

- Branch: `advisor/044-resource-route-guard`
- Message style is plain imperative, e.g. `Reject unknown resource routes at the app seam`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the fail-fast guard in createHonoResourceActions

In `apps/web/src/framework/hono/actions.ts`, immediately after the
`const source = ...` line, insert a validation block (keep it under 15
lines, same terse style as `wireQuery`/`wireIdentity`):

```ts
const shape = source as Partial<RuntimeRoute> | undefined
const has = (node: unknown, method: string) =>
  !!node && typeof (node as Record<string, unknown>)[method] === 'function'
if (
  !shape || !has(shape.list, '$get') || !has(shape.detail?.[':id'], '$get') ||
  !has(shape.create, '$post') || !has(shape.update?.[':id'], '$patch') ||
  !has(shape.delete?.[':id'], '$delete')
) throw new Error('Unknown resource route. Use the kebab-case route key: rpc[\'<route-dir>\'].')
```

Rules for the guard prose and behavior:

- The error message MUST contain the literal `rpc['<route-dir>']` hint.
- The guard checks structure, not names: it accepts single-word (`rpc.roles`),
  hyphenated first segments (`rpc.files`), and nested routes. It rejects
  `undefined`, `{}`, and objects missing any of the five standard endpoints.
- It must not change any happy-path behavior: all existing `actions.spec.ts`
  tests pass unmodified.
- AGENTS.md rule 8 allows this: it is the required invariant at the seam,
  not a compatibility alias.

**Verify**: existing spec still passes:
`pnpm --filter @southneuhof/framework-web exec vitest run src/framework/hono/actions.spec.ts` → all pass.

### Step 2: Add the two regression tests

In `apps/web/src/framework/hono/actions.spec.ts`, in the existing
`describe('createHonoResourceActions')` block, add:

1. `rejects an unknown resource route with a kebab-case hint`: call
   `createHonoResourceActions(undefined)` and
   `createHonoResourceActions({})`, expect both to throw with a message
   matching `/kebab-case|rpc\[/`. Also pass a near-miss object that has
   `list` but no `detail` and expect the same throw.
2. `accepts hyphenated first segments`: build the same in-memory Hono app
   mounted at `/coffee-variants/list` etc. (or reuse `rpc.rows` plus a
   hyphen-keyed wrapper object shaped like `rpc['coffee-variants']`) and
   assert `list` resolves. The point is the guard does not reject
   legitimate bracket-form routes.

Follow the file's existing `hc<typeof app>(...)` construction pattern.

**Verify**: same vitest command → all pass including the 2 new tests.

### Step 3: Lock hyphenated paths in the SDK type test

In `packages/sdk/src/__tests__/client.spec.ts`, extend the `keeps model and
bare Hono client paths` test with hyphenated-shape assertions against the
real contract. The current template has no hyphenated route, so assert on
the existing hyphenated leaves that the route scan guarantees verbatim
(`route-files.ts:53` preserves `-`):

```ts
expect(client.files['presigned-url'].$post).toBeTypeOf('function')
expect(client.api.auth['sign-in'].email.$post).toBeTypeOf('function')
```

And extend the negative block in `proofCalls` with:

```ts
// @ts-expect-error camelCase must not exist: the path segment keeps its hyphen
proofClient.files.presignedUrl.$post()
```

If either assertion fails against the live contract (e.g. route renamed),
STOP and report rather than inventing a route name.

**Verify**: `pnpm --filter @southneuhof/sdk exec vitest run src/__tests__/client.spec.ts` → all pass.

### Step 4: Assert the scaffold bracket form

In `scripts/scaffold-bounded-module.test.mjs`, beside the existing line-144
schema assertion, add two assertions using the same `assert.match` style and
the existing `test-catalog` config (`slug: 'test-catalog'`):

- the rendered resource file contains
  `createHonoResourceActions(rpc['test-catalog'])`;
- the rendered technical-detail edit route contains the same bracket form.

Use the file's existing `applyBoundedModule`/`workspace` helpers; do not add
new fixtures.

**Verify**: `node --test scripts/scaffold-bounded-module.test.mjs` (from
repo root) → all pass.

### Step 5: Run the surrounding gates

- `pnpm --filter @southneuhof/framework-web type-check` → exit 0.
- `git diff --check` → exit 0.
- `git status --short` → only the four in-scope files.

## Test plan

- `actions.spec.ts`: 2 new tests (unknown-shape throw with hint; hyphenated
  accept). Pattern: the file's own in-memory Hono tests.
- `client.spec.ts`: hyphen positive assertions + one camelCase
  `@ts-expect-error` negative. Proves the compiler rejects the exact mistake.
- `scaffold-bounded-module.test.mjs`: 2 new `assert.match` checks that the
  generator only emits bracket form.
- No new E2E, browser, or database tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `actions.spec.ts` passes with 2 new tests; unknown shapes throw the hinted error
- [ ] `client.spec.ts` passes with hyphen assertions and the camelCase negative
- [ ] Scaffold tests pass with bracket-form assertions on resource + edit route
- [ ] Web `type-check` exits 0; `git diff --check` exits 0; status shows only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live files.
- The guard breaks any existing happy-path test (the shape check is too
  strict — report, do not widen call sites).
- The SDK hyphen route names in Step 3 do not exist in the live contract.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- The guard is structural, not a route registry: adding a new route needs no
  guard change as long as it keeps the five standard endpoints.
- If a resource legitimately drops an endpoint (read-only routes), the guard
  must be revisited — that is a design decision, not a silent widening.
- Future reviewers: a `try/catch` around this guard or an `as` cast past it
  is the exact anti-pattern this plan removes. Reject it.

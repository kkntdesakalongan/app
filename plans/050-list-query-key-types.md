# Plan 050: Type list query keys and support default order

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat fd53981..HEAD -- packages/sprindle/src/routes/definition.ts packages/sprindle/src/hono/file-routes.ts packages/sprindle/src/source/drizzle-source.ts packages/sprindle/src/model/domain-schema.ts packages/sprindle/src/routes/__tests__/list-policy.spec.ts packages/sprindle/src/source/__tests__/read-contract.spec.ts packages/sprindle/src/__tests__/route-schema.spec.ts .agents/skills/api-conventions/references/standard-crud.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `fd53981`, 2026-09-19

## Why this matters

A forward test wrote `list({ query: { defaultSort: '-createdAt' } })` for a
sales history list. The `-` prefix is not a contract here: direction lives in
`order`, the column lives in `sort`. The type allows it (`defaultSort?: string`),
so the mistake survived type-check and lint and failed only at runtime with
`{"error":"validation_error","message":"Unknown sort column \"-createdAt\"."}`.

There is a second, quieter trap behind the same call. There is no `defaultOrder`,
so "newest first by default but still client-overridable" has no honest
expression. The fixed-order escape hatch (`read.pinnedOrder`) exists but ignores
client `sort`/`order` entirely, which is the wrong tool when the client should
stay free to re-sort. The next author will invent another prefix unless the
supported spelling exists and the keys are checked.

This plan types the four list-ordering keys against the entity (`defaultSort`,
`defaultOrder`, `enumFilters`, `searchColumns`) and adds the missing
`defaultOrder` policy. After it lands, the exact forward-test mistake is a
compile error, not a runtime 400.

## Current state

Files and roles:

- `packages/sprindle/src/routes/definition.ts:56-60` — `DefineFileList` query
  policy. `defaultSort` is a bare `string`; there is no `defaultOrder`:

  ```ts
  export type DefineFileList<TParent extends ScopeView, TParams extends RouteParameters> = (config?: FilePipeline<FileRouteArgs<TParams, TParent['context'], ListState, TParent['identity']>> & {
    query?: { defaultSort?: string; enumFilters?: Record<string, readonly string[]> }
  ```

- `packages/sprindle/src/hono/file-routes.ts:226` — policy fill. Only
  `defaultSort` is applied; `order` always carries the schema default (`asc`)
  by the time the policy runs, so a default direction cannot be expressed:

  ```ts
  if (route.kind === 'list') { const query = listQuerySchema.parse(normalizeListQuery(args.c.req.query())); const policy = config.query as { defaultSort?: string; enumFilters?: Record<string, readonly string[]> } | undefined; if (policy?.defaultSort && (query.sort == null || query.sort === '')) query.sort = policy.defaultSort; ...
  ```

- `packages/sprindle/src/validation/common-schemas.ts:4-13` — wire query.
  `order` defaults to `'asc'`; `sort` is an unchecked string:

  ```ts
  export const listQuerySchema = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().optional(),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).default('asc'),
    })
  ```

- `packages/sprindle/src/source/drizzle-source.ts:61-65` — entity read config.
  `searchColumns` is `string[]`, unchecked at authoring time (checked per
  request at `drizzle-source.ts:111-116`, which throws
  `Unknown search column "<key>"`):

  ```ts
  export type CreateDrizzleSourceRead = {
    pinnedOrder?: SQL[] | ((columns: AliasSafeColumns) => SQL[])
    searchColumns?: string[]
    virtual?: Record<string, CreateDrizzleSourceVirtualParam>
  }
  ```

- `packages/sprindle/src/source/drizzle-source.ts:295-299` — runtime sort
  check. This stays as the runtime backstop; the plan moves the failure to
  build time, it does not remove this:

  ```ts
  const order = query.order === 'desc' ? 'desc' : 'asc'
  const sort = pinnedOrder || query.sort == null || query.sort === '' ? undefined : String(query.sort)
  if (sort && !(sort in columns)) throw validationError(`Unknown sort column "${sort}".`)
  ```

- `packages/sprindle/src/model/domain-schema.ts:19-31,66-79` — `DomainEntity`
  and `createEntity` carry `read?: CreateDrizzleSourceRead`. The entity is the
  scope of every key this plan types.

- `.agents/skills/api-conventions/references/standard-crud.md:37-51` — skill
  table teaches the untyped spelling with no direction option:

  ```
  | Default order, enum filters | `list({ query: { defaultSort, enumFilters } })` |
  ...
  Built-in coercion and list parsing need no hook. Keep client-selectable default
  order distinct from mandatory `pinnedOrder`.
  ```

Conventions:

- Generated route helpers (`packages/sprindle/src/tooling/language.ts:113-118`)
  re-export `DefineFileList` from the definition file, so the new key type
  flows to app code with no tooling change. Run the tooling specs to prove it.
- Type-level negative tests use the `if (false) { // @ts-expect-error ... }`
  pattern — see `packages/sprindle/src/__tests__/route-schema.spec.ts:59-64`.
  Runtime list-policy tests use the in-memory fixture in
  `packages/sprindle/src/routes/__tests__/list-policy.spec.ts:15-31`
  (`buildApp(listConfig, observed)` plus `testApp(model)`).
- `pinnedOrder` (mandatory server order, ignores client `sort`/`order`) stays.
  `defaultSort` + `defaultOrder` (client-overridable default) is the new
  spelling for "newest first unless the client re-sorts". Do not conflate them.
- `virtual` param names stay `Record<string, ...>`: they are arbitrary query
  names, not entity keys. Out of scope by design.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sprindle type-check | `pnpm --filter @southneuhof/sprindle type-check` | exit 0 |
| Sprindle lint | `pnpm --filter @southneuhof/sprindle lint` | exit 0 |
| Focused Sprindle tests | `pnpm --filter @southneuhof/sprindle exec vitest run src/routes/__tests__/list-policy.spec.ts src/source/__tests__/read-contract.spec.ts src/__tests__/route-schema.spec.ts src/tooling/language.spec.ts src/tooling/manifest.spec.ts` | all pass |
| Full Sprindle suite | `pnpm --filter @southneuhof/sprindle test` | all pass |
| API type-check (caller proof) | `pnpm --filter @southneuhof/api type-check` | exit 0 |
| Diff hygiene | `git diff --check` | exit 0, no output |

Run from the repository root. No database needed for any command above.
`definition.ts` already has `import type { z } from 'zod'` (line 2); use it for
key extraction, do not add a runtime import.

## Scope

**In scope** (the only files you may create or modify):

- `packages/sprindle/src/routes/definition.ts` (key type + `defaultOrder`)
- `packages/sprindle/src/hono/file-routes.ts` (apply `defaultOrder`)
- `packages/sprindle/src/source/drizzle-source.ts` (`searchColumns` key type
  only; touch nothing else in this file)
- `packages/sprindle/src/model/domain-schema.ts` (thread the key type through
  `createEntity`/`DomainEntity` read config only if needed for assignability;
  prefer the narrowest change that keeps `bindDomainDatabase` compiling)
- `packages/sprindle/src/routes/__tests__/list-policy.spec.ts` (new runtime
  tests)
- `packages/sprindle/src/__tests__/route-schema.spec.ts` (new type tests)
- `.agents/skills/api-conventions/references/standard-crud.md` (one-row doc
  update plus two distinguishing lines)

**Out of scope** (do NOT touch, even though they look related):

- `packages/sprindle/src/testing/memory-source.ts` — `searchColumns` is
  already `(keyof TRecord & string)[]`. Leave it.
- `packages/sprindle/src/validation/common-schemas.ts` — wire `sort` stays a
  string; the wire accepts any client key and the source validates it at
  request time. Typing the wire would break open clients.
- `virtual` params, `pinnedOrder` semantics, filter coercion, pagination.
- `packages/sprindle/src/tooling/*` implementation — declarations flow through
  automatically; specs only.
- Any `apps/api` or `apps/web` module, the scaffold (emits no sort policy),
  Loom, the SDK, POS fixtures.
- E2E or browser tests.

## Git workflow

- Branch: `advisor/050-list-query-key-types`
- Commit per step. Plain imperative messages, e.g. `Type list query keys against the entity`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Type `DefineFileList` query keys and add `defaultOrder`

In `packages/sprindle/src/routes/definition.ts`, add a non-distributive key
alias above `DefineFileList` and use it in the `query` policy:

```ts
type ListQueryKey<TParent extends ScopeView<object, unknown>> =
  [TParent['entity']] extends [never]
    ? string
    : [TParent['entity']] extends [{ schemas: { select: infer TSelect } }]
      ? TSelect extends z.ZodType
        ? keyof z.output<TSelect> & string
        : string
      : string;
```

Then:

```ts
query?: {
  defaultSort?: ListQueryKey<TParent>;
  defaultOrder?: 'asc' | 'desc';
  enumFilters?: Partial<Record<ListQueryKey<TParent>, readonly string[]>>;
}
```

Rules:

- The `[never]` guard comes first: without it, an entity-less scope resolves
  the key to `never` and `list({})` stops compiling. Entity-less `list({})`
  must keep compiling exactly as today.
- `enumFilters` values stay `readonly string[]`; only keys are typed. Member
  validation stays runtime (the existing `file-routes.ts:226` loop).
- Do not type the wire schema; do not touch `enrich`, `run`, or other
  constructors.

**Verify**: `pnpm --filter @southneuhof/sprindle type-check` → exit 0.

### Step 2: Apply `defaultOrder` when the client sends none

In `packages/sprindle/src/hono/file-routes.ts`, in `createState` (line 226),
capture the normalized raw query so client-absent `order` is detectable
(`listQuerySchema` already defaulted it to `'asc'` by the time the policy
runs). Shape:

```ts
const raw = normalizeListQuery(args.c.req.query());
const query = listQuerySchema.parse(raw);
const policy = config.query as { defaultSort?: string; defaultOrder?: 'asc' | 'desc'; enumFilters?: Record<string, readonly string[]> } | undefined;
if (policy?.defaultSort && query.sort == null) query.sort = policy.defaultSort;
if (policy?.defaultOrder && raw.order == null) query.order = policy.defaultOrder;
```

Keep the existing `enumFilters` loop byte-identical. `defaultSort` keeps its
client-override behavior (client `sort` wins). `defaultOrder` follows the same
rule (client `order` wins). `before` hooks must observe the filled values, as
they already do for `sort` (see `list-policy.spec.ts:22-25`).

**Verify**: focused `list-policy.spec.ts` still passes unmodified:
`pnpm --filter @southneuhof/sprindle exec vitest run src/routes/__tests__/list-policy.spec.ts` → all pass.

### Step 3: Type `searchColumns` against the entity

Narrow `searchColumns` at authoring time. Keep the runtime
`Unknown search column` check in `drizzle-source.ts:111-116` untouched.

Constraints for the executor:

- `packages/sprindle/src/testing/memory-source.ts` already proves the target
  shape: `searchColumns?: (keyof TRecord & string)[]`.
- `CreateDrizzleSourceRead` is held by `DomainEntity.read` and passed to
  `createDrizzleSource` in `bindDomainDatabase`
  (`domain-schema.ts:137-149`). A wide `string[]` held value must still be
  accepted wherever a narrow one is declared, so prefer `readonly` arrays on
  both sides or keep the base wide and narrow only the `createEntity` config.
  The smallest change that keeps `bindDomainDatabase` compiling wins.
- Mirror the Step-1 fallback: a non-Zod or absent select schema degrades to
  `string`, never to `never`.

Suggested shape (adapt if a narrower diff presents itself, but do not widen
to `any`):

```ts
// drizzle-source.ts
export type CreateDrizzleSourceRead<TKey extends string = string> = {
  pinnedOrder?: SQL[] | ((columns: AliasSafeColumns) => SQL[]);
  searchColumns?: readonly TKey[];
  virtual?: Record<string, CreateDrizzleSourceVirtualParam>;
};
```

Thread the key from `createEntity`'s `TSchemas['select']` through
`DomainEntity.read` only as far as assignability requires. If threading forces
changes beyond `drizzle-source.ts` + `domain-schema.ts`, STOP and report
instead of loosening the type.

**Verify**: `pnpm --filter @southneuhof/sprindle type-check` → exit 0, and
`pnpm --filter @southneuhof/api type-check` → exit 0 (no app caller breaks).

### Step 4: Add type and runtime regression tests

Type tests in `packages/sprindle/src/__tests__/route-schema.spec.ts`,
following the file's existing `expectTypeOf` + `if (false)` /
`@ts-expect-error` pattern. The file already defines a scope whose select keys
are `id` and `name` (`Entity`, lines 6-10); reuse it. Cover:

1. `defaultSort: 'name'` compiles; `defaultSort: 'nope'` is
   `@ts-expect-error` (this is the forward-test `-createdAt` class of mistake;
   also assert `defaultSort: '-createdAt'` is rejected).
2. `defaultOrder: 'desc'` compiles; `defaultOrder: 'down'` is
   `@ts-expect-error`.
3. `enumFilters: { name: ['a'] }` compiles; `enumFilters: { nope: ['a'] }`
   is `@ts-expect-error`.
4. Entity-less `list({})` still compiles (no-scope regression for the
   `[never]` guard).

Runtime tests in
`packages/sprindle/src/routes/__tests__/list-policy.spec.ts`, following the
file's `buildApp` + `observed` pattern:

1. `defaultSort: 'name', defaultOrder: 'desc'` with no client query returns
   rows in the pinned direction and `observed.order === 'desc'`.
2. Client `?order=asc` overrides `defaultOrder: 'desc'` (`observed.order`
   stays `'asc'`).
3. Existing tests pass unmodified.

**Verify**: focused spec command from the table → all pass, including the new
tests.

### Step 5: Update the skill row

In `.agents/skills/api-conventions/references/standard-crud.md`, change the
row at line 39 to:

```
| Default order, enum filters | `list({ query: { defaultSort, defaultOrder, enumFilters } })` |
```

Below the table (lines 48-50), keep the existing
client-selectable-vs-`pinnedOrder` sentence and add at most two lines:

- Keys are entity fields; the compiler rejects unknown names.
- `defaultSort`/`defaultOrder` yield to client `sort`/`order`;
  `read.pinnedOrder` ignores them.

Do not add examples, DSL, or prefix syntax. No other skill file changes.

**Verify**: `git diff --check` → exit 0; `git status --short` shows only
in-scope files.

### Step 6: Run the surrounding gates

- `pnpm --filter @southneuhof/sprindle test` → all pass.
- `pnpm --filter @southneuhof/sprindle lint` → exit 0.
- `pnpm --filter @southneuhof/api type-check` → exit 0.
- `git diff --check` → exit 0.

## Test plan

- `route-schema.spec.ts`: 4 new type assertions (valid/invalid `defaultSort`,
  valid/invalid `defaultOrder`, valid/invalid `enumFilters` keys, entity-less
  `list({})` still compiles). Pattern: the file's own `@ts-expect-error`
  blocks. A rejected line that starts compiling fails the suite; an accepted
  line that stops compiling fails type-check.
- `list-policy.spec.ts`: 2 new runtime tests (default direction applies,
  client override wins). Pattern: the file's `buildApp`/`observed` style.
- Existing suites (`read-contract`, `language`, `manifest`, full Sprindle,
  API type-check) prove no regression in sources, declarations, or callers.
- No new E2E, browser, or database tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `list({ query: { defaultSort: '-createdAt' } })` fails type-check
      against an entity scope (new type test proves it)
- [ ] `defaultOrder: 'desc'` fills `query.order` when the client sends none
      and yields to client `?order=asc` (new runtime tests prove it)
- [ ] Sprindle `type-check` exits 0; `lint` exits 0; full `test` passes
- [ ] API `type-check` exits 0 (no caller breakage)
- [ ] `git diff --check` exits 0; status shows only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live files.
- The `[never]` guard cannot preserve entity-less `list({})` — report, do not
  widen call sites to `as never` or `as any`.
- Threading `searchColumns` requires changes beyond `drizzle-source.ts` +
  `domain-schema.ts`, or breaks `bindDomainDatabase` assignability — report
  with the exact error rather than loosening to `any`/`string`.
- The tooling specs (`language`, `manifest`) fail on the new declarations.
- The fix appears to require touching an out-of-scope file (wire schema,
  memory source, Loom, scaffold, app modules).

## Maintenance notes

- Every new list-query key option must use `ListQueryKey<TParent>` (route
  policy) or the entity-select key (read config). A new `string`-typed key
  reopens this exact incident.
- Reviewers: a cast past the key type (`as any`, widened generic) is the
  anti-pattern this plan removes. Reject it.
- `pinnedOrder` remains the only mandatory order. If a future requirement
  needs "default desc that the client can never override", that is
  `pinnedOrder`, not `defaultOrder`.
- Deferred, deliberately: enum member checking for `enumFilters` values stays
  runtime; wire-query `sort` stays `string` for open clients.

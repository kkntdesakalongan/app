# Plan 035: Enforce resource identity declarations

Follow these steps and checks in order. This plan is self-contained. Record
results and update its row in `plans/README.md` after review.

## Status

- Priority: P1
- Effort: M
- Risk: MED — identity inference is used by routes, writes, and query keys.
- Confidence: HIGH — a nonexistent identity key passed a compiler probe.
- Depends on: 034, because both plans change the `defineResource` declaration type
- Category: correctness, type safety
- Planned at: `9d5f03e`, 2026-09-17
- Status: IN PROGRESS (steps 1-4 done; review + index row pending)
- Baseline (2026-09-17, worktree dirty with Plan 034 work):
  - Drift check: plan ref `9d5f03e` absent from this clone; substituted
    `git diff --stat HEAD` over scoped paths. Result: only Plan 034 files
    changed (`defineResource.ts`, `actionResource.ts`, `access.ts` contract,
    `resource-actions.type-test.ts`, `resources.spec.ts`, two template
    resources + route components, `adapters/bundle.ts`, loom README,
    arch doc, plans/034 file). `contracts/schema.ts`,
    `apps/web/src/framework/schema.ts`, app `__tests__`/`__type-tests__`
    unchanged. Drift reconciled: proceed without overwriting 034 logic.
  - Types (Loom): exit 0 (`vue-tsc --noEmit --incremental false`).
  - Runtime (Loom): 34 passed (`resources.spec.ts` +
    `resource-cache.spec.ts`).
  - App tests: 1 passed (`framework/__tests__/schema.spec.ts`).
  - App types: pre-existing baseline failure only. `rpc` is `unknown`
    (`@southneuhof/api/routes-contract` missing) in
    `framework/adapters/storage.ts`, `framework/identity.ts`, route
    actions/schemas, `routes/(public)/auth/login/index.route.vue`,
    `utils/services.ts`, `packages/sdk/src/client.ts`; plus one
    `permissions.schema.ts` write-contract mismatch on the dirty tree.
    Verified identical counts with changes stashed
    (`git stash push --keep-index` + type-check + `git stash pop`):
    baseline has the same `rpc`-unknown failures, so they are NOT caused
    by this plan. Owner files have zero errors:
    no diagnostics mention `framework/schema.ts`, `__type-tests__/schema`,
    `__type-tests__/identity`, or `contracts/schema`.
- Step 1 (compiler regressions): added
  `packages/loom/src/resources/__type-tests__/schema-identity.type-test.ts`
  and `apps/web/src/framework/__type-tests__/schema-identity.type-test.ts`.
  Before the fix every new `@ts-expect-error` reported unused (loom: all
  identity negatives; app: all identity negatives), which confirms the probe.
  Valid fixtures need no casts (one `String()`/`Number()` normalization kept
  only inside a detail `run` body where the context id is optional).
- Step 2 (static guards): `contracts/schema.ts` gains `IdentityKeyOf`,
  `CheckedIdentityKey(s)`, `CheckedIdentityFunction`,
  `CheckedDefaultIdentity`, `CheckedSchemaIdentity`,
  `IdentityFromDeclaration` (diagnostic on invalid known declarations, exact
  composite shape on valid tuples, `id`-default inference), and
  `InvalidSchemaIdentity`; `defineResource` intersects the schema parameter
  with `CheckedSchemaIdentity` over the inferred record; the app inferred
  `defineSchema` overload applies the same guard while the Zod literal and
  parsed record output are both present.
- Step 2 judgement calls: empty-tuple literal `[]` widens past the guard on
  the app seam, so the app rejects it at runtime (step 3) instead of claiming
  a static diagnostic (the loom seam keeps the static negative); fn-return
  mismatches fail in the base `RuntimeDefinition` constraint, which the app
  test records as the diagnostic without a second key-rule implementation.
  Hono and explicit custom overloads unchanged. Loom Types exit 0; app owner
  files (`framework/schema.ts`, `__type-tests__/schema-identity`) report zero
  diagnostics (remaining app failures match the pre-existing `rpc`-unknown
  baseline: 15 route + 3 `framework/identity.ts` + 3 `adapters/storage.ts` +
  1 `utils/services.ts` + 1 `sdk/client.ts`; the earlier `assets.form.spec`
  + extra route failures seen mid-step were caused by my first
  `HasRecordSource` draft and are gone; the Hono positive + negative cases
  in the new app type-test pass).
- Step 3 (runtime check): new private `packages/loom/src/resources/identity.ts`
  holds one validator (`isRecordIdentity` + `checkIdentityDeclaration` +
  `checkIdentityValue`). Construction rejects empty/duplicate key arrays.
  `resolveIdentity` checks every result (key, tuple, fn, `id` default).
  Public `detail`/`update`/`delete` IDs and scoped `invalidate({ id })`
  check before work; omitted global `invalidate()` stays valid (explicit
  invalid `id` fails; `invalidate` is async so its failure rejects, unlike
  the sync method-ID guards). List-only reads gain no eager per-row work:
  row routes check lazily when a target resolves. Malformed identities call
  no write, register no navigation target, and touch no unrelated cache
  entry. `resources.spec.ts` gains 4 tests (construction negatives, malformed
  row identities, malformed method args, valid `0`/`''`/composite/global).
  Runtime 38 passed (`resources.spec.ts` + `resource-cache.spec.ts`); Types
  exit 0; App tests 1 passed; App types owner-clean. Full Loom suite:
  57 files, 467 tests passed.
- Step 4 (review): Loom README gains one identity-contract paragraph only
  (no other README text touched). App lint on the two touched app files:
  oxlint 0 errors + 1 pre-existing `TQuery` unused-var warning (present on
  the clean tree; verified via `git stash push --keep-index`), oxfmt clean
  after one format pass. `git diff --check` exit 0. Diff scan: only scoped
  files changed; `defineResource.ts`/`actionResource.ts` diffs include Plan
  034's `CheckedDefinition` work (preserved, not overwritten); no unrelated
  contract or default-behavior change. Index row update left for reviewer
  per plan instructions.
- Reviewer findings (2026-09-18): (1) `IdentityKeyOf` tests key
  requiredness with `{} extends Pick<TRecord, TKey>` so an optional key
  fails even when its value type is exactly `string`; loom and app
  `@ts-expect-error` negatives for optional `id` stay consumed, `Row`
  positive still passes, Loom Types exit 0. (2) `HasRecordSource`
  collapses the dead `? true : true` tautology to `true` with a comment:
  the overload guard checks the `id` default; behavior unchanged, app
  owner files report zero diagnostics, app schema test passes.
  (3) `Definition` constrains its own `identity` member through the new
  loom guards (`IdentityKeyOf` / tuple / `IdentityFunction`) and
  intersects the same actual declaration through `CheckedIdentity`, so
  an invalid literal cannot widen through the broad union; Hono
  `identity: 'missing'` negative stays consumed, valid Hono positive
  passes, plus a new Hono boolean-key (`identity: 'active'`) negative
  proves scalar enforcement on the Hono path. App lint 0 errors
  (1 pre-existing `TQuery` warning, also on the clean tree); oxfmt
  clean; `git diff --check` exit 0.

## Why this matters

`defineResource` accepts `identity: 'missing'` for a record that has no such key.
The runtime reads that property and casts the result to the expected type.
This can pass an undefined identity to navigation or a write. The framework
must reject invalid declarations and check identities before their use.

## Current state

`packages/loom/src/contracts/schema.ts:34` contains:

```ts
export type WebResourceSchemaBoundary = {
  identity?: string | readonly string[] | ((record: never) => RecordIdentity)
  // schema members follow
}
```

`SchemaIdentityDeclaration` at line 4 limits keys to record keys, but does not
limit their value types. `IdentityFromDeclaration` at line 54 falls back to
`RecordIdentityValue` for invalid members. `RecordIdentityValue` is `string |
number`; `RecordIdentity` also permits a readonly record of those values
(`packages/loom/src/contracts/load.ts:38`).

`packages/loom/src/resources/actionResource.ts:404` contains:

```ts
if (typeof declaration === 'string') return (record) => record[declaration] as TIdentity
return (record) => (record as { id: TIdentity }).id
```

The same file consumes identities for row routes, deletes, default destinations,
and invalidation. Its public methods also receive explicit `id` arguments.

`apps/web/src/framework/schema.ts:68` has a broad `RuntimeDefinition.identity`.
The inferred `defineSchema(definition)` overload at line 84 returns a generic
`WebResourceSchema`. A check only in `defineResource` can be too late: the
invalid literal may already be lost. The Hono and explicit custom overloads
also need regression coverage without changing their write contracts.

Loom must stay independent of Hono and Zod internals. Carta's app schema seam
owns those integrations. A `ValidationSchema` exposes `validate`; it does not
necessarily expose property names. Type-only schemas are supported.

## Target contract

1. A string identity names a required record key whose entire value type is
   `string | number`. Optional, nullable, boolean, array, and object keys are
   rejected. Do not remove null from a union merely to make it fit.
2. A key tuple is nonempty; each key meets the same rule. Preserve its readonly
   literal keys and the exact composite identity shape. Reject duplicate tuple
   keys statically where known and at runtime for all key arrays.
3. An identity function receives the exact record type and returns the existing
   `RecordIdentity` shape. Keep string, number, and composite returns supported.
4. With no declaration, use the existing `id` default. For a known record type,
   reject this default when `id` is absent or not a required scalar identity.
5. Preserve explicit type-only `WebResourceSchema<Row, ...>` declarations. When
   a record shape is truly unavailable or index-signature based, rely on runtime
   checking rather than claim static key membership. Do not inspect Zod internals.
6. At runtime, accept strings and finite numbers. Accept nonempty plain objects
   whose own values are strings or finite numbers. Reject missing values, null,
   booleans, arrays, empty objects, NaN, Infinity, and promises. Keep `0` and `''`
   valid; changing domain constraints is outside scope.
7. Check identity results when consumed, and explicit public `id` arguments
   before navigation, mutation, or keyed invalidation. A list-only read with no
   identity use must not gain eager per-row work. Global invalidation without
   an `id` remains valid.
8. Errors name the resource and identity key or operation, without record data.

## Scope

- `packages/loom/src/contracts/schema.ts` and its public type export if needed
- `packages/loom/src/resources/defineResource.ts`
- `packages/loom/src/resources/actionResource.ts`
- New private `packages/loom/src/resources/identity.ts` if this keeps one validator
- `packages/loom/src/resources/__type-tests__/schema.type-test.ts`
- `packages/loom/src/resources/__tests__/resources.spec.ts`
- `apps/web/src/framework/schema.ts`
- New `apps/web/src/framework/__type-tests__/schema-identity.type-test.ts`
- `apps/web/src/framework/__tests__/schema.spec.ts` if runtime seam tests need extension
- `packages/loom/README.md`: identity contract only
- This plan and its index row

Out of scope: API identity formats, persistence, access rules, generated routes,
query-key redesign, Hono write-schema migration, field renderer changes,
dependencies, UI changes, skill changes, and compatibility aliases.

## Commands

Run from the repository root with existing dependencies.

| Name | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat 9d5f03e..HEAD -- packages/loom/src/contracts/schema.ts packages/loom/src/resources apps/web/src/framework/schema.ts apps/web/src/framework/__tests__ apps/web/src/framework/__type-tests__ packages/loom/README.md` | Compare changes; Plan 034 changes are expected |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Runtime | `pnpm --filter @southneuhof/loom test src/resources/__tests__/resources.spec.ts src/components/views/__tests__/resource-cache.spec.ts` | All selected tests pass |
| App tests | `pnpm --filter @southneuhof/framework-web test framework/__tests__/schema.spec.ts` | Schema tests selected and pass |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| App lint | `pnpm --filter @southneuhof/framework-web lint:focused -- src/framework/schema.ts src/framework/__type-tests__/schema-identity.type-test.ts` | Exit 0 |
| Final | `git diff --check` | Exit 0 |

The web test command sets `--root src/`; its selector is relative to that root.
Zero tests is never a pass.
The Loom package has no lint script. Builds, database checks, and browser tests
are not needed for this change.

## Steps

### 1. Record the baseline and add compiler regressions

Run Drift, Types, Runtime, App tests, and App types. Inspect `git status --short`
and preserve existing work. Use the actual schema and validation types from
`schema.type-test.ts`; follow its small `Row`, `Draft`, and `ValidationResult`
fixtures. Add negative `@ts-expect-error` cases for every invalid key/value rule
above, both at `defineResource` and the inferred app `defineSchema` entry point.

Add positive cases for numeric `0`, scalar string IDs, readonly key tuples,
function identities, a known `id` default, explicit type-only schemas, and exact
resource method ID arguments. Add one invalid member in a composite tuple.
For the app seam, cover inferred, explicit custom, and Hono contract overloads.

Verify with Types and App types: the new negative cases must fail through unused
directives before implementation. Confirm valid fixtures do not require casts.

### 2. Enforce declarations before inference loses them

Add a reusable identity-key type that selects required scalar keys. Use it in
`SchemaIdentityDeclaration`. Add a declaration guard to `defineResource` that
checks the inferred schema against its inferred record. Do not constrain the
record to `object` before checking and lose its properties.

Apply the same generic contract to the app's inferred `defineSchema` overload
while it still has both the identity literal and parsed record output. Preserve
the existing Hono and custom write checks. If the app seam widens the identity
return type, preserve the actual identity declaration where needed for exact
method ID inference. Avoid a second independent implementation of the key rule.

Keep the broad internal boundary available for erased implementation code; it
must not be the only constraint of a public authoring call. Invalid known
declarations must produce a diagnostic, not fall back to `string | number`.

Verify with Types and App types: all negative directives used, positive checks pass.

### 3. Add the runtime identity check

Use one small validator for the target shapes. Validate key-array declarations
at resource construction; validate selected values when `resolveIdentity`
produces a result. Validate public `detail`, `update`, and `delete` IDs, and
scoped `invalidate({ id })`, before starting their work. Distinguish an omitted
global invalidation ID from an explicitly supplied invalid ID.

Trace every call to `identity(...)` in `actionResource.ts`. Keep existing return
shapes, caching, permission order, and action call order. A malformed identity
must not call a write, register a navigation target, or invalidate an unrelated
cache entry. Do not validate a full API record a second time.

Extend `resources.spec.ts` using its runtime setup/cleanup. Use one explicit
boundary cast only for malformed JavaScript fixtures. Test malformed record
identities and malformed method arguments independently. Assert write and
invalidation spies remain untouched. Test valid composite IDs and global
invalidation to protect existing behavior.

Verify with Runtime, Types, App tests, and App types: exit 0.

### 4. Review contract and consumers

Update only the identity paragraph of the Loom README. Run App lint and Final.
Run `pnpm --filter @southneuhof/loom test` once for completion. Inspect the diff
for changes to unrelated contracts or default business behavior. Record results
in this plan and update its index row after review.

## Done criteria

- [ ] Both public schema paths reject invalid known identity declarations.
- [ ] Required scalar keys and exact composite/function inference pass type tests.
- [ ] Runtime malformed identities fail before side effects.
- [ ] Valid `0`, empty string, composite IDs, and global invalidation still work.
- [ ] All command gates and the final Loom suite pass.
- [ ] No cast, broad overload, or removed negative test conceals a public error.
- [ ] Only scoped files changed; review and results recorded.

## STOP conditions

Stop if an existing real consumer intentionally uses a nullable or object-valued
identity key, if the fix requires an API format change, or if an erased schema
cannot retain its existing supported type-only contract. Report that consumer
and the required decision. Do not silently widen the accepted identity type.
Stop for unexpected source drift or after two failed attempts at one check.

## Maintenance

Future schema builders must validate identity before returning widened types.
The runtime validator checks identity shape, not record ownership or authorization.
Keep these responsibilities separate. Do not commit, push, or deploy without a
separate request.

## Review record (2026-09-18, reviewer verification)

- Loom Types: exit 0 (`vue-tsc --noEmit --incremental false -p tsconfig.json`).
- Runtime: 38 passed (`resources.spec.ts` + `resource-cache.spec.ts`,
  incl. 4 identity tests: construction negatives, malformed row identities,
  malformed method args, valid `0`/`''`/composite/global).
- App tests: 1 passed (`framework/__tests__/schema.spec.ts`).
- App types: pre-existing baseline failure only (`'rpc' is of type 'unknown'`,
  missing `@southneuhof/api/routes-contract`); stashed-tree baseline shows
  the same failures. Owner grep for `framework/schema.ts`,
  `schema-identity`, and `contracts/schema` returns empty (exit 1).
- Loom suite: 57 files, 467 tests passed. Web suite: 45 files, 229 passed.
- App lint on the two touched app files: 0 errors; 1 pre-existing `TQuery`
  unused-var warning also present on the clean tree (renaming out of scope).
- `git diff --check`: exit 0.
- Review corrections applied: `IdentityKeyOf` tests requiredness
  (`{} extends Pick<TRecord, TKey>`), so optional keys fail even with a
  scalar value type; `HasRecordSource` tautology collapsed with intent
  comment (behavior unchanged); app `Definition.identity` constrained
  through `IdentityKeyOf`/tuple/`IdentityFunction` plus a `CheckedIdentity`
  intersection so Hono-path invalid literals cannot widen (Hono boolean-key
  negative added as proof; write contracts and runtime untouched).
- Done criteria hold except the Web-types gate, which fails only on the
  pre-existing unrelated baseline. Scope: 035-owned files only; 034 logic
  preserved. Index row update left for the final sign-off.

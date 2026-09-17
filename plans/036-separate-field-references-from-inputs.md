# Plan 036: Reject field references at resolved field inputs

Execute these steps in order and record their checks. This plan contains all
required context. Update its row in `plans/README.md` after review.

## Status

- Priority: P1
- Effort: S
- Risk: LOW — reject a representation that is already invalid at runtime.
- Confidence: HIGH — the compiler accepts the failing confirmation-form pattern.
- Depends on: none; execute after 035 in the recommended sequence
- Category: correctness, type safety
- Planned at: `9d5f03e`, 2026-09-17
- Status: TODO

## Why this matters

A `FieldReference` is a handle to schema-bound metadata. A `ResolvedField` is
the metadata itself. Both have a `key`, and all other resolved properties are
optional. Thus `Object.values(defineFields(...))` currently fits `FieldsInput`.
The resolver loses the metadata and can render text inputs instead of the
declared controls. Reject this connection statically and at runtime.

## Current state

`packages/loom/src/contracts/fields.ts:139` declares a unique symbol used by
both reference types:

```ts
declare const fieldReferenceSchema: unique symbol
// FieldReference and FieldOverride have:
readonly [fieldReferenceSchema]: TSchema
// The resolved entry at line 168 only adds:
export type ResolvedField<TRecord = Record<string, unknown>, TDraft = TRecord> =
  FieldDefinition<TRecord, TDraft> & { key: string }
```

`FieldsInput` at line 176 accepts resolved arrays or ad-hoc catalog objects.
`packages/loom/src/fields/resolve.ts:113` converts arrays by spreading each
entry after removing `key`. It does not identify references.
`packages/loom/src/fields/defineFields.ts:289` already has `readFieldReference`,
which checks the actual private runtime symbol. Use that function for detection.

`packages/loom/src/resources/actionResource.ts:415` resolves references in the
supported resource action path. It already rejects foreign schemas and duplicate
keys. Preserve this path and these errors.

Core `Form`, `Table`, and `Detail` accept ad-hoc catalogs and resolved arrays
without a resource. Preserve that supported API. A valid `{ key: 'name' }`
entry still uses field defaults. Do not require new builders for ordinary forms.

## Scope

- `packages/loom/src/contracts/fields.ts`
- `packages/loom/src/fields/resolve.ts`
- `packages/loom/src/fields/defineFields.ts` only if the existing detector needs export/import adjustment
- `packages/loom/src/contracts/__type-tests__/fields.type-test.ts`
- `packages/loom/src/resources/__type-tests__/field-references.type-test.ts`
- `packages/loom/src/fields/__tests__/resolve.spec.ts`
- `packages/loom/src/fields/__tests__/defineFields.spec.ts`
- `packages/loom/src/components/core/__tests__/form.spec.ts`
- `packages/loom/README.md`: field input distinction only
- This plan and its index row

Out of scope: application forms, renderer prop types, new field builders,
resource action behavior, a public resolution API, new schema identities,
database work, skills, browser tests, and compatibility wrappers.

## Commands

Run from the repository root with the existing dependencies.

| Name | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat 9d5f03e..HEAD -- packages/loom/src/contracts/fields.ts packages/loom/src/fields packages/loom/src/contracts/__type-tests__/fields.type-test.ts packages/loom/src/resources/__type-tests__/field-references.type-test.ts packages/loom/src/components/core/__tests__/form.spec.ts packages/loom/README.md` | Inspect changed owners |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| Focused | `pnpm --filter @southneuhof/loom test src/fields/__tests__/resolve.spec.ts src/fields/__tests__/defineFields.spec.ts src/components/core/__tests__/form.spec.ts` | All selected tests pass |
| App types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Suite | `pnpm --filter @southneuhof/loom test` | All non-browser tests pass |
| Final | `git diff --check` | Exit 0 |

There is no Loom lint script. No install, database setup, build, or deployment
is required. Web type checking generates route declarations; inspect any diff.

## Steps

### 1. Reproduce both representations

Run Drift, Types, and Focused. Preserve current dirty files. Follow the fixture
style in `field-references.type-test.ts`: use an actual schema and `defineFields`.
Add negative assignments to `FieldsInput` for:

- `[fields.name]`
- `Object.values(fields)`
- `[fields.name.override({ label: 'Other' })]`
- `{ name: fields.name }` and its override variant
- Mixed resolved/reference arrays

Include named variables, not just fresh literals. Add positive cases for an
ad-hoc catalog, a resolved array, an empty catalog, and a key-only resolved
entry. Assert the resource action's returned `.fields` still fits `FieldsInput`.

Verify with Types: the negative tests expose unused `@ts-expect-error` directives
before the change. Valid cases must remain valid throughout the implementation.

### 2. Make references incompatible with definitions

Use the existing unique-symbol brand. Add an optional `never` property for
that symbol to the plain definition/input side, so reference and override
objects cannot be assigned to a catalog value or resolved entry. Applying it
to `FieldDefinition` covers both shapes; check the current generic defaults
of `FieldReference` for unwanted recursion.

Do not brand all resolved objects with a new required property. That would
force every valid ad-hoc caller to use a builder. Do not use `override?: never`
as the only distinction: terminal overrides do not have that method.

Verify with Types: all new rejection cases work and resource selection tests pass.

### 3. Reject runtime handles in the shared resolver

In `toCatalog`, check each array entry and each catalog value with the existing
`readFieldReference` before spreading or projection. Reject a handle with an
error such as `[loom] Field "name" is a field reference; resolve it through a
resource action before passing it to a core surface.` Include the actual key.
Do not expose a schema or record value in the message.

Do not automatically resolve the handle here. A core surface has no action
schema or operation and cannot enforce the resource's reference rules.
Do not reject arbitrary objects merely because they have an `override` member.

Extend `resolve.spec.ts` with real references and terminal overrides, in array
and catalog shapes. Runtime invalid fixtures may have one explicit boundary
cast. Cover `form`, `table`, and `detail` through the shared resolver. Prove that
valid defaults, property merges, and action-resolved controls still work.

Verify with Focused and Types: exit 0.

### 4. Prove the actual form connection

Use `mountCore` and `flush` from the existing form test harness. Create a small
resource with a checkbox field, obtain `resource.create().fields`, and pass it
to the real `Form`. Assert a checkbox exists and a submitted boolean remains
a boolean. Also test the invalid reference input throws before a text input
fallback or submit call. Keep the resolver and field factory real.

Update the README's field input explanation. Run Types, Focused, App types,
Suite, and Final. Review the diff and update the index row with results.

## Done criteria

- [ ] References and overrides fail assignments in both accepted input shapes.
- [ ] Runtime resolver rejects those same inputs on all surfaces.
- [ ] Resource action fields and ordinary ad-hoc inputs remain valid.
- [ ] The mounted Form regression checks real control and value behavior.
- [ ] All command gates pass; no source outside scope changed.
- [ ] Review and result counts are recorded in the index.

## STOP conditions

Stop if an application currently depends on passing a handle directly, if the
symbol change causes an unsolved generic cycle, or if fixing the tests requires
a new mandatory builder for valid ad-hoc fields. Report the exact caller or
diagnostic. Stop on material source drift or after two failed attempts at a check.

## Maintenance

Keep the static exclusion and runtime detector together when changing reference
representation. Test terminal overrides as well as normal references. Preserve
the difference between a handle and its resolved data. Do not commit or publish
unless requested.

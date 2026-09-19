# Plan 046: Fail fast on empty custom DialogForm composition

> **Implementation instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` after the implementation and review pass.
>
> **Drift check (run first)**: `git diff --stat b44b82b..HEAD -- packages/loom/src/components/core/Form.vue packages/loom/src/components/composites/DialogForm.vue packages/loom/src/contracts/components.ts packages/loom/src/validation`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness, dx
- **Planned at**: commit `b44b82b`, 2026-09-19

## Why this matters

POS pay forward-test passed a raw Zod schema with no `fields` to `DialogForm`. It rendered an empty dialog and failed at submit with `reading 'loading'`, which names nothing actionable. `Form` already requires `fields` in type. The pit is a clear dev-time signal plus a wrapped-schema gate, so the obvious custom misuse fails at the seam with the field name attached. POS files stay fixtures; this plan changes Loom only.

## Current state

Files and roles:

- `packages/loom/src/contracts/components.ts:122` — `FormPropsBase.fields` is required. `DialogFormProps` extends it.
- `packages/loom/src/components/core/Form.vue:92,354` — loader plus `submit`. Validation runs on the visibility-filtered draft.
- `packages/loom/src/components/composites/DialogForm.vue:51` — forwards `schema`, `submit`/`run`, and slots to `Form`.
- `packages/loom/src/validation/select.ts:126` — orphan detection for issues with no visible input.
- `packages/loom/src/validation/zod.ts:88` — `fromZod` wraps raw Zod into `ValidationSchema` with `validate`.

Excerpts:

```ts
// packages/loom/src/contracts/components.ts:122
export interface FormPropsBase<TInput extends object = Record<string, unknown>> {
  fields: FieldsInput<TInput, TInput>
  schema?: ValidationSchema<TInput>
```

```ts
// packages/loom/src/validation/zod.ts:88
export function fromZod<TSchema extends ZodSchemaLike>(schema: TSchema): ZodValidationSchema<ZodOutput<TSchema>> {
```

Conventions:

- Standard bags (`resource.create()`, `resource.update()`) supply `fields` plus schema plus `run` together. Custom actions declare only `run` plus `permission`, so custom dialogs must supply `fields` by hand. That hand-built path is the footgun.
- Plan 028 already added the orphan backstop in `Form`. This plan is the seam guard before submit, not a second orphan system.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Loom type-check | `pnpm --filter @southneuhof/loom type-check` | exit 0 |
| Loom focused tests | `pnpm --filter @southneuhof/loom test -- src/components/core/__tests__/form.spec.ts` or equivalent form path | all pass |
| Loom full tests | `pnpm --filter @southneuhof/loom test` | all pass |
| Lint | repo lint for touched packages | exit 0 |

## Scope

**In scope:**

- `packages/loom/src/components/core/Form.vue` (dev guard only)
- `packages/loom/src/components/composites/DialogForm.vue` (prop through, no behavior fork)
- `packages/loom/src/contracts/components.ts` (only if a type narrowing is needed for raw Zod rejection)
- New focused specs under `packages/loom/src/components/core/__tests__/` or composites tests

**Out of scope:**

- `apps/web/src/routes/(authenticated)/pos/**/*` — fixture only. Do not fix pay dialog here.
- Custom pay resource shape. That belongs to the record-ops track.
- Production user-facing error copy beyond existing toast/alert patterns.
- Runtime Zod coercion. Raw Zod must be rejected or wrapped explicitly, never auto-wrapped silently.

## Git workflow

- Branch: `advisor/046-dialogform-pit`
- Commit per step. Match repo imperative subjects.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add dev guard for schema-without-visible-fields plus raw-schema signal

In `Form`, when `schema` is present and resolved visible fields are zero, throw a dev-only error naming the schema keys and the missing `fields` prop, before submit blocks silently. When `schema` looks like raw Zod (has `safeParse` but no `validate` and no `source`), throw a dev-only error naming `fromZod` as the fix. Keep production behavior unchanged except existing toast/alert paths.

Model the test after existing form specs. Cases: empty fields plus object schema throws in dev; wrapped schema with one field does not throw; raw Zod throws naming `fromZod`.

**Verify**: focused form spec → new cases pass; existing form tests pass.

### Step 2: Ensure DialogForm surfaces the same guard without forking logic

`DialogForm` must not duplicate validation. It forwards `fields` and `schema` to `Form` unchanged. Add one spec mounting `DialogForm` with the pay-shaped props (schema keys, zero fields) asserting the same dev error surfaces. No new visibility or completion behavior.

**Verify**: `pnpm --filter @southneuhof/loom type-check` → exit 0; focused dialog/form specs pass.

## Test plan

- New specs: empty-fields-with-schema, raw-Zod signal, happy custom dialog with one wrapped field.
- Pattern: existing `Form` specs and `DialogForm` specs. Do not copy POS fixtures into Loom; use minimal inline schemas.
- Full Loom suite must pass.

## Done criteria

- [ ] `pnpm --filter @southneuhof/loom type-check` exits 0
- [ ] `pnpm --filter @southneuhof/loom test` exits 0 with new guard specs
- [ ] `grep -rn "safeParse" packages/loom/src/components/core/Form.vue` shows only the guard, no silent auto-wrap
- [ ] No out-of-scope files modified
- [ ] `plans/README.md` row updated

## STOP conditions

- Excerpts do not match live code.
- Guard requires changing production submit semantics beyond dev-throw. Stop and confirm.
- Type system already rejects the misuse in a way that makes the runtime guard redundant and the extra code pure debt. Prefer the type fix and shrink this plan.
- Fix needs POS app edits to prove. POS is fixture-only here.

## Maintenance notes

- Future custom dialogs must supply `fields` plus wrapped schema. Reviewers should reject raw Zod props.
- If `ValidationSchema` gains a new wrapper, update the guard's raw-shape detection once.

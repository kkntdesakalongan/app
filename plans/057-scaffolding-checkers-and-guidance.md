# Plan 057: Generate and teach only the new surface architecture

> Read architecture §§8-10. Use `$writing-for-agents` when editing AGENTS.md or skills. Run drift check, complete gates, and update row 057 after review. Do not commit or push unless asked.
>
> **Drift check:** `git diff --stat 40afee2..HEAD -- scripts .agents/skills AGENTS.md DESIGN.md docs packages/loom/README.md apps/web/README.md`. Compare generator/checker excerpts; stop if their manifest contract changed.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** MED; **Depends on:** 056; **Category:** migration; **Planned at:** `40afee2`, 2026-09-23.

## Why this matters

The module generator and static checker still author/read `defineFields` and the old two-argument resource. Active docs and skills teach that contract. A migration that leaves these tools unchanged will create new legacy code immediately.

## Current state

- `scripts/scaffold-bounded-module.mjs:610-628` emits `defineFields` and `defineResource(schema, { actions })`; lines 640-660 inject a technical update loader at page level and use `as never`.
- `scripts/module-ui-check.mjs:516-544` parses `defineFields` catalogs and action field arrays.
- `packages/loom/vitest.browser.config.ts:12` has an explicit browser-spec include list.
- `DESIGN.md:90-93`, `docs/ui/collections.md:46-51`, `docs/architecture/web-application-architecture.md:56-61`, `packages/loom/README.md:1-21`, and `.agents/skills/build-resource-form/SKILL.md:22-32` describe the old model. The old architecture doc is historical; keep obsolete prose outside active discovery after replacement.

Current generator output (`scaffold-bounded-module.mjs:610`, `617-623`):

```js
return `import { defineFields, defineResource } from '@southneuhof/loom'
```

```js
const fields = defineFields(${plural}Schema, {
${config.fields.map(renderField).join('\n')}
})

export const ${plural} = defineResource(${plural}Schema, {
  key: '${config.slug}',
  actions: {
```

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Tool tests | `pnpm test:module-tooling` | exit 0 |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | exit 0 |
| Loom browser | `pnpm --filter @southneuhof/loom test:browser` | new parity spec discovered and passes |
| Lint | `pnpm lint` | exit 0 |

## Scope

**In:** `scripts/{scaffold-bounded-module,module-ui-check,integrate-bounded-module,verify-module,module-evidence}.*`, `scripts/test-support/bounded-fixture.mjs`, related tool tests, `.agents/skills/{build-resource-form,web-ui-surfaces,migrate-web-resource,implement-schema-first-zod,carta-module-design,carta-module-plan,carta-module-development,verify-carta-module}/**`, their scripts/tests, `AGENTS.md`, `DESIGN.md`, active Loom/web docs/READMEs, browser/type-check config and CI only as needed to register the new gates.

**Out:** backend module semantics, dependency versions, unrelated skill packages. Do not create migration aliases, old templates, or legacy/v2 documentation paths.

## Git workflow

Continue on `advisor/resource-surface-overhaul` after Plan 056. Do not ship an intermediate state. Do not commit or push unless asked.

## Steps

1. Rewrite generator output to emit raw operation schemas, independent form/table/detail definitions, one-object resource, static list/create bags, and identity-bound pages. An update-only module binds its technical read in `update.form.load` and maps it to a draft. Remove `as never` from generated routes. **Verify:** `node --test scripts/scaffold-bounded-module.test.mjs` exits 0 and a fresh bounded fixture passes the web type-check command.
2. Replace static UI parsing with syntax-aware assembled fragment/surface inspection. Follow references/spreads and aliases; check relation reads, display requirements, renderer/format choices, and membership. Port `fields/displayRequirement.ts` to `display/requirements.ts` and share its rules with the checker. **Verify:** `node --test scripts/module-ui-check.test.mjs` exits 0, including valid spreads and invalid missing display choices.
3. Update module integration/verification/evidence scripts and Python skill checks to recognize the new files and bags. **Verify:** `pnpm test:module-tooling` exits 0 on a fresh fixture; no snapshot expects the old catalog.
4. Update active docs, `AGENTS.md`, `DESIGN.md`, and listed skills/references so every current example uses raw schemas and separate surfaces. Update or retire `migrate-web-resource` and `implement-schema-first-zod` guidance that targets removed APIs. Preserve UI design/route ownership rules. **Verify:** `rg -n 'defineFields|fromZod|fieldDefaults|formProps|resource\.list\(\)' AGENTS.md DESIGN.md docs/ui docs/architecture packages/loom/README.md apps/web/README.md .agents/skills` returns only clearly marked historical/removal prose or negative tests; `pnpm test:module-tooling` passes.
5. Add test discovery and CI invocations for the new parity/type fixtures; do not leave the spec outside the explicit browser include list. Plan 058 adds the final architecture checker and its CI gate. **Verify:** `pnpm test:module-tooling && pnpm --filter @southneuhof/loom test:browser && pnpm lint` exits 0; `rg -n 'SurfaceParity' packages/loom/vitest.browser.config.ts` finds the browser gate.

## Test plan and done criteria

- Use `scripts/scaffold-bounded-module.test.mjs`, `scripts/module-ui-check.test.mjs`, and `scripts/module-skills.test.mjs` as structures.
- [ ] Fresh generated module compiles without new-boundary casts.
- [ ] The static checker accepts ordinary object references/spreads and flags invalid rendered values.
- [ ] Active agent guidance and docs teach only the target API.
- [ ] Tooling tests, lint, and `git diff --check` pass.

## STOP conditions

- A generator manifest cannot express an operation-local raw schema without changing the approved module manifest; report the exact field.
- An active skill still requires the old API for a separate supported workflow; report its caller before deleting guidance.
- The checker would need a regex-only rule that misclassifies legitimate command `run` or provider `.list()`.

## Maintenance notes

Treat generator output as a product caller: every public API change must update its fixture and type-check. Keep historical design records marked historical and out of active instructions.

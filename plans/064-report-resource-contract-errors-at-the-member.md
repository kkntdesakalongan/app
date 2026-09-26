# Plan 064: Make resource declaration errors identify the bad member

## Status and intent

- Status: TODO. Priority: P2. Effort: L. Risk: MED. Confidence: HIGH.
- Category: agent DX and type contracts. Hard dependencies: none. Recommended after 061–063 so the final compiler checks cover their completed contracts.
- Planned at: `1246387`, 2026-09-26.

A strict API is useful only if its error tells an author what to fix. Preserve every resource acceptance/rejection rule while making common invalid declarations identify the operation, member, or failed identity/submit relationship. Do not make the API permissive to improve the error text. Do not introduce operation builders or require callers to annotate every intermediate object.

Read root `AGENTS.md`, resource architecture sections 3, 6, and 10.1, and `test-audit`. Add no implementation comments. This plan is for later selected execution, with no commit, push, installs, package upgrades, or external writes. Effort is larger than the audit estimate because real compiler diagnostics need an independent gate, not just more `@ts-expect-error` assertions.

## Current state and reproduced problem

`packages/loom/src/resources/operations.ts:381` defines `NoExtraKeys` as `unknown` or `never`. `ResourceShapeGuard` at line 467 intersects operation guards. `defineResource.ts:18` intersects their result with the entire declaration:

```ts
definition: TDefinition
  & { identity: TIdentityFunction }
  & ResourceDefinitionGuard<NoInfer<TDefinition>, TIdentityFunction>
```

An audit compiler probe used a valid form with `name: string`, a submit result `{ id: string }`, and identity `(row: { id: string }) => row.id`. The valid resource compiled. Adding `typo: true` to `create` produced TS2345, ending with `is not assignable to parameter of type 'never'`. It did not identify the bad property. The probe was in memory and did not modify source. It used the TypeScript API for this resource-boundary check; the permanent proof below must use Vue-aware compilation as well.

`resources/__type-tests__/bound-resource.type-test.ts` demonstrates the compact output contract, required extracted loaders, exact results, and contextual callbacks. `resource-actions.type-test.ts` and `schema-identity.type-test.ts` protect custom argument/permission and identity rules. Preserve their substance. Existing negatives establish rejection, not the usefulness of diagnostic location or text.

## Scope

- `packages/loom/src/resources/operations.ts`
- `packages/loom/src/resources/defineResource.ts`
- `packages/loom/src/resources/__type-tests__/bound-resource.type-test.ts`
- `packages/loom/src/resources/__type-tests__/resource-actions.type-test.ts`
- `packages/loom/src/resources/__type-tests__/schema-identity.type-test.ts`
- `packages/loom/scripts/check-resource-diagnostics.mjs` (new development-only command)
- `packages/loom/package.json`, only add `test:diagnostics`
- `.github/workflows/web-validation.yml`, only run the new diagnostic command after Loom type checking
- This plan and its `plans/README.md` row.

Do not change binder runtime behavior, surface constructors, component contracts, schema semantics, route access, transport, application resources, dependency versions, tsconfig strictness, or unrelated CI jobs. Do not replace the existing type suite with the new harness. Do not add a compiler dependency: use the installed `vue-tsc`/TypeScript pair.

## Required diagnostic cases

Every negative has an adjacent valid control differing only in the intended defect. Use actual `defineResource` calls. Include literals and named variables/spreads. Keep fixtures small so diagnostics are not truncated by unrelated types.

| Case | Diagnostic must identify |
|---|---|
| Unknown top-level `typo` | `typo` at the root declaration |
| Extra `create.typo` | The `create` operation and bad `typo` member |
| Extra member in `list.table` or `create.form` | The corresponding bag/member |
| Extra member returned by `update.form` or `detail.detail` factory | The operation/factory and returned bad member |
| Reserved standard name mixed with a valid custom action | The reserved action name under `actions` |
| One invalid permission callback in an otherwise valid action map | The action name and permission contract |
| Create submit result lacks the identity-bearing fields | `create`, submit result, and identity requirement |
| Update submit input does not accept the schema output | `update` and submit/output compatibility |

An error may use the compiler's property-chain prose, a source span on the bad member, or a small named diagnostic type containing its path. It must not consist only of the full argument being incompatible with `never`. Do not require exact full diagnostic prose or TypeScript's incidental type-printing order.

## Implementation approach

Keep inference from the original declaration before validation. Use `NoInfer` where needed so guards cannot widen valid source types to fit a declaration. Express shape errors as mapped constraints on offending keys/operations instead of intersecting a single failure into the whole object. Where a relationship has no one bad property, use a private diagnostic constraint that names the operation and expected relationship. Prefer a small finite family of private types; do not build a general compile-time error language.

For an extra-key constraint, the starting shape is a mapped property requirement such as `{ [K in Exclude<KeysOfUnion<Actual>, keyof Allowed>]: never }`, attached to the corresponding operation/bag. Thus a bad `create.typo` conflicts at `create.typo`, while a valid shape adds no required keys. This is a design sketch, not a tested drop-in replacement: the existing `NoExtraKeys` also serves boolean-like validity predicates. Keep that predicate role separate from diagnostic attachment until the compiler matrix proves both roles. Do not replace every occurrence with the mapped shape mechanically. For factory results, attach the result constraint to the existing factory signature while preserving its contextual arguments; do not change the factory into a new API.

Preserve union safety: validate every branch, including named action maps with a mix of valid/invalid entries. Preserve exact permission argument tuples, nonempty permission rules, identity result checks, optional operations, inferred callbacks, and compact bound results. A valid caller must not need a new assertion, generic argument, or helper call. Runtime return values stay identical.

## Diagnostic harness

Add one script invoked as `pnpm --filter @southneuhof/loom test:diagnostics`. It compiles the actual fixture calls with the installed `vue-tsc`, `--pretty false`, `--noEmit`, `--incremental false`, and `--noErrorTruncation`. Resolve the executable and repo paths from the script location; use `spawnSync`/`spawn` with argument arrays and no shell interpolation.

Create temporary fixture files and a tsconfig under a uniquely named directory in `packages/loom/node_modules/.cache/loom-resource-diagnostics/`. The temporary tsconfig extends the absolute Loom tsconfig and includes the temporary fixtures; package-local placement retains module resolution. Remove only the invocation-owned directory in `finally`. Do not place intentionally invalid fixtures in normal `src` globs, write to user source, or delete a shared cache directory.

Compile the valid fixture first and require exit 0 with no diagnostics. Compile the negative matrix and require a located diagnostic for each intended defect, no diagnostic in its valid controls, and no missing-module/configuration diagnostics. The command itself exits 0 only if the expected rejection and useful location/path checks all pass. A compiler crash, timeout, or unrelated failure is a failed harness run. Store expected case markers/line positions separately from the code being checked; avoid source comments as markers. Do not assert implementation helper names or dump complete compiler output into a snapshot.

## Commands

All commands run from repo root. Positive gates must exit 0.

| Gate | Command |
|---|---|
| Drift | `git diff --stat 1246387..HEAD -- packages/loom/src/resources packages/loom/package.json .github/workflows/web-validation.yml` |
| Local work | `git status --short` and `git diff -- packages/loom/src/resources packages/loom/package.json .github/workflows/web-validation.yml` |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` |
| Diagnostics (after addition) | `pnpm --filter @southneuhof/loom test:diagnostics` |
| Harness syntax | `node --check packages/loom/scripts/check-resource-diagnostics.mjs` |
| Binder regression | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/resources/__tests__/boundResource.spec.ts` |
| Unit regression | `pnpm --filter @southneuhof/loom test` |
| App types | `pnpm --filter @southneuhof/framework-web type-check` |
| Architecture | `pnpm test:surface-architecture` |
| CI contract | `node --test scripts/web-validation-workflow.test.mjs` |
| Whitespace | `git diff --check` |

The audit's Types and 450 unit tests passed. Diagnostics does not exist yet. App types can regenerate route artifacts; preserve unrelated generated changes. There is no Loom lint script. The test skill's OpenClaw-specific commands are not present here; report them as unavailable, not as successful proof.

## Steps

1. Record drift/local edits and reconcile earlier plans if already executed. Run Types and Binder regression; record an elapsed time for Types as a comparison baseline, without inventing a performance claim. **Verify:** both pass before the type repair.
2. Add the diagnostic harness, package command, and small fixture matrix. First require only the cases in the table; do not broaden into a full compiler test runner. Run it on the unchanged type guards. **Verify:** Harness syntax passes; Diagnostics fails specifically because the existing errors do not identify their bad member/relationship. Capture valid-control success and the intended negative failure.
3. Repair shape diagnostics first: root, standard declaration, nested bag, factory return, and custom action keys. **Verify:** corresponding Diagnostics cases pass, Types stays green, and named/spread invalid inputs still fail. Keep remaining red cases explicit during this intermediate step.
4. Repair permission/identity/submit relationship diagnostics without changing acceptance. Extend existing positive type fixtures only where needed to prove inference still survives the new constraints. **Verify:** the full Diagnostics matrix and Types pass. Record type-check time; investigate a material regression before proceeding, and do not trade compact output for verbose retained Zod types.
5. Add the single CI command. Run Harness syntax, CI contract, Binder regression, Unit regression, App types, Architecture, and Whitespace. **Verify:** all pass; no diagnostics gate can turn green from compiler startup failure or missing imports.
6. Review all type changes against the original valid/invalid contract. Record commands, expected-red proof, compiler output examples, and limitations here; update the index. **Verify:** task diff is inside Scope and no previously valid app declaration needed modification.

## Done, stops, and maintenance

- [ ] Each diagnostic case identifies its operation/member or named relationship.
- [ ] Valid controls and existing public type fixtures pass without added caller casts.
- [ ] Mixed union/action invalid cases remain rejected.
- [ ] Diagnostic harness runs in normal web CI and cleans only its own temporary files.
- [ ] Runtime binder tests and app consumption pass; no runtime behavior changed.

Stop if useful diagnostics require a public builder API, weakened strictness, changed runtime behavior, or a new compiler dependency. Stop if unchanged callers need broad annotations, if the installed compiler cannot report stable locations for the chosen proof, or after two failed attempts at a gate. Report the smallest unresolved case rather than silencing it. Future type refactors must preserve both rejection and repair guidance; exact wording is not a compatibility promise.

## Execution evidence

Not executed. The audit reproduced the `create.typo` diagnostic gap only. The broader matrix is an execution requirement, not an already observed failure for every case.

# Plan 073: Remove module scaffolding completely

## Status and intent

- Status: TODO. Priority: P1. Effort: L. Risk: MED. Confidence: HIGH.
- Category: deletion / developer workflow. Depends on: none. Complete before final documentation Plan 065 and evaluation Plan 066.
- Planned at: `1246387`, 2026-09-26.

The user states that module generation is unused and requests its complete removal, including all references and ties. Delete its executable workflow rather than repair its syntax-based verifier. Agents will author application modules directly using the current contracts and selected package checks. Do not build a replacement generator, manifest interpreter, or generic verification CLI.

## Current dependency chain

The root scripts expose `scaffold:bounded-module` and `verify:module`. `scripts/integrate-bounded-module.mjs:6` imports configuration/metadata from the generator. `scripts/verify-module.mjs:9` imports generated-path discovery, metadata, and validation. Its static checks require exact generator source text. `scripts/check-surface-architecture.mjs:6` imports its fixture and generator, then runs generated-source checks near line 704. Evaluation requests still invoke the CLI. Root README links a removed `references/bounded.md` guide.

The evidence recorder is independent: `scripts/module-evidence.mjs` captures inputs and records commands without importing the generator. The current module skill uses it directly. Keep that tool and its independent tests. `module-ui-check.mjs` also has direct source/UI-contract uses; inspect and retain those, removing only generator-specific paths if any.

## Removal scope

Delete the following complete owners and their dedicated tests:

- `scripts/scaffold-bounded-module.mjs` and `.test.mjs`.
- `scripts/integrate-bounded-module.mjs` and `.test.mjs`.
- `scripts/verify-module.mjs` and `.test.mjs`.
- `scripts/test-support/bounded-fixture.mjs` after all consumers are removed or rewritten for independent behavior.

Inspect `scripts/module-tooling.test.mjs` case by case. Delete generator/integrator/verifier cases. Move any unique evidence-recorder assertion to its existing test owner, then delete the empty mixed suite. Do not retain a renamed generator fixture just to keep obsolete tests alive.

Remove related commands/assertions from `package.json` and `scripts/module-skills.test.mjs`. Remove generation execution from `scripts/check-surface-architecture.mjs` and its tests while preserving checks of real app source and current architecture rules. Inspect `apps/web/src/framework/__type-tests__/plan057_generated_users/`: retain only independently useful compiled public-contract cases, convert them to clearly named hand-authored fixtures, and remove their manifest and generation/equivalence ties. Delete duplicates rather than preserve them by habit.

Search and clean README, `packages/loom/README.md`, docs, skills, CI, evals, and plans. Delete generator-only evaluation cases, JSON manifests, prompts, result artifacts, and generator-only historical documents. For mixed documents, remove obsolete sections and broken references while retaining unrelated content. Historical reports that lose their integrity through removal must be removed or explicitly retired; never recompute hashes to portray edited evidence as original. Git history preserves deleted material; do not rewrite Git history.

The completion exception is this retirement plan and its execution ledger, which must name deleted owners to prove removal. No other runnable example, obsolete plan instruction, link, manifest, import, test, or script may keep the removed workflow alive. Record every remaining textual match and justify it; broad exclusions for historical directories are forbidden.

Preserve application modules previously produced by the generator, API runtime routing, Vue file-route generation, Drizzle migrations/tooling, package synchronization, local environment setup, evidence recording, and independent UI/source checks. “Remove the module generator” does not mean remove other required code generation or existing product features. Preserve all unrelated dirty skill and test edits, including the current changes in `module-skills.test.mjs`.

## Execution rules

This is an approved plan, not completed implementation. Read root AGENTS, the current resource architecture, and `test-audit` before source/test edits. Use the applicable web skill for app changes. Read this entire plan. Preserve existing local work; record `git status --short` before editing. Add no implementation comments, compatibility aliases, broad type suppressions, unrelated formatting, installs, commits, pushes, migrations, or seeds.

Run the drift command first. Compare changed owners with the excerpts below and reconcile approved predecessor changes. Stop on incompatible drift, an out-of-scope requirement, or two failed bounded correction attempts. Do not weaken a contract to make a check pass. Record command, exit status, and actual selected tests in this plan; update the index after review. The local test skill references unavailable OpenClaw tools: report those as unavailable rather than successful checks. App type checks can generate route artifacts; preserve unrelated work.

## Commands

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- scripts package.json README.md packages/loom/README.md docs .agents evals plans apps/web/src/framework/__type-tests__ .github` | Review affected content and local edits |
| Reachability | `rg -n --hidden -g '!.git/**' -g '!node_modules/**' -g '!pnpm-lock.yaml' 'scaffold-bounded-module|integrate-bounded-module|verify-module|scaffold:bounded-module|verify:module|bounded-fixture' .` | Final matches only in retirement plan/ledger |
| Secondary inventory | `rg -n -i 'bounded.module|module generator|module scaffolding|generated user|plan057_generated_users' scripts docs .agents evals plans README.md packages/loom/README.md apps/web/src/framework/__type-tests__ .github` | Classify every match; no live dependency remains |
| Tooling | `pnpm test:module-tooling` | Exit 0; surviving tests selected |
| Architecture | `pnpm test:surface-architecture` | Exit 0 on real source |
| Types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0 |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |

## Ordered steps and proof

1. Create `plans/073-removal-ledger.md` with an exact file/action inventory from both searches, imports, package scripts, CI, eval case inputs, and linked documents. Run baseline Tooling and Architecture. Read mixed test files before deleting anything. Classify keep/delete/edit for each owner; include why each retained tool is independent.
2. Remove dependent execution/test paths, the three CLI owners, dedicated tests, fixtures, and root commands in one coherent change. Preserve real architecture scanning. Run Tooling and Architecture; fix broken imports by removing obsolete consumers, not by adding stubs.
3. Reconcile compiled app fixtures and evaluation cases. Keep independent business task inputs as ordinary task specifications only when a surviving evaluator uses them. Delete unused manifests and dangling case/input links. Run Types and App. Check eval JSON parses and every surviving case input exists with a one-off Python command; record that command/output in the ledger.
4. Remove every remaining workflow reference across active and historical checked-in material. Update the already-approved plans so none can restore the generator. Plans 065/066 must consume the direct-authoring workflow. Run both searches; list the bounded retirement-only matches in the ledger. Check local Markdown links in edited files with a one-off path resolver and record zero missing targets.
5. Run Tooling, Architecture, Types, App, and `git diff --check`. Review deleted coverage: remaining tests must still protect real routing/access/source contracts. Compare final status with initial dirty work. Record exact removals and evidence, then mark the index row done.

## Done and stop conditions

- [ ] No generator, integration CLI, syntax-template verifier, their commands, compatibility entry points, or dedicated fixtures remain.
- [ ] No active or historical checked-in instruction links to or asks agents to use them; only retirement evidence names the removed owners.
- [ ] Every surviving tool runs independently, and every surviving eval input/link resolves.
- [ ] Existing product modules and independent code generation remain intact.
- [ ] Required gates pass; no replacement scaffolding layer was added.

Stop if a supposedly dedicated helper owns necessary runtime behavior; identify that behavior and move only that responsibility to its existing owner. Do not stop merely because references are numerous. Complete their removal within this declared scope. Report any baseline/unavailable check separately rather than deleting it to obtain a pass.

## Evidence

Planning only. The import graph and active/historical references above were inspected. Removal and its verification have not run.

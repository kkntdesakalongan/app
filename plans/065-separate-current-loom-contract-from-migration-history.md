# Plan 065: Separate the current Loom contract from migration history

Historical plan and verification record. Plan 077 supersedes the UI checker
command recorded below; it remains past evidence and is not a current check.

## Status and intent

- Status: DONE. Priority: P3. Effort: M. Risk: LOW. Confidence: HIGH for the mixed document; benefit to agent performance remains unmeasured.
- Category: documentation direction. Depends on: 073, DONE. The direct-authoring guide is published before the remaining repairs. Update it as each contract ships; pending behavior remains marked as a current limit.
- Planned at: `1246387`, 2026-09-26.

Keep one authoritative description of current Loom behavior. Move execution order, migration inventories, old paths, and historical acceptance records out of the normal authoring path. Preserve the reasons for consequential rules, executable examples, and links. This is an editorial reorganization, not permission to change architecture or add another specification.

The current architecture path remains the authoritative entry point. This avoids a repository-wide pointer migration. The shorter current document must still answer who owns a behavior, what an author writes, which boundary checks it, and how it is verified.

Read root `AGENTS.md`, `writing-for-agents`, and the entire current architecture before editing. If editing a test becomes necessary, read `test-audit` and stop for scope review rather than adding document-string tests. No implementation code, package updates, installs, commits, pushes, or external writes belong to this plan.

## Current state

- `docs/resource_system_overhaul/ARCHITECTURE.md:1` calls itself an implementation specification and names the initial-overhaul baseline. It has 1,023 lines at the planning baseline.
- Sections 1–8 contain current API/ownership rules and examples.
- Section 9 begins at line 854 with `Blast radius and removal`; section 11 at line 977 covers execution/completion. Both mix migration instructions into the current reference.
- `packages/loom/README.md:7` sends authors to the architecture for the full contract. It also lists compiled/browser examples under `Executable examples`.
- `docs/architecture/web-application-architecture.md:3` sends app authors to the same architecture.
- `scripts/check-surface-architecture.mjs:18` explicitly scans the current architecture path as active guidance. Agent skills and root AGENTS point to it. Preserve that path and its role.

Current opening excerpt:

```text
Implementation specification for Loom, Carta web integration, application consumers, source checks, tests, and agent instructions.
```

Current ownership excerpt:

```text
Definitions are transparent, read-only objects. Mounted primitives own mutable state. Resources bind operations without interpreting fields.
```

Keep the second rule and other live contracts. Archive the first document's delivery framing. Match `docs/architecture/web-application-architecture.md`: owner table, short concrete examples, and links to exact source/test owners. Apply `writing-for-agents`: put the normal author path first and disclose uncommon reference details through links.

## Scope

- `docs/resource_system_overhaul/ARCHITECTURE.md`
- `docs/resource_system_overhaul/history/architecture-before-current-guide.md` (new archival document)
- `packages/loom/README.md`, only reference/example descriptions needed for the split
- `docs/architecture/web-application-architecture.md`, only reference/example descriptions needed for the split
- `plans/065-loom-contract-inventory.md` (new audit ledger and link inventory)
- This plan and its `plans/README.md` row.

Do not edit skills, AGENTS, DESIGN, historical plan bundles, source code, tests, static-checker rules, or CI. Keep existing inbound heading anchors available at the current architecture path. If that cannot be done without significant stale content, stop and propose a bounded link migration. Do not rewrite the user’s current skill work.

## Target document and preservation rules

The active architecture should start with a current-contract label, a small owner/API table, and the shortest valid form/table/detail/resource examples. Put a normal module authoring path first: selected behavior, schema/transport, surface definition, resource binding, thin route, focused checks. Show which steps are conditional and one current compiled example for each. Keep renderer implementation, compiler internals, migration evidence, and rare extension details outside that normal path. Group the remaining current rules by author task: schemas/drafts, input props and behavior, display, operation binding, page/wrapper lifecycle, query/transport, assets, extension points, and verification.

Keep these non-obvious rules explicit when implemented. Verify each against source; until its repair ships, document the current limit and link to the pending plan rather than present the target as current:

- Schema input, editable draft, and parsed submit output are different contracts; null/unset behavior stays unchanged.
- Every input declares its renderer; component props/models are canonical; no inferred choices or generic conversion path returns.
- Form owns one session; wrappers forward its contract; current model-prop presence differs from an absent model.
- Resource submit replacement replaces access/invalidation as an explicit new operation.
- Immutable binding context, identity-bearing write results, post-write handling, and current permissions remain resource/session responsibilities.
- Display constructors are context-free; runtime formatter/query checks need mounted context.
- Controlled collection query state has one parent owner; filters explicitly declare owned query keys and reverse draft mapping.
- Core source unions enforce one data/load owner, with runtime presence checks retained.
- Form compact types and input mode models have their own canonical owners; resource binding adds operations and context.
- File Manager listings use managed entries; provider input conversion uses canonical assets.
- New row metadata requires a new operation binding; server authorization remains final.

Do not use the line count as acceptance. Reduce duplicate explanation and history, not required nuance. Keep all currently linked anchors at the authoritative path; an old migration heading can become a short historical pointer with the same heading. A heading retained for link stability is not a compatibility API wrapper.

Complete Plan 073 first; do not restore removed generation material from an older revision. Before rewriting, copy the complete then-current architecture into the archive with a prominent `Historical snapshot; not the current authoring contract` notice and a link back. Record its source commit plus any uncommitted relevant diff in the inventory. Repair relative links in the moved snapshot by the directory-depth change and record the mapping; do not rewrite historical semantics or statuses.

The inventory maps each old numbered section and each normative rule group to `retained`, `merged`, or `archived`, with its new anchor and reason. Include a separate list of executable examples and the real check that compiles/runs each. No rule can be dropped only because the author considers it obvious.

## Commands

Run from root. Existing gates must exit 0; searches are evidence collection and may exit 1 when there are no matches.

| Purpose | Command |
|---|---|
| Drift | `git diff --stat 1246387..HEAD -- docs/resource_system_overhaul/ARCHITECTURE.md packages/loom/README.md docs/architecture/web-application-architecture.md` |
| Local work | `git status --short` and `git diff -- docs/resource_system_overhaul/ARCHITECTURE.md packages/loom/README.md docs/architecture/web-application-architecture.md` |
| Inbound links | `rg -n 'resource_system_overhaul/ARCHITECTURE\.md' AGENTS.md README.md docs .agents packages/loom/README.md apps/web/README.md scripts .github` |
| Architecture gate | `pnpm test:surface-architecture` |
| CI contract | `node --test scripts/web-validation-workflow.test.mjs` |
| Compiled examples | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` |
| App examples | `pnpm --filter @southneuhof/framework-web type-check` |
| Whitespace | `git diff --check` |

The audit passed Loom types and unit tests; it did not validate this future document split. There is no repository-wide Markdown link-check command established here. Use the one-off link verification in step 4 and record its exact command/output. Do not add a new permanent documentation parser merely to check this change. App types may generate route artifacts; inspect and preserve unrelated changes.

## Steps

1. Confirm Plan 073 and record the actual status of all other repairs; they are not publication blockers. Record drift/local work, all inbound links including fragments, and the current headings. Read the architecture and referenced source for every rule being summarized. **Verify:** run Inbound links and baseline Architecture gate; the inventory names the top-level sections that remain after removal and all discovered inbound fragments. Do not recreate retired sections to reach an old count.
2. Create the historical snapshot and record provenance. Draft the section/rule mapping before deleting active prose. Preserve current code behavior, including only completed 061–064 and 067–076 changes. **Verify:** a one-off Python comparison confirms the snapshot body matches the pre-edit text except the recorded notice/link rebasing; record the comparison and its exit 0 in the inventory.
3. Rewrite the active guide according to Target document. Keep public API spelling and examples aligned with the current source. Prefer links to existing compiled examples over another long uncompiled example. Use only the three scoped active documents; keep archive and current labels distinct. **Verify:** Architecture gate and Compiled examples pass. Compare the inventory with the final headings: every old rule group has a destination or an explicit historical classification.
4. Validate every local Markdown link in the three edited active files and the archive. Use a one-off Python script to resolve relative paths, strip fragments for filesystem existence, and separately compare inbound fragment identifiers with the retained active headings/anchors. Ignore external URL reachability; do not claim it was verified. Fail with the source file and target for any missing path/anchor. **Verify:** record the exact command and zero missing local paths or inbound anchors. The ledger itself must link to existing paths.
5. Run Architecture gate, CI contract, Compiled examples, App examples, and Whitespace. Review the diff as a semantic preservation check using the inventory, not a word-count goal. Record commands/results and update the index. **Verify:** all gates pass and no task-owned source/skill/test/CI change exists.

## Done, stops, and maintenance

- [x] One current entry point remains at the same architecture path.
- [x] Current rules, exceptions, and ownership are preserved and traceable in the inventory.
- [x] Migration instructions are clearly historical and linked out of the normal author path.
- [x] Local links and existing inbound fragments resolve.
- [x] Examples point to actual compiled/runnable owners; no proposed behavior is described as shipped.
- [x] No new prose-matching tests, document interpreter, or parallel specification.

Stop if source and an approved current rule disagree, if a rule's status is unknown, if the split requires out-of-scope pointer changes, or if a gate fails twice after a bounded correction. Record the disagreement instead of silently choosing a new policy. If a repair is pending, document current behavior accurately and leave its target out of current examples. Reconcile only affected sections when that repair ships.

Future changes should update the active contract and its executable example. The historical snapshot remains historical. Shorter text alone is not evidence of improved agent performance; Plan 066 measures that separately.

## Execution evidence

STATUS: COMPLETE

STEPS:

1. Done. Plan 073 was complete. The committed drift check returned no diff. I reviewed and preserved the uncommitted Plan 073 changes. The baseline architecture gate passed with 18 tests and the real-source check. The inbound scan found 14 Markdown links and 4 fragments, all valid.
2. Done. The archive body matches the pre-edit architecture SHA-256 recorded in [the contract inventory](065-loom-contract-inventory.md). No source-relative Markdown links needed rebasing.
3. Done. The current owner map, direct author path, compiled examples, and pending repair limits are active at the existing architecture path.
4. Done. The one-off link check found no missing local path or anchor across the active documents, archive, and inventory. External URL reachability was not checked.
5. Done. The gates below passed. The inventory maps each old section and rule group to its current or historical destination.

VERIFICATION:

- `pnpm test:surface-architecture`: exit 0; 18 tests and the real-source check passed.
- `node --test scripts/web-validation-workflow.test.mjs`: exit 0; 2 tests passed.
- `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json`: exit 0.
- `pnpm --filter @southneuhof/framework-web type-check`: exit 0; route contract, route generation, and Vue types passed. No new tracked route artifacts were created.
- `node scripts/module-ui-check.mjs --sources 'apps/web/src/routes/(authenticated)/settings/users'`: exit 0; selected template checks passed. This check did not review design, runtime, or acceptance.
- `git diff --check`: exit 0.
- Snapshot comparison: exit 0; the full body matches the pre-edit SHA-256.
- Markdown check: exit 0; 106 local links resolved across 5 Markdown files, with no missing paths or anchors.

FILES CHANGED FOR PLAN 065:

- `docs/resource_system_overhaul/ARCHITECTURE.md`
- `docs/resource_system_overhaul/history/architecture-before-current-guide.md`
- `packages/loom/README.md`
- `docs/architecture/web-application-architecture.md`
- `plans/065-loom-contract-inventory.md`
- This plan and `plans/README.md`

NOTES: No source code, tests, skills, or CI files changed for Plan 065. Plans 061–064, 066–072, and 074–076 remain TODO. No performance claim is made. No commit or push was made.

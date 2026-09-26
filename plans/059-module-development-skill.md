# Plan 059: Rebuild the module development skill

- Status: DONE
- Planned at: `1246387`, 2026-09-26
- Priority: P1
- Effort: M
- Fix risk: MED — shared references must keep their callers valid.
- Dependencies: none
- Authority: the user requested a complete audit and implementation, with the general workflow intact.

## Audit scope and findings

Read the complete development skill, all its references, template, scripts and tests;
the design, plan, review and layer-skill callers; the recent surface migration;
current architecture, resource, transport and adapter owners; and tooling checks.
History: `223fc62` changed the surface contract; `3f51d1b` updated two development
references; `1246387` completed the next implementation batch. The entry workflow
still largely comes from `7898f0d`.

Evidence line numbers below refer to `1246387`.

| Finding | Category | Impact | Effort | Fix risk | Confidence | Evidence |
|---|---|---|---|---|---|---|
| Removed identity declarations remain prescribed | Correctness | Agents can use field keys or tuples where the API requires a function | S | LOW | HIGH | `references/contract-rules.md:23`; `packages/loom/src/resources/defineResource.ts:18` |
| Asset section links are broken | Docs | API and form agents miss the shared asset contract | S | LOW | HIGH | `references/frontend-field-contract.md:65`; `.agents/skills/build-resource-form/SKILL.md:28` |
| Guidance misses query and override boundaries | Migration | An agent can parse queries twice or replace a guarded submit without preserving its policy | S | MED | HIGH | `references/web-query-cache.md:29`; architecture sections 2.4 and 7.5; `apps/web/src/framework/hono/actions.ts:43` |
| The main workflow is spread across repeated instructions | Architecture / DX | The agent must reconcile process selection, approval, setup and review across multiple files | M | MED | HIGH | `SKILL.md:16`; `references/standard-module.md:39`; `references/execution.md:89`; `references/verification-strategy.md:145` |
| Worksheet code accepts excluded browser evidence | Correctness / tests | A DONE worksheet can use evidence outside the delivery contract; tests reinforce that behavior | S | MED | HIGH | `scripts/check_worksheet.py:113`; `scripts/test_check_worksheet.py:21`; `references/module-execution-worksheet.md:59` |
| Unused browser guide adds a second task inside the skill | Docs | A 111-line guide has no active caller and describes work excluded by the entrypoint | S | LOW | HIGH | `references/ui-automation.md:1`; repository reference search |

Development-relative paths in the table start at
`.agents/skills/carta-module-development/`.

Security review covered write authority, secret handling and test-target safety.
Performance review covered discovery and repeated context loading. Dependency
review covered skill callers and local helpers. No separate runtime security,
performance, dependency-version or product-direction changes are justified.
This is not a framework or application audit; application behavior, deployment,
live services and whole-repository test coverage are excluded.

## Intended result

Keep design, explicit design approval, planning, implementation, early preview
and final review. Keep standard records for local rules and full worksheets for
coupled workflows or required traceability. Retain valid approvals and evidence
on resume. Use short ordered steps and read references only at their trigger.
Keep the existing automatic invocation policy.

Each rule has one owner. Preserve shared reference anchors that other skills use.
Remove the duplicate cross-layer checklist after moving its unique requirements
to execution. Remove the unreferenced browser guide. Keep asset semantics in
the shared field reference and query semantics in the cache reference. Use
current implementation links instead of another copied resource example.

## Scope

Modify `.agents/skills/carta-module-development/**`, this plan and `plans/README.md`.
Make the minimum corresponding change to the obsolete journey-table instruction
in `.agents/skills/carta-module-design/references/module-contract.md`.
Reconcile `.agents/skills/verify-carta-module/SKILL.md` with the existing full-path
UI contract requirement if scenario review finds conflicting instructions.
Keep application code, framework packages, other skill workflows and root
command configuration unchanged. No commits, pushes or live writes are needed.

## Execution

1. Rewrite the entrypoint, standard process, execution and verification references.
   Keep each stage's completion condition and every necessary shared anchor.
2. Update field/cache guidance from architecture sections 2–7 and current owners.
   Restore `asset-fields`; remove obsolete identity options and duplicate advice.
3. Remove browser checking from the worksheet helper. Accept only API/UNIT
   evidence; reject active browser mappings. Remove empty journey boilerplate
   from new templates and the design contract. Preserve old history on resume.
4. Replace browser-specific helper tests with meaningful API/UNIT completion,
   dependency, evidence and browser-rejection cases. Retain existing coverage
   of duplicate IDs, missing assertions and stale evidence.
5. Validate links, metadata, helper behavior and scope. Use an independent
   scenario pass if available under skill-creator's forward-testing instruction.
   Keep evaluation read-only and use temporary paths for any artifacts.

## Verification and done criteria

Run from the repo root:

- `python3 .agents/skills/skill-creator/scripts/quick_validate.py .agents/skills/carta-module-development` — valid.
- `python3 -B -m unittest discover -s .agents/skills/carta-module-development/scripts` — all pass.
- `node --test scripts/module-skills.test.mjs scripts/module-tooling.test.mjs` — all pass.
- `pnpm test:surface-architecture` — all pass.
- `git diff --check` — exit 0.

Check relative file links and fragments in the changed documents and incoming
links from module skills. Review scenario choices for new CRUD, an approved
resume, a coupled workflow, a custom submit and a blocked migration. No wording
snapshots or line-count tests. Application builds, live setup and browser tests
do not validate this skill edit and are excluded.

Before implementation, use `git diff 1246387 -- .agents/skills/carta-module-development`
to detect concurrent edits. Preserve any such edits. Stop the affected change
if a shared caller needs a wider workflow change or validation needs live writes.

## Considered and rejected

- Remove design approval: changes the workflow the user asked to retain.
- Replace all records with worksheets: removes the existing standard path.
- Rewrite adjacent skills: expands the task; only repair the changed helper contract.
- Add a new documentation parser or tests for prescribed prose: does not prove
  useful agent behavior. Use existing checks plus scenario review.

## Maintenance

Keep surface facts tied to architecture and current code. Shared links are part
of the skill interface. Keep runtime evidence distinct from source inspection.
Record validation results here after review.

## Implementation and review evidence

- Replaced the entrypoint with five ordered stages and conditional layer pointers.
  Kept the design approval gate, standard/full split, early preview, resume,
  repair, and final review requirements.
- Reduced development instruction prose from 7,042 to 3,642 whitespace-separated
  words (48.3%). This measures SKILL.md and references, excluding the worksheet
  asset. Removed two references; retained all incoming shared anchors.
- Corrected identity authoring, draft/date mapping, query parse ownership,
  explicit context, submit override policy, post-write errors, and asset pointers.
- Removed the browser-report CLI and validator. API/UNIT evidence now defines
  the worksheet contract. New worksheets omit journey boilerplate; old empty
  tables remain harmless. Populated browser mappings fail with a migration message.
- Kept the initializer: it already preserves existing work and rejects invalid
  feature paths. Existing tooling tests exercise those guarantees.
- Made two narrow adjacent-skill fixes: remove obsolete required journey tables
  from the design contract, and scope the reviewer's UI JSON exemption to
  standard work. Full-process web work retains the existing planner requirement.

Validation:

| Check | Result |
|---|---|
| Skill quick validator | PASS through `uv run --no-project --with pyyaml python .agents/skills/skill-creator/scripts/quick_validate.py .agents/skills/carta-module-development` |
| Python worksheet suite | PASS, 2 test methods with completion, dependency, coverage, stale evidence, rejected browser surfaces/mappings, and absent-table cases |
| Module skills and tooling | PASS, 20 tests; five skill tests rerun after the adjacent review fix |
| Surface architecture | PASS, 19 tests and source scan |
| Relative file and fragment scan | PASS, 144 links across seven active skill folders |
| Regression against original checker | Expected FAIL on acceptance of excluded browser evidence, in a temporary directory; revised checker passes |
| Diff whitespace and scope | PASS; application and framework code unchanged |

The direct system-Python validator attempt failed because PyYAML was absent.
The isolated uv environment resolved that prerequisite without changing repo
runtime dependencies. No application build, live database, or browser checks
were run; this change does not establish application runtime behavior.

An independent read-only scenario review covered new CRUD, approved resume,
coupled workflows, custom submit/value handling, and migration conflict. It
selected the intended process and stop conditions. It found the adjacent UI JSON
ambiguity recorded above; the review exemption was corrected to match the
existing planner requirement. The independent reviewer re-read the correction and returned PASS with no
remaining blocking findings. Scenario review tests instruction choices, not
successful implementation of five real modules.

Verdict: APPROVE after scope and diff review. No commits or external publication.

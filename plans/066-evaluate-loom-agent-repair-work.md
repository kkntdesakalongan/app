# Plan 066: Measure agent work on three concrete Loom tasks

## Status and intent

- Status: TODO. Priority: P3. Effort: M for case preparation; run cost depends on the available agent harness. Risk: LOW to product source.
- Category: direction/evaluation spike.
- Depends on: completed 061–065 and 067–076 for the candidate comparison. Case preparation can start earlier. Use the baseline described below, not an inferred historical environment.
- Planned at: `1246387`, 2026-09-26.

Create a small repeatable evaluation of whether Loom's repairs and current guide reduce agent mistakes and repair work. Measure real results from isolated runs. Do not infer improvement from line counts, test counts, shorter answers, or a single successful transcript. The deliverable is an evaluation kit plus an honest pilot report, not a new application module or evaluation platform.

This comparison measures the post-audit improvements against `1246387`. It does not prove that the entire overhaul beat the pre-overhaul architecture. Comparing that older architecture would also change APIs, tooling, and fixtures; report that as a separate future experiment rather than mixing the conclusions.

Read root `AGENTS.md`, `writing-for-agents`, `evals/carta-module-workflow/README.md`, and `grading.md`. Apply `test-audit` if adding executable test fixtures. No product changes, package upgrades, installs without need, commits, pushes, production access, migrations, seeds, or external messages are part of this spike.

## Current state and conventions

`evals/carta-module-workflow/README.md:1` says the current cases are behavioral inputs, not proof of reliable skills. Its comparison protocol requires isolated baseline/candidate copies with the same model, harness, request, and user replies. Keep that protocol.

`cases.json` uses entries such as:

```json
{
  "id": "custom-relations",
  "stage": "execute",
  "request": "Run the selected task and report the observed result.",
  "inputs": ["fixtures/workflow/custom-relations.md", "fixtures/workflow/custom-relations.json"]
}
```

This excerpt shows the shape, not a literal replacement for the existing request. Preserve independent existing cases after Plan 073 has removed generator-only cases and inputs. Do not restore those retired cases. `grading.md` is evaluator-only; source code and result artifacts, not headings or keywords, determine acceptance.

Current Loom reference owners are `packages/loom/src/components/inputs/useOptionSource.ts`, `components/composites/form-inputs/LookupInput.vue`, `forms/defineForm.ts`, `resources/bindResource.ts`, and `apps/web/src/routes/(authenticated)/settings/users/users.resource.ts`. They provide dependency invalidation, raw input/output transformation, explicit record context, and operation binding. Read these owners before preparing fixtures; do not invent an API from this plan's business examples.

## Scope and deliverables

Change only:

- `evals/carta-module-workflow/cases.json`, append three uniquely named cases
- `evals/carta-module-workflow/grading.md`, add a separate Loom rubric
- `evals/carta-module-workflow/README.md`, link the new protocol/results
- `evals/carta-module-workflow/fixtures/loom/` (new prompts, preparation instructions, and bounded fixture files)
- `evals/carta-module-workflow/loom-repair-protocol.md` (new)
- `evals/carta-module-workflow/loom-repair-results.json` (new machine-readable result ledger)
- `evals/carta-module-workflow/loom-repair-report.md` (new evidence-based report)
- This plan and its `plans/README.md` row.

Per-run product/test artifacts may be written only in disposable isolated workspaces, never into this working application's routes or packages. Store large transcripts outside tracked source and record their location and content hash. Do not add a generic runner service, benchmark dashboard, database fixture, or permanent product module. Keep test transport local and deterministic.

## Fixed case contracts

Each worker gets one self-contained request and the same prepared starter files. Include complete business behavior, API function signatures, allowed file list, and acceptance commands. Do not make the worker resolve unspecified product policy.

### Case A: Dependent selection

An editor selects a department and then a team. Teams are loaded with the selected department in canonical component props. A team from the previous department must clear when the department changes. A late response for the old department cannot restore that team. The loader returns `{ data: [{ id, name }] }`; team ids are strings; an unset parent provides no selectable teams. A valid new selection must reach the submitted output unchanged.

Use deterministic deferred responses, two departments, and disjoint team sets. Give the worker an existing valid parent field and ask it to complete the dependent input using the current component contract. The grader checks the actual managed input, stale response, and submit payload. No custom dependency engine, field `resetWhen`, schema renderer inference, or framework edits are needed.

### Case B: Transformed update form and a declaration error

A detail loader returns `{ id, displayName, amountMinor }`; the editor draft uses `{ displayName, amountText }`, with decimal text transformed by an explicit raw schema into `{ displayName, amountMinor }`. The accepted text is ASCII digits with an optional decimal point followed by one or two digits, from `0` through `999999.99`. Reject signs, spaces, empty text, exponent notation, a bare trailing point, and more precision; `12.34` becomes `1234`, `0.1` becomes `10`, and leading zeroes are allowed. Preserve string editing and submit numeric minor units exactly once. The fixture loader returns `amountMinor: 1234`, and its mapped draft is `amountText: '12.34'`.

The starter resource has one deliberate extra `create.typo` member in a separate minimal declaration. The worker must locate and remove that invalid configuration, not cast the resource. This is a declared repair task, not a hidden reason for the baseline to fail. Both variants receive identical starter text. The main editor has List and Update operations, with list route `loom-eval-amounts` and edit route `loom-eval-amounts-edit`; after successful update, it returns to List through the standard View behavior. Register those fixture routes in the disposable app. Do not add a Detail operation, route, or permission.

The grader checks draft mapping, raw input/output distinction, required bound submit/load types, exact target id, output, and repaired declaration. Use a post-write invalid-result response in the acceptance fixture only if both variants are asked to report the observed limitation; do not grade the baseline as a worker failure for lacking a framework feature that the worker is forbidden to change.

### Case C: Custom row command

Rows have `{ id, status, allowedOperations }`. A `verify` command receives one business payload `{ id, note }`. It requires a declared permission and may run only for a row whose current bound policy allows `verify`. The command call must receive only the business payload, with record context bound separately through `withContext({ record })`. Keep a permission-denied row and a row-policy-denied row separate so a test cannot pass for the wrong denial.

The grader checks that `can` and `run` use declared permission/row context, denied calls do not reach transport, an allowed call preserves payload and result, and invalidation follows the bound resource path. The worker changes only application fixture code; it does not modify backend permissions, inspect payload trailers, or add framework wrappers.

## Comparison protocol and result schema

Pin baseline `1246387` and a recorded candidate commit/tree containing 061–065 and 067–076. If candidate changes are uncommitted, capture the exact patch and hashes of included files. Record uncommitted skill changes separately; choose the same skill snapshot for both variants. Never copy local secrets, env files, database settings, or the dirty working tree wholesale.

Prepare clean isolated copies using a read-only archive of each revision plus the explicitly captured candidate patch. Use the same dependency lockfile and installed package versions; if dependencies differ materially, stop and classify the comparison as confounded. Use the same model, effort, tools, time/token cap, human answers, and starter fixture for each pair. A concrete default is one fresh run per case per variant; repeat any ambiguous pair before drawing a directional conclusion. Record the exact budget selected before starting.

Keep evaluator tests/rubrics outside the worker's readable workspace until grading. Merely omitting them from the prompt is not blinding when the worker can search the repo. Each worker receives only public task requirements and fixture inputs. Do not expose expected implementation names as a checklist of answers. An independent evaluator grades source, transcript, and actual acceptance results; record when only self-review is available.

Each JSON run record must contain: case id, variant, source revision/tree hash, skill hash, fixture hash, model/harness/version, budget, start/end timestamps, status, acceptance results, failed command count, repair attempts, type casts/suppressions added with justification, unnecessary wrappers/framework edits, files actually read when observable, transcript/artifact paths and hashes, elapsed time/tokens only when measured, and evaluator notes. Use `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN`. Missing counts are null with a reason, never zero.

Report quality and cost separately. A faster incorrect run is not an improvement. A framework baseline failure is not a worker mistake. A new cast is not automatically bad if it protects a real external boundary, but suppressing the deliberate declaration error fails the task. Do not use question count alone as a quality score.

## Commands and acceptance preparation

Run from repo root unless inside a disposable workspace.

| Purpose | Command / required outcome |
|---|---|
| Drift | `git diff --stat 1246387..HEAD -- evals/carta-module-workflow` and `git status --short`; reconcile existing case changes |
| Case inventory | `node -e 'const fs=require("node:fs"); const c=JSON.parse(fs.readFileSync("evals/carta-module-workflow/cases.json","utf8")); const ids=c.cases.map(x=>x.id); if(new Set(ids).size!==ids.length) process.exit(1); console.log(ids.length)'`; exit 0, unique ids |
| Fixture compilation, isolated workspace | `pnpm --filter @southneuhof/framework-web type-check`; starter has only its explicitly seeded error, completed reference fixture exits 0 |
| Focused acceptance, isolated workspace | `pnpm --filter @southneuhof/framework-web test:focused -- framework/__tests__/loom-agent-eval.spec.ts`; all named case assertions pass for the prepared reference implementation |
| Loom regression baseline | `pnpm --filter @southneuhof/loom test`; record exit/count for each variant, do not silently fix it |
| JSON syntax | `python3 -m json.tool evals/carta-module-workflow/loom-repair-results.json`; exit 0 |
| Whitespace | `git diff --check`; exit 0 for task-owned changes |

The acceptance test path is new and exists only after preparation in the disposable web workspace. The protocol must state the exact copy/install paths for each fixture and test. The test is not an existing command result. Use the package's existing Vue/Vitest setup, real Loom components and binder, and mocked transport only. A missing browser or worker harness is BLOCKED/NOT_RUN, not proof from a screenshot or fabricated transcript.

## Steps

1. Record drift and read existing protocol/rubric and named source owners. Define the three case prompts, allowed app files, complete transport types, and acceptance ids. **Verify:** Case inventory exits 0 after appending; every new `inputs` path exists and each acceptance id maps to a stated business requirement.
2. Prepare starter and private acceptance fixtures in the new fixture directory, with explicit instructions for materializing them in disposable workspaces. Build one reference completion per case only for validating the grader; do not give it to workers. **Verify:** in each applicable revision, reference Fixture compilation and Focused acceptance pass, with baseline limitations separated. Reintroduce each intended defect in a disposable copy and confirm its acceptance check fails for the intended reason.
3. Write the pinned comparison protocol and JSON ledger skeleton with all six paired runs initially `NOT_RUN`. Include exact source/skill/fixture hashes and the selected budget. **Verify:** JSON syntax and Case inventory pass; one-off validation confirms three unique case ids, one baseline/candidate record per case, and all required fields present.
4. Run the paired pilot if a fresh-session worker harness is available and authorized for local evaluation. Preserve its actual transcript and command output. If it is unavailable, finish the kit, mark affected runs BLOCKED/NOT_RUN, and state the exact missing capability; do not impersonate six independent agents in one conversation. **Verify:** for every attempted run, execute the private acceptance commands against that worker's artifacts and store the real outcome. Check transcript/artifact hashes against the ledger.
5. Write a report separating correctness, repair work, runtime limitations, and observed cost. With only one pair per case, call findings exploratory. Recommend at most the next bounded repair supported by results; a no-change conclusion is valid. **Verify:** every factual outcome links to a ledger run/artifact, unmeasured values remain null, and all unrun cases are explicit. Run JSON syntax and Whitespace; update plan/index with `KIT READY / PILOT BLOCKED` if appropriate, never DONE for an unrun required pilot.

## Done, stops, and maintenance

- [ ] Three self-contained prompts, starter fixtures, private grader, and preparation instructions exist.
- [ ] Reference solutions pass; seeded defects fail for the intended reason.
- [ ] Source/skills/fixture/model/budget differences are recorded and controlled.
- [ ] Each pilot outcome has real artifacts and acceptance results, or an explicit blocked/not-run status.
- [ ] The report makes no claim about the original overhaul or statistical reliability that this experiment cannot support.

Stop comparison runs for unequal material dependencies, leaked grader data, missing isolation, a fixture that tests an unsupported API, or a needed real backend write. Stop after two failed fixture-preparation attempts and report the contract mismatch. A missing harness blocks the pilot, not preparation of useful cases. Do not change product source to make an evaluation pass.

For future reruns, preserve prior immutable records and append new run ids. Change the fixture version when the API or acceptance behavior changes; do not compare different fixture versions as if only the agent architecture changed.

## Execution evidence

Not executed. This is a design/spike plan; no agent efficiency claim has been established.

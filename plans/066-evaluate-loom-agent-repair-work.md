# Plan 066: Measure agent work on concrete Loom authoring and repair tasks

## Status and intent

- Status: KIT READY / PILOT BLOCKED — applicable references and seeded defects pass; the local Codex CLI can read outside worker CWD, so the private grader is not isolated. Ten paired records are BLOCKED and no worker started. Priority: P3. Effort: M. Risk: LOW to product source.
- Category: direction/evaluation spike.
- Depends on: no repair for baseline preparation/runs. Capture the baseline before implementation where the available harness permits. Each candidate run names the repairs it includes; it need not wait for all sixteen plans. Plan 073 removal and the first 065 guide publication form a useful early candidate. Use the baseline below, not an inferred historical environment.
- Planned at: `1246387`, 2026-09-26.

Create a small repeatable evaluation of whether Loom's repairs and current guide reduce agent mistakes and repair work. Measure real results from isolated runs. Do not infer improvement from line counts, test counts, shorter answers, or a single successful transcript. The deliverable is an evaluation kit plus an honest pilot report, not a new application module or evaluation platform.

This comparison measures the post-audit improvements against `1246387`. It does not prove that the entire overhaul beat the pre-overhaul architecture. Comparing that older architecture would also change APIs, tooling, and fixtures; report that as a separate future experiment rather than mixing the conclusions.

Read root `AGENTS.md`, `writing-for-agents`, `evals/carta-module-workflow/README.md`, and `grading.md`. Apply `test-audit` if adding executable test fixtures. No product changes, package upgrades, installs without need, commits, pushes, production access, migrations, seeds, or external messages are part of this spike.

## Current state and conventions

`evals/carta-module-workflow/README.md:1` says the current cases are behavioral inputs, not proof of reliable skills. Its comparison protocol requires isolated baseline/candidate copies with the same model, harness, request, and user replies. Keep that protocol.

`cases.json` uses entries such as:

```json
{
  "id": "review-semantic-defects",
  "stage": "verify",
  "request": "Review the existing category list against the approved contract.",
  "inputs": ["fixtures/approved/design.md", "fixtures/review/category-route.ts"]
}
```

Use only case IDs and input paths present in `cases.json`. `grading.md` is evaluator-only; source code and result artifacts, not headings or keywords, determine acceptance.

Current Loom reference owners are `packages/loom/src/components/inputs/useOptionSource.ts`, `components/composites/form-inputs/LookupInput.vue`, `forms/defineForm.ts`, `resources/bindResource.ts`, and `apps/web/src/routes/(authenticated)/settings/users/users.resource.ts`. They provide dependency invalidation, raw input/output transformation, explicit record context, and operation binding. Read these owners before preparing fixtures; do not invent an API from this plan's business examples.

## Scope and deliverables

Change only:

- `evals/carta-module-workflow/cases.json`, append five uniquely named cases
- `evals/carta-module-workflow/grading.md`, add a separate Loom rubric
- `evals/carta-module-workflow/README.md`, link the new protocol/results
- `evals/carta-module-workflow/fixtures/loom/` (new prompts, preparation instructions, and focused fixture files)
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

## Ownership cases added by the later audit

Retain A–C as comparison cases, but do not claim they measure every ownership repair. Add two separately scored cases using the same protocol:

- **D: Create-only module.** Supply an existing typed local create endpoint and a raw create schema. Ask for a standard resource/form and thin route, with no list or visible detail operation. No framework edits or fake endpoints are permitted. Grade valid construction, request/result, absence of invented list configuration, and source correctness. Preparation found that both baseline and candidate can express this create-only transport. Do not score an anticipated baseline limitation: case D measures whether the worker uses the existing contract and avoids invented list/detail operations.
- **E: Relation source freshness.** Supply two resources, a mounted relation picker, and a local update action that changes an option label. Ask the worker to wire the source through supported APIs so the label refreshes after the write while the selected identity is retained. Grade the real resource invalidation path and absence of private cache keys/manual picker refresh wiring. Keep identical behavior requirements across variants and record a baseline framework block where appropriate.

For each case, record the number of independent owners the worker had to inspect, stale or conflicting guidance encountered, failed repair attempts, invented endpoints/wrappers, and framework internals exposed in app code. Count only observed events with source/transcript pointers; missing telemetry is unknown. Do not treat fewer files or fewer reads as automatically better. Report correctness first, then work required. These observations test the specific meaning of agent overload used by this audit.

The extra cases belong to this small evaluation kit, not a permanent benchmark service. Run and report cases independently. A missing worker harness blocks the pilot only; it does not block documentation or product repairs.

## Comparison protocol and result schema

Pin baseline `1246387` and a recorded candidate commit/tree with an explicit completed-plan list. Never label a partial candidate as containing every repair. If candidate changes are uncommitted, capture the exact patch and hashes of included files. Record uncommitted skill changes separately; choose the same skill snapshot for both variants. Never copy local secrets, env files, database settings, or the dirty working tree wholesale.

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

1. Record drift and read existing protocol/rubric and named source owners. Define the five case prompts, allowed app files, complete transport types, and acceptance ids. **Verify:** Case inventory exits 0 after appending; every new `inputs` path exists and each acceptance id maps to a stated business requirement.
2. Prepare starter and private acceptance fixtures in the new fixture directory, with explicit instructions for materializing them in disposable workspaces. Build one reference completion per case only for validating the grader; do not give it to workers. **Verify:** applicable references compile and pass focused acceptance, and each applicable seeded defect fails for its intended reason. Baseline E is recorded as a framework block.
3. Write the pinned comparison protocol and JSON ledger with five baseline/candidate pairs and exact source, skill, fixture, plan-state, dependency, and budget captures. **Verify:** JSON syntax and Case inventory pass; one-off validation confirms five unique case ids, one baseline/candidate record per case, and all required fields present.
4. Run the paired pilot only if a fresh-session harness also isolates private evaluator data from worker reads. Preserve actual transcripts and command outputs. If isolation is unavailable, finish the kit, mark the ten current runs BLOCKED/NOT_RUN, and state the exact missing capability; do not impersonate ten independent runs. **Verify:** for every started run, execute private acceptance checks against its artifact and store the real outcome and hashes.
5. Write a report separating correctness, repair work, runtime limitations, and cost. With one pair per case, call any completed results exploratory. **Verify:** every factual outcome links to a ledger validation/run/artifact, unmeasured values remain null, and all blocked or unrun cases are explicit. Run JSON syntax and Whitespace. Keep status `KIT READY / PILOT BLOCKED`; do not mark DONE while the required pilot has not run.

## Done, stops, and maintenance

- [x] Five self-contained prompts, starter fixtures, private grader, and preparation instructions exist.
- [x] Applicable reference solutions pass; seeded defects fail for the intended reason, with baseline E recorded as blocked.
- [x] Source/skills/fixture/dependency controls and the selected model/budget are recorded before any worker start.
- [x] Each pilot outcome has real artifacts and acceptance results, or an explicit blocked/not-run status.
- [x] The report makes no claim about the original overhaul or statistical reliability that this experiment cannot support.

Stop comparison runs for unequal material dependencies, leaked grader data, missing isolation, an unexpected unsupported API beyond the explicitly recorded baseline limitations, or a needed real backend write. Stop after two failed fixture-preparation attempts and report the contract mismatch. A missing harness blocks the pilot, not preparation of useful cases. Do not change product source to make an evaluation pass.

For future reruns, preserve prior immutable records and append new run ids. Change the fixture version when the API or acceptance behavior changes; do not compare different fixture versions as if only the agent architecture changed.

## Execution evidence

### Historical checkpoint

The baseline is commit `12463870df8df3d488070ae1f9c1992cf577756d`; the first candidate was a pre-final uncommitted snapshot that excluded Plan 074. Keep its source, fixture, and run hashes as history. The current pilot instead uses baseline commit `12463870df8df3d488070ae1f9c1992cf577756d` and final candidate commit `38cb2a991a30b36c5628fbe955b2ba60a5728ded`, which includes product work from Plans 061–065 and 067–076. The fresh captures, shared lockfile, installed package versions, current instructions, skills, fixtures, and plan-state hashes are recorded in the latest ledger capture.

Historical preparation stopped before any worker session because case B had not passed. A later preparation round corrected the evaluator contract and validated all applicable reference and seeded-defect fixtures. See the dated preparation evidence below. The current capture and pilot budget are recorded. The local CLI workspace sandbox does not block reads outside CWD: from a prepared worker CWD, a read-permission check on the main checkout's evaluator file exited 0 without reading its contents. The ten newly appended records are therefore blocked by privacy isolation, not by the prior fixture failure and not by worker outcomes. Do not treat either blocked set as a quality result.

The first recorded candidate was captured on 2026-09-27 at 13:04 WIB. It is a pre-final checkpoint. The Plan 074 nested-navigation fixture changed after capture to use the same resource owner across two scoped instances; its captured file hash was `656f65502898001870002b4cd64f0c0a80ffb8b541984b405284747ea1247406`, and its current file hash is `df05d75b4b0ecf12992b1d517dca7efc8f2157f9343404c795fc9bf7ce746e51`. Root also updated plan index/status documents after capture. No pilot used this checkpoint. Its hashes do not identify the current final candidate. The current pilot-start capture records the final candidate source tree, patch, untracked archive, manifest, and plan state in the ledger.

On 2026-09-28, the case B reference `submit` parameter was given the schema output type. The corrected reference passed `pnpm --filter @southneuhof/framework-web type-check` in the disposable candidate snapshot. The snapshot was restored after the check. This does not replace the recorded failed attempts. As of 2026-09-28, case B acceptance and seeded-fail checks, cases C–E, and worker runs remained unverified. The dated final-preparation section records the later fixture checks and current worker-isolation block.


### Final preparation before the pilot

On 2026-09-29, the case B reference and grader passed in both variants. The case B seeded starter produces diagnostics for two requested repairs: the declared `create.typo` and the incomplete transformed update submit contract. Neither is an unrelated fixture compiler error. Case C's first acceptance attempt raced the initial list load. The evaluator test now waits for visible `open` then `verified` state before checking reload. The corrected reference passed on attempt two in both variants. Case D reference and seeded checks pass and fail, respectively, in both variants; the previously anticipated baseline transport block did not reproduce. Case E reference and seeded checks pass and fail in the candidate. Baseline E remains a framework block because its `defineForm` contract rejects the supported candidate resource binding; its acceptance test observes the stale label. Full command outputs are saved under `/tmp/plan066/final-validation/`.

The current baseline and final candidate use identical Node, pnpm, lockfile, installed pnpm-lock, and dependency declarations. Existing installed package trees were reused; no install ran for this capture. A fresh candidate source archive, filtered baseline-to-candidate patch, untracked-file archive, file manifest, and pilot-start plan snapshot are stored under `/tmp/plan066/final-capture/`. The latest ledger records their content hashes and current shared instruction, skill, fixture, and plan-state hashes.

The pilot uses ten independent fresh Codex CLI sessions: one baseline and one candidate run for each case. The fixed cap is 8,000 output tokens and 900 seconds per session. Each session uses GPT-6 Luna at `max` reasoning, Codex CLI 0.157.1, workspace-write tools, a fresh fixture, the exact public request, and no human replies. The CLI does not expose a hard per-session output-token cap; the prompt states the cap, the runner enforces the 900-second limit, and observed usage is recorded when the CLI reports it. This limitation is part of the protocol, not a measured result.


### Pilot isolation gate

The prepared workspaces contain only their source snapshot and one public case. The available Codex CLI 0.157.1 `workspace-write` mode still permits access outside CWD. The official [Codex sandbox template](https://github.com/openai/codex/blob/main/codex-rs/prompts/templates/permissions/sandbox_mode/workspace_write.md) allows file reads while restricting edits to CWD and writable roots. A local `codex sandbox -P :workspace` check from a prepared worker directory could read a harmless outside-CWD canary. It also returned exit 0 for `test -r` on the main checkout's private grading file; the saved check record has SHA-256 `a43fc20ddd515c99abb81574851bfc568f90460263554d1355c479dcca219fd7` and does not print file contents. The same sandbox read the public host-checkout README byte for byte (SHA-256 `e086447bcbc95471a4474ff61bb5ca1e1a5c626df12d28fc67a87cf32c3ca8ae`). Since an agent could read the reference and rubric, the harness fails the plan's blinding requirement. No model session started. The ledger appends ten fresh `BLOCKED` run IDs, leaves worker measurements null, and preserves the ten older historical `BLOCKED` records unchanged.

The remaining requirement is a fresh-session executor with a tool-enforced workspace-only read boundary. It must hide the host checkout and credentials from each worker while retaining the recorded source snapshot, public fixture, model, effort, tools, and budget.

# Verification strategy

Select checks for the requested outcome and changed boundary. Reuse current
passes when source, fixtures, dependencies, and environment remain applicable.

## Browser journeys

Module delivery, planning, and review use non-browser checks. Do not create,
run, repair, or assign browser tests, or require a manual walkthrough instead.
Inspect aggregate commands before use so they do not start browser work.
Browser testing needs a separate, explicitly requested task. Preserve old
browser evidence as history; it is not a module gate. Report rendered behavior
as unverified.

## Select proof by behavior and impact

| Changed risk | Suitable proof |
|---|---|
| Validation or conversion | Accepted and rejected values through the actual schema |
| Shared API schema imports or dependencies | Normal web build for runtime dependency checks; reuse the [boundary proof](../../../../docs/architecture/web-application-architecture.md#api-schema-boundary) when enforcement is unchanged |
| Relation | Submitted identity, returned label, edit load, and rejection of an invalid parent reference |
| Access | Allowed action and denied action with stored data unchanged |
| Filter | Results from distinguishing records and source review of query wiring |
| Workflow | Legal and illegal transitions, coupled stored effects, and rollback |
| UI composition | Source review of inputs, display values, actions, imports, and route targets |
| Migration | SQL review and relevant existing-data checks on an authorized target |
| Resource declarations | Current surface architecture check plus affected type checks |

Use current package scripts for focused tests, type checks, and lint. For route
contract, dependency, or resolution changes, run the normal SDK and web
`type-check` commands. They refresh the source contract and check route import
agreement. Raw compiler and editor checks bypass that gate. For an import
disagreement, read [route import agreement](../../../../apps/api/README.md#route-import-agreement)
and repair the reported import or resolution configuration.

Broaden checks when impact crosses owners. An aggregate count, zero selected
tests, or skipped cases do not prove a required outcome.

## Test ownership

Module tests own business rules, schemas, relation sources, dependencies,
authorization, persistence, and local coordination. Trust unchanged framework
controls. For local submit/refresh coordination, test through its real owners;
include write failure and successful write followed by refresh failure when
these have different effects.

Before adding a test, name the plausible wrong result and coverage gap. Extend
an existing suitable test. Assert public results and stored effects using
fixtures that distinguish the fault. Avoid tests that repeat configuration or
copy schema logic. Keep mocks outside the boundary being proved.

Use guarded isolated test targets. Serialize tests that share mutable data and
memory-heavy type checks. Clean up owned rows after failure too. A test that
replaces database schema needs its own isolated target.

## External integrations

Before dependent work, verify the provider's request and response contract for
the selected version and options. Use current authoritative evidence or a limited
live check through the application operation. A mock cannot prove compatibility.

Resolve live-check authority, data, cost, and request limits before the call;
credentials alone do not authorize it. Stop when evidence is sufficient or the
limit is reached. Record target, options, and results without secrets. Keep
technical errors distinct from valid negative business results. Compatibility
does not prove accuracy; use representative cases when accuracy is required.
Missing required proof remains `REWORK`, or `BLOCKED` when authority or the
environment prevents the check. Continue independent work.

## Tight loop

Run a focused check after a meaningful boundary change. Keep the command,
working directory, output, and real exit status. Classify a failure before
retrying. After two failed fixes to the same fault, report evidence and use a
different diagnostic check; if the cause stays unclear, seek focused diagnosis.
Reuse saved output rather than rerunning to read another part of it.

## Evidence interface

In the standard record, link each required outcome to a relevant assertion or
specific source-review finding. Record commands, exit status, selected cases,
source state, and non-secret target identity. Separate source review from
runtime results. Missing required evidence stays open even when executed checks
pass. A new reviewer alone does not make evidence stale.

For the full process, use API/UNIT rows in the
[worksheet](module-execution-worksheet.md). Resolve recorder usage with
`node scripts/module-evidence.mjs --help`. Include actual source, tests,
fixtures, configuration, lockfile, affected dependencies, and approved design
as inputs, including dirty and untracked files. Keep reports outside the input
set. Check freshness; retain failed and replaced reports. Documentation changes
need requirement review, not automatic runtime reruns.

## Verdicts

- `PASS`: required non-browser proof and source review are sufficient, and
  required development setup is complete. State the unverified rendering limit.
- `REWORK`: an in-scope defect or missing proof needs correction.
- `BLOCKED`: a decision, authority, or environment prevents completion.

Record the verdict before completion. Keep work under review until repairs
have been reviewed. Separate material defects and proof gaps from optional
suggestions.

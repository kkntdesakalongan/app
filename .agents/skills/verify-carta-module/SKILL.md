---
name: verify-carta-module
description: Review an implemented Carta module or completed plan against approved behavior and current verification evidence.
---

# Verify Carta module

Use [Carta module terms](../../../CONTEXT.md) for module ownership language.

Review the named result; return findings without changing source, decisions, or
execution state. Safe checks and report output are allowed within the declared
test boundary. Follow the
[review rules](../carta-module-development/references/execution.md#review-and-finish)
and label independent or self-review.

## Check the requested result

Read the request, later decisions, existing work record, and relevant diff,
including dirty/untracked work. Explicit requirements govern over inferred
design defaults. Apply [discovery reuse](../carta-module-development/SKILL.md#discovery-reuse).

Use the [standard module base](../carta-module-development/references/standard-module.md).
For full-process work, also read the
[module contract](../carta-module-design/references/module-contract.md) and
[worksheet](../carta-module-development/references/module-execution-worksheet.md).
Preserve valid records; standard work needs no worksheet, acceptance IDs, or JSON.

Review the selected operations and their consumers:

- Can the intended user find and complete each requested action?
- Do display values, loaded drafts, parsed writes, and stored results agree?
- Do access rules and workflow restrictions apply to standard and custom actions?
- Do changed filters preserve other query state, and do writes refresh affected
  collections, details, and relation choices?
- Does custom completion preserve the distinction between rejection, uncertain
  post-write outcome, and a later page failure?
- Is development setup complete, with migration/seed status and preview URL?

## Inspect the changed boundaries

Use the relevant layer skill for unresolved contracts. For web work, apply
[UI review](../web-ui-surfaces/references/verification.md) and
[DESIGN.md](../../../DESIGN.md). Check actual component imports, route targets,
input wiring, readable values, and action ownership. Check forms through
`$build-resource-form`; check resource declarations against the
[current architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md).
Run package lint and type checks plus focused behavior tests for changed owners.

Use supported components and operation bags. Inspect the whole page; a
standard View beside a replacement body does not establish compliance. Check
scope and write authority as well as behavior.

## Evaluate evidence

Apply the [verification strategy](../carta-module-development/references/verification-strategy.md)
for test ownership, freshness, external integrations, and verdicts. Module
review uses non-browser checks; report rendered behavior as unverified.

Read assertions and source findings, not only test names or pass counts.
Rerun affected checks only when proof is stale, failed, missing, or insufficient.
Framework proof covers unchanged controls; module proof must reach its own rules
and coordination. A mock cannot prove the boundary it replaces.

For full-process work, check acceptance coverage and worksheet consistency.
Use the web skill's linked verification guidance for changed surfaces.

## Return the verdict

Record `PASS`, `REWORK`, or `BLOCKED` under the shared verdict rules. Return:

- Scope, review mode, requested outcomes, and preview status.
- Checks used, evidence freshness, and unverified outcomes.
- Blocking defects with user, access, or data consequences.
- Required proof gaps, separate from optional improvements.

A scoped review does not complete the whole module. Return in-scope defects to
the executor for repair. Optional suggestions do not prevent `PASS`.

# Standard module base

Use requested CRUD as the base. Add custom operations and their restrictions
to the same design. Select list, detail, create, update, and delete separately;
a new entity does not imply all five actions.

## Select the process

Use one [module design](../../carta-module-design/references/module-contract.md)
at `plans/<feature>/design.md`, or retain an existing equivalent record.
Record the selected process, scope, and reason when the required flow is known.

| Process | Use when | Records |
|---|---|---|
| Standard | Rules and results can be specified and checked locally, including custom actions | Design, work plan, progress, and evidence in one record |
| Full | Correctness depends on operation sequences, coupled rules, results shared across consumers, or required traceability | Design, numbered plans, [worksheet](module-execution-worksheet.md), and reports |

A relation or custom control alone does not require the full process. Keep
independent CRUD on the standard path. If dependencies change, revise only the
affected scope and preserve valid decisions and evidence.

## One work record

The design owns behavior, sources, approval, and open decisions. Summarize
standard actions by resource and name the current pattern. Give custom rules
and required differences concrete acceptance outcomes. For visible values,
record the label, display value, and loaded edit value; for relations, also
record the submitted identity and selectable label.

On the standard path, add owners, work order, setup, checks, progress, and review
to this record. On the full path, plans own technical steps, the worksheet owns
status and test links, and reports own observed results. Update at a completed
result, material failure, decision, or handoff.

## Design approval gate

Present the ready design's path and exact revision for explicit user approval
before planning or implementation. Record the reply, revision, and scope.
A build request or silence is not approval of an unseen design. Existing
approval of the unchanged revision remains valid on resume.

A material behavior change needs approval of the changed scope. Routine
technical decisions within the approved behavior need no new gate. Honor an
explicit user instruction that changes this process. Design-only work ends
at the approved design; plan-only work ends at the plan.

## Custom behavior

For states, conditions, or coupled effects, use the
[custom workflow contract](../../carta-module-design/references/custom-workflows.md).
Apply restrictions on standard actions in the first usable result, such as
prohibiting edits after submission. Record a missing rule as a decision gap;
an existing example cannot override the user's requirement.

Continue approved delivery with [execution.md](execution.md).

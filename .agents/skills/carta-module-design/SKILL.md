---
name: carta-module-design
description: Survey modules and prepare initial designs or material contract revisions for approval.
---

# Carta module design

## Classify the task

Find the owning design and choose the required work.

| Request | Design work |
|---|---|
| Survey only | Report findings; write a design only when requested |
| New module or independent workflow | Prepare an initial design for approval |
| Material change to business behavior, data ownership, permissions, or an API contract | Revise the affected sections for approval |
| Fix, refactor, or minor presentation change within the current contract | Use the current contract and task authorization |

Revise a design for a changed decision, not merely because related code changes.
Keep one design per module or independent workflow. Missing documentation does
not require a new design during maintenance.

## Discover

Honor the user's source restrictions throughout discovery, implementation,
verification, and handoffs. Apply them before following document links.
Otherwise use repository source authority.

Inspect permitted sources and current behavior. Use [CONTEXT.md](../../../CONTEXT.md)
for terms. Ask only about unresolved choices that materially affect behavior,
permissions, stored data, or scope. State the conflict, consequence, and
recommendation. Resolve routine technical choices from current APIs and examples.
Hypothetical edge cases need concrete evidence or a user decision.

Report observed flows, proposed changes, relevant owners, assumptions,
exclusions, and open decisions. Separate observations from proposals.
End survey-only work here, without an execution plan or new tests.

## Write

For an initial design, use the [template](assets/design-template.md) in
`plans/<feature>/design.md`. Revise an existing record in place.
Reference schemas for standard fields. Record changed business meaning,
constraints, ownership, and behavior. Describe workflow branches by trigger,
result, and next step; reference existing contracts for ordinary CRUD.

Define each rule once. Keep its reasons and unresolved choices beside it.
Keep execution notes outside the design and use Git for history.

Check feasibility against current contracts. For web work, read
[DESIGN.md](../../../DESIGN.md) and the
[resource architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md).
Resolve business questions and known write-authority needs before approval.

## Approve

- Design: `Draft` or `Approved`. Approval requires the user's explicit approval
  of the current scope. Unchanged behavior retains approval.
- Implementation: `Not started`, `In progress`, `Current`, or `Needs update`.
  Delivery maintains this status.

Material contract changes return the design to `Draft` and an existing
implementation to `Needs update`. Wording corrections preserve status.
Implement initial or materially revised scope only after design approval.
End design-only requests here. Continue authorized implementation through
[$carta-module-development](../carta-module-development/SKILL.md).

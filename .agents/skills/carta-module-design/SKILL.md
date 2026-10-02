---
name: carta-module-design
description: Design or revise a Carta module when business behavior, application context, or acceptance requirements need to be established.
---

# Carta module design

Use [Carta module terms](../../../CONTEXT.md) for module ownership language.

Resolve requested behavior without inventing business rules. This skill writes
the design; it does not edit application source or grant new write authority.

## Establish the starting point

Read the request, later decisions, supplied references, and existing work.
Separate current behavior from the intended change. A complete supplied design
needs a readiness review, not another interview. Preserve valid decisions and
approval; explicit requirements govern over examples and inferred defaults.

Use the [standard module base](../carta-module-development/references/standard-module.md)
for process selection, record ownership, and the design approval gate. Use the
[module contract](references/module-contract.md) for every design. Record
findings and unknowns in that draft as they emerge.

Apply [discovery reuse](../carta-module-development/SKILL.md#discovery-reuse).
Use [context discovery](references/context-discovery.md) to identify the owners
and consumers of each in-scope journey. Read [DESIGN.md](../../../DESIGN.md)
for web composition and the
[resource architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md)
for supported surfaces. Record required differences from those conventions.
Discovery is sufficient when each journey has known owners and consumers or an
explicit gap that affects its design.

## Resolve material unknowns

Use [grounded questions](references/grounded-questions.md) when a missing fact
or decision could change behavior. Inspect repository facts yourself. Learn
unfamiliar processes through walkthroughs and real examples before proposing
choices. Request a redacted procedure or sample only when it resolves a gap;
a user explanation is valid evidence too.

Distinguish observed facts, confirmed requirements, proposals, and unknowns.
Name conflicting sources and the behavior they affect. Resolve the next
consequential dependency; group questions that share context. Record decisions
with their authority in the design. Routine technical choices belong to planning.

## Define and review behavior

Write applicable contract sections. Summarize selected CRUD by resource; give
custom rules and differences concrete acceptance outcomes. A new entity does
not imply all operations. Define inputs, state/access conditions, visible
results, failure effects, and affected consumers. Reference unchanged contracts
and shared predicates instead of copying them. Reserve YAML for custom workflows
and implementation interfaces for planning.

Use the shared [verification boundary](../carta-module-development/references/verification-strategy.md#browser-journeys)
when defining acceptance. UI requirements describe product behavior; module
acceptance uses non-browser proof.

Review the design as an implementer who has not seen the conversation. Resolve
remaining business decisions and check source coverage and internal agreement
under the [authority rules](references/module-contract.md#authority-and-scope).
Label self-review unless an independent review was available and permitted.
A heading check does not establish readiness.

## Approval and handoff

Apply the standard module's design approval gate to the exact ready revision.
Reuse approval for unchanged scope. Unresolved material decisions leave the
affected design `DRAFT` or `BLOCKED` unless the user excludes that behavior.
Routine visual and technical choices need no separate gate.

Return the design path, revision, approval source, evidence, review result, and
blockers. A design-only request ends at its deliverable. For authorized planning,
continue with `$carta-module-plan` or return to the requesting workflow.

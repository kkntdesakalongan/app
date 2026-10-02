---
name: carta-module-development
description: Build or resume a Carta application module across data, API, resources, routes, and permissions. Use for module delivery; use the design or plan skill for those deliverables alone.
---

# Carta module development

Use [Carta module terms](../../../CONTEXT.md) for module ownership language.

Deliver the requested module through design, approval, planning, implementation,
and review. Application owners are `apps/api` and `apps/web`. Author modules
directly from current contracts and compiled examples. Framework edits and
production, external, or destructive writes need explicit authorization.

## Workflow

1. **Resume from current work.** Read the request, later decisions, existing
   design, plans, evidence, and relevant diff. Identify the first unfinished
   stage. Reuse valid approval and evidence; reopen only affected work.
2. **Settle behavior.** Read [standard-module.md](references/standard-module.md)
   for record ownership, process selection, and the design approval gate.
   Use `$carta-module-design` when behavior is unresolved. Continue when the
   requested outcomes are defined and their exact revision is approved.
3. **Plan the result.** Use `$carta-module-plan` to name implementation owners,
   work order, setup, and checks. Keep a standard plan in the design record;
   use a [worksheet](references/module-execution-worksheet.md) only for the full
   process. Design-only and plan-only requests end at their deliverable.
4. **Build and prepare a preview.** Read [execution.md](references/execution.md).
   Complete the API, surface, access, navigation, and required development setup
   for the first usable result, then finish the remaining requested behavior.
5. **Verify and review.** Use package lint and type checks plus focused behavior
   tests for changed owners. Follow [verification-strategy.md](references/verification-strategy.md)
   and `$verify-carta-module`. Repair in-scope defects and record the verdict.
   Report source readiness, preview URL and setup status, checks, and gaps.
   Completion requires the requested result and a recorded `PASS` review.

## Discovery reuse

Start with the changed owner and one current example. Read further to resolve
an identified fact, conflict, or failure. Save decisions and exact source
pointers in the existing work record; reuse them across stages and handoffs.
Discovery is sufficient when each requested action has an owner, a supported
path or named gap, and a suitable check. Ask for missing business decisions;
choose routine technical details within approved scope.

## Read at the changed boundary

| Change | Required guidance |
|---|---|
| API, entities, access, transactions | `$api-conventions` |
| API schemas used by web code | [API schema boundary](../../../docs/architecture/web-application-architecture.md#api-schema-boundary) before choosing owners and imports |
| Web page, resource, route, navigation | `$web-ui-surfaces` and [DESIGN.md](../../../DESIGN.md) |
| Form or user input, including custom actions and uploads | `$build-resource-form` before control selection |
| Resource declaration or surface types | [Current resource architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md) |
| Draft, relation, date, or asset value shape | [Field contract](references/frontend-field-contract.md) |
| Transport, custom reads, or mutation completion | [Query and mutation contract](references/web-query-cache.md) |

Module verification uses non-browser checks. Browser testing is a separate,
explicitly requested task; follow the [verification boundary](references/verification-strategy.md#browser-journeys).

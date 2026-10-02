---
name: carta-module-plan
description: Turn an approved Carta module design into implementation plans, or reconcile plans with a revised design and repository.
---

# Carta module plan

Use [Carta module terms](../../../CONTEXT.md) for module ownership language.

Translate approved behavior into owners, work order, setup, and checks. This
skill produces plans; it does not implement source changes or expand scope.

## Confirm the starting point

Read the request, decisions, design, and approval source. Apply the
[standard module base](../carta-module-development/references/standard-module.md)
for process selection and the design approval gate. If approval is missing,
return to `$carta-module-design`. Keep existing records that meet the
[module contract](../carta-module-design/references/module-contract.md).

On the standard path, put the plan in the existing design record. On the full
path, use [plan-template.md](references/plan-template.md) and the
[worksheet](../carta-module-development/references/module-execution-worksheet.md).
Preserve numbering on resume. A custom action alone does not require full process.

## Resolve implementation ownership

Apply [discovery reuse](../carta-module-development/SKILL.md#discovery-reuse).
For each requested action, name its owner, supported path or framework gap,
and suitable check. Record one exact source example for each non-obvious
pattern. Use current contracts and compiled app examples; implementation plans
and migration history do not define the shipped API.

- For API work, use `$api-conventions`. Name method exports, URL parameters,
  inherited scope, transaction boundaries, and affected SDK consumers.
- For API schemas used by web code, follow the
  [API schema boundary](../../../docs/architecture/web-application-architecture.md#api-schema-boundary).
  Name backend schema owners, physical export paths, web consumers, and value
  conversions. Distinguish table write schemas from operation input schemas.
- For web work, use `$web-ui-surfaces` and `$build-resource-form` for inputs.
  Read [DESIGN.md](../../../DESIGN.md) and the
  [resource architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md)
  before selecting composition. Map each action to its entry point, inputs,
  access/state conditions, and visible result.
- Select operations independently. Name the data needed by each surface without
  inventing a visible detail page, list endpoint, or query schema for another
  operation. Assign one owner to loading, query validation, and mutation completion.
- For route changes, follow the
  [file-routing contract](../web-ui-surfaces/references/file-routing.md). Name
  the rendered parent chain, entry policy, and Back targets. Preserve existing
  URLs and names unless the approved change includes them.

Reference design predicates instead of copying them. Choose routine storage,
API symbols, and file placement within approved behavior. Return only missing
business policy, scope conflicts, or new write authority to the decision owner;
state which observable outcome depends on the answer.

## Order delivery and proof

Use the [execution rules](../carta-module-development/references/execution.md)
for prerequisites, the first complete result, and development preview setup.
Include workflow restrictions on standard actions in that first result. Test
setup does not replace development migrations, required seed, or preview.
Record selected capabilities and preflight results, or exact blockers.

Resolve commands and working directories from the checkout. Distinguish an
inspected command from a successful run. Use the
[verification strategy](../carta-module-development/references/verification-strategy.md)
for non-browser checks and required outcomes. Leave test names, fixtures, and
routine implementation details to the executor.

For full-process work, the worksheet owns acceptance-to-plan and test mappings;
plans own technical steps. Apply its dependency rules when defining assignments.
Keep exact new tests `PENDING` until implementation supplies them. For web
work, name the selected public surfaces and their route owners in the plan.

## Review and hand off

The plan is ready when every requested outcome has an owner, dependency order,
and sufficient check, with no unresolved product decision. Verify actual paths,
interfaces, commands, setup, and write boundaries. Link unchanged design rules.

Record the source revision and relevant dirty/untracked inputs. On resume,
reconcile changed owners and refresh affected technical decisions; preserve
valid approval and evidence. Return the work-record paths, approved revision,
execution order, coverage, and blockers.

A plan-only request ends here. For authorized delivery, return to
`$carta-module-development`.

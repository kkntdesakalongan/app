---
name: verify-carta-module
description: Exclude low-value application tests and verify selected business outcomes and critical failures.
---

# Module verification

## Exclude module tests

Before planning, writing, or reviewing module tests, exclude the purposes below.
Custom code, cheap setup, missing coverage, and old design checklists do not
exempt them.

| Excluded purpose | Examples |
|---|---|
| Basic validation and schema inventories | Required text, trimming, bounds, enum acceptance, date syntax, field presence, nullable parsing |
| Pass-through transport | URL or method selection, exact forwarded objects, request counts |
| Payload housekeeping | Hidden-field omission, display-property removal, parsed-value copying, empty text to null |
| Standard assets | Upload metadata, retained IDs, unchanged-file omission, image fallbacks |
| Standard forms | Required-field errors, draft retention, disabled controls, repeated-click prevention |
| Standard request lifecycle | Retry, cancellation, stale responses, refresh, cache invalidation, ordinary navigation |
| Standard presentation | Labels, colors, formatting, component selection, DOM arrangement, generic narrow screens |
| Trivial constants or aliases | Enum declarations, permission constants, forwarding aliases |
| Retired machinery | Version counters, policy tokens, compatibility flags, their test-only helpers |

Classify by purpose. Business security, ownership, calculations, and workflow
decisions remain eligible. Preserve production requirements and explicitly
requested acceptance cases. These exclusions apply to application modules;
shared framework tests remain with their owners.

## Select proof

Select main business outcomes and critical failures. Trust unchanged Sprindle,
Loom, and shared adapter behavior. Reuse existing proof before adding tests.

| Changed behavior | Default proof |
|---|---|
| Standard CRUD, Views, inputs, resource declarations | Required lint and type checks; configuration review |
| Selected business rules, persistence, permissions, side effects | Real route or operation with its database |
| Consequential business calculation or decision | Focused unit test when cheapest |
| Business queries or data scope | Server test with distinguishing records |
| Business journey requiring browser interaction | Focused browser proof when lower boundaries cannot establish it |
| External integration outcome | Current provider evidence or authorized bounded live check; mocks alone are insufficient |

Each added case or layer needs a distinct selected risk. Use representative
failures and include setup cost in the choice. Skip low-risk cases needing a
new harness or extensive mocks. For shared access policies, check the module's
binding and reuse policy tests. Zero new tests is valid.

Record selected risks and checks in existing delivery notes, without field
inventories or separate justification files. Choose checks without new approval.

## Execute

Read [runtime instructions](references/runtime.md) for live checks and the
[feature index](features/README.md) when a selected check needs a recipe.
Recipes do not add acceptance obligations. Update one only when changed paths
need reusable instructions.

Use package scripts and scoped instructions. API route changes include normal
SDK and web type checks. Inspect aggregate commands before running them.
Reuse credible results, including delegated results, while their inputs remain
unchanged. After corrections, rerun affected checks only. Broaden for a concrete
defect, changed shared behavior, or missing critical evidence.

Use [$test-audit](../test-audit/SKILL.md) for new or changed tests and
[UI review](../web-ui-surfaces/references/verification.md) for changed web wiring.
Use production entry points. Keep browser setup on existing public form APIs,
without test-only setters or endpoints.

## Evidence and completion

Record the selected action and result. Check persisted effects with a fresh
read. Mock only external systems at existing boundaries. Types, mocks, and API
checks do not establish rendering, live server authorization, or persistence
outside the boundary they exercise.

Review the diff and evidence once against requirements and selected risks.
Remove excluded assertions and unused scaffolding within scope; keep business
assertions in mixed tests. Do not recreate excluded cases at another layer.
Inspect corrections locally. Accept when required checks and selected proof
pass and blocking defects are resolved. Stop expanding work after acceptance.
Missing prerequisites block only dependent claims; keep their assertions intact.

Report checked boundaries, commands, results, evidence, and gaps. Store live
evidence under `.local/verification/<run>/` without secrets or session tokens.
Clean up owned processes and fixtures, not evidence. Verify what a dry run
actually skips.

To maintain this skill, use `/maintain-verification-skill` when available;
otherwise reconcile affected recipes with current routes and real results.

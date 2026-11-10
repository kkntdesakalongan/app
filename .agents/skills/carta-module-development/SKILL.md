---
name: carta-module-development
description: Route module surveys, authorized implementation, and acceptance through existing contracts.
---

# Carta module delivery

## Start

Follow the user's choice of direct or delegated work. Use this workflow instead
of Improve or a separate delegation playbook unless the user selects one.
Delegation is optional.

Read the current diff and saved work. Follow the design skill's
[task classification](../carta-module-design/SKILL.md#classify-the-task) and
[source rules](../carta-module-design/SKILL.md#discover). Reuse completed discovery
and valid approval. End surveys with findings, plans with the plan, and reviews
with findings rather than implementation.

## Implement

Select checks through [$verify-carta-module](../verify-carta-module/SKILL.md).
Use the optional [plan format](references/planning.md) when execution or resume
needs a file.

For each changed interaction or operation, inspect the existing framework API
and a current consumer. Check configuration and extension points before custom
code. Search the installed framework when guidance has no match.
In existing task notes, group requirements by owner and state the unsupported
requirement for each custom part. Routine field bindings need no separate entry.
Reuse the owner's loading, validation, persistence, and mutation lifecycle.

| Change | Guidance |
|---|---|
| API, data, permissions, transactions | [$api-conventions](../api-conventions/SKILL.md) |
| Pages, resources, routes, navigation | [$web-ui-surfaces](../web-ui-surfaces/SKILL.md) |
| Forms and inputs | [$build-resource-form](../build-resource-form/SKILL.md) |

If a design record exists, mark implementation `In progress`.
Complete required migrations, seed data, access, navigation, and preview setup.
Apply new migrations to the configured development database; a migrated test
database alone does not complete setup. Report failures and continue independent
work. Return material contract changes to design; resolve routine choices locally.

## Finish

Complete [module verification](../verify-carta-module/SKILL.md). Review custom
code against its stated unsupported requirement. Mark an existing design's
implementation `Current` only when requirements, setup, and required checks are
complete. Report delivered behavior, setup status, checks, and remaining gaps.

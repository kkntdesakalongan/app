---
name: web-ui-surfaces
description: Build or review Carta web pages, resources, file routes, navigation, and workflow controls.
---

# Web UI surfaces

Use [Carta module terms](../../../CONTEXT.md) for module ownership language.
Read [DESIGN.md](../../../DESIGN.md) before selecting page structure or controls.
Read the [resource architecture](../../../docs/resource_system_overhaul/ARCHITECTURE.md)
before changing resource declarations. Author modules directly against the current
contract; use the architecture's compiled examples for unresolved API details.

## Find the owner

Apply [discovery reuse](../carta-module-development/SKILL.md#discovery-reuse).
For each changed interaction, identify its surface, value shape, operation,
loading owner, affected data, and visible parent. Record only decisions and
unsupported requirements in the existing work record.

| Work | Read |
|---|---|
| App shell or navigation entry | [App conventions](references/app-conventions.md) |
| Routes, tabs, parent pages, or Back | [File routing](references/file-routing.md) |
| Resource operations, collections, filters, or actions | [Surfaces](references/surfaces.md) |
| Workflow detail or related records | [Detail layout](references/detail-layout.md) |
| Display values or relation labels | [Fields](references/fields.md) |
| User input, including custom actions and uploads | [$build-resource-form](../build-resource-form/SKILL.md), before control selection |
| Transport, custom loading, submit overrides, or refresh | [Query and mutation contract](../carta-module-development/references/web-query-cache.md) |

Read `docs/architecture/web-application-architecture.md` for unresolved app
ownership and `docs/ui/README.md` for component guidance. Inspect app setup only
when changing registration, defaults, or layout.

## Framework-first composition

Select the highest-level component that supports the required interaction and
its states: standard View/action, supported slot or adjacent section, then a
lower-level framework component. Add local code only for a named unmet requirement.
Apply [action placement](../../../DESIGN.md#actions-and-forms) before copying an example.
Import template components or verify their runtime registration.

Bind complete resource bags to standard Views. Extract a nested primitive bag
when only that primitive is needed. Keep page navigation and completion with
the route or View; keep transport in app actions. A wrapper or separate actions
file is useful only when it owns behavior.

Use `ListView.actionLabels` for standard Create and row-action wording. Check
[DESIGN.md](../../../DESIGN.md#controls-and-values) before replacing a standard
control.

## Check the result

Resolve declaration errors at the named member or input/output relationship.
Preserve inference instead of casting away a contract mismatch.

Use [verification](references/verification.md). Reuse the module's evidence and
report failed checks and unverified behavior.

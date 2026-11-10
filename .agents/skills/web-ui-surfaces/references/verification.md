# UI source review

Compare changed pages with [DESIGN.md](../../../../DESIGN.md) and the approved
requirements. Check values, dependencies, access, navigation, and
[page placement](../../../../docs/architecture/web-application-architecture.md#route-ownership).
For custom UI, confirm the unsupported requirement recorded during
[owner selection](../../carta-module-development/SKILL.md#implement) still exists.

Trace one representative changed edit from loader through draft mapping,
submit, and completion. Trace a changed custom action through permission,
record policy, bound `can` and `run`, and invalidation. Resolve duplicate owners
of loading, forms, access, or refresh. Reuse evidence for unchanged paths.

Review custom submission against the
[write-outcome contract](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#52-submission).
Select runtime and browser checks through
[$verify-carta-module](../../verify-carta-module/SKILL.md), including cases the
user explicitly requests. Source review does not prove rendered behavior.
For documentation-only changes, check source facts, links, and scope.

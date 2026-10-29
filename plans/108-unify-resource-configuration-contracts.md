# Plan 108: Unify resource configuration contracts

## Decision and status

The user accepted the cross-surface consistency direction and framework-owned
types on 2026-10-26. Implementation and parent review are complete on
`feat/resource-authoring-simplification`. See the shared
[verification record](108-unify-resource-configuration-contracts.md#verification). This
task records the accepted direction.

Use a static object or a pure function that returns the complete configuration
at each agreed configuration boundary. Static declarations remain ordinary
objects. Resolve dynamic configuration with context specific to its owner.

[Plan 106](106-bind-create-forms-with-runtime-context.md) records create binding.
[Plan 107](107-resolve-form-field-configuration.md) records Form field resolution.
Extend those conventions through the existing shared contracts. The
[architecture guide](../docs/resource_system_overhaul/ARCHITECTURE.md) describes
the implementation in this branch.

## Framework type ownership

The framework owns the public configuration, resolver context, resolved
configuration, component prop, slot, and event contracts for each concept.
Components implement and import those contracts. Resource bindings and
constructors consume the same authoritative contracts.

Keep each type with its framework owner. Centralization means one definition
for each contract. It does not require one large file or one universal field
type. Form drafts and display records remain different concepts.

Compose wrappers from the base contracts and their own presentation options.
Use derived types to express deliberate restrictions. Do not copy the base
property list into each component or resource type. For example, a row editor
can forbid an independent loader without redefining all Form fields.

Preserve renderer-specific prop checks, selected keys, schema input, parsed
output, and operation result inference. Keep compact projections at their
framework owner when those projections are needed for inference. Do not return
large raw schema and declaration types merely to avoid a shared projection.

The current framework already imports shared props in Form, Table, Detail,
and DialogForm. This decision extends that ownership to the revised contracts.
It is not a claim that every component currently duplicates its props.

## Accepted consistency scope

| Area | Shared contract and rule |
|---|---|
| Form, DialogForm, FormView, List filters, and TableInput row editors | The same Form field configuration and resolution rules |
| Table, TreeTable, Detail, lookup tables, and TableInput display tables | Shared display configuration with surface-specific options |
| Resource list, create, detail, and update bindings | Consistent callable surface binding with typed context when required |
| Direct and resource-bound components | The same definition retains its meaning; resource binding adds operation policy |

The target resource consumption is `users.list()`, `users.create()`,
`users.detail({ id })`, and `users.update({ id })`. Context is optional for
definitions that do not depend on it. Context-dependent definitions require the
appropriate context type. Do not require empty context objects or named
application factories.

Direct definitions remain usable without a resource. Resource binding retains
access, identity, cache ownership, and invalidation. Keep static route-entry
metadata and operation policies distinct from instance display configuration.

## Resolution semantics

Resolvers return complete configuration. Authors compose shared values through
ordinary references and object spreads. Do not add a partial override chain,
dynamic-mode flag, resolver registry, or another field catalog.

Form field context contains the current read-only draft and supplied context.
Detail field context contains the current record and supplied context. A table
cell receives its row and relevant context. Context types remain specific to
those responsibilities.

Form resolves `visible` as a field-level boolean beside `span`, as accepted in
Plan 107. Components consume that shared field contract. Do not preserve an
additional visibility callback for the same Form configuration.

Resolve table-wide settings at table scope. Column headers, sorting, and order
must not depend on an arbitrary row. Settle the exact separation of column-wide
and row-specific configuration before implementing display resolvers.

Static values remain static. Do not make every individual property accept a
function. Keep configuration functions pure and synchronous. Loaders fetch
data, schema parsers validate or convert values, and commands perform work.
Those functions retain their own contracts.

Use the existing runtime owner to evaluate resolvers reactively. A plain
function alone does not schedule re-evaluation. Do not create a second
dependency system for configuration that Vue can already track.

The same authoring shape does not remove input lifecycle responsibilities or
draft-write semantics. Derived values, field bindings, input-source changes,
validation, and post-write recovery retain their contracts until a separate
decision changes them.

## Implementation boundaries

1. Define the authoritative framework types and the permitted context at each
   resolution scope. Keep static inference and surface-specific restrictions.
2. Implement Form resolution through Plan 107 and propagate that shared
   contract through existing Form hosts. Avoid separate filter or row-editor
   field languages.
3. Extend the display contract through its existing consumers. Preserve shared
   value access and formatting. Resolve the table-wide and row-specific
   configuration boundary first.
4. Extend resource binding consistently from Plan 106. Migrate affected
   consumers and remove obsolete alternatives in the same implementation.
5. Update current guides and select proof for the changed owners. Use
   `test-audit` before test changes and `verify-carta-module` for application
   module proof.

Performance work remains deferred as agreed for Plan 107. Type correctness,
reactive updates, stable identity, draft preservation, and operation policy
remain required. The user later authorized Carta implementation and Git
publication. HK Shield migration and package publication remain outside this work.

Minimize Reader Load gives each contract one framework owner. Laziness Protocol
extends existing shared definitions. Type System Discipline preserves distinct
contexts and checked component implementations.

## Verification

Parent review is complete. All implementation work in Plans 106–111 stayed in
Carta. The parent reproduced and required fixes for resolver inference, create
loaders, reactive record sources, composite identity ordering, remote selection
retention, context types and precedence, custom reader validation, and cell
export parity. The primary test owners retain the useful regressions.

The parent independently ran these checks successfully:

- Loom type check and diagnostics: 51 contract, 14 TypeScript, and 8 Vue cases.
- Full Loom unit suite: 573 tests. Full Loom browser suite: 95 tests.
- Web type check and all 255 Web unit tests.
- Surface architecture tests and gate: 34 tests. Module tooling: 81 tests.
- Focused Web lint, available Loom Oxlint checks, and `git diff --check`.

Existing browser warnings concern Dialog descriptions, NumberInput/DOM props,
router context, and the TinyMCE evaluation license. Web lint reports one existing
restricted-syntax warning in the user role assignments route. Loom has no local
lint or formatter script; its changed sources passed the available Web-installed
Oxlint command. The available Oxfmt check flags 17 touched files that also fail
that check at the original implementation commit. External consumer repositories
and authenticated application browser flows were not checked.

The later reduction review removed duplicate validation, presentation caches,
request merging, forwarding wrappers and context calculations. It removed 106
production lines and 26 test setup lines.
The full change still adds 517 production lines relative to its base. The parent
repeated all checks listed above after the reduction.

A subsequent assertion audit removed two implementation-string tests, duplicate
and private-state checks, and an annotation-only type assertion. It corrected
stale DOM checks and independent workbook expectations. The retained regressions
failed under six targeted source mutations; the parent also reproduced a controls
state forwarding failure. Every mutation was restored byte for byte. The parent
reran Loom unit/browser suites, types, diagnostics, surface checks, module tooling
and focused lint. This assertion revision changed no production code.

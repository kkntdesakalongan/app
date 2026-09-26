# Execute a module

## Assignment

Keep connected API and UI work with one executor through implementation and
repair. When delegation is available and permitted, use one continuing worker;
the parent owns questions, progress, and review. Otherwise execute directly.
Split only independent work with separate files and test targets.

An assignment includes the approved result, source pointers, unresolved facts,
permitted writes, environment, and completion checks. Include the first page's
API, navigation, permissions, and development setup. A layer alone is not a
usable module. For full-process work, apply the
[plan dependency rules](module-execution-worksheet.md#state-and-completion).

## Prepare and build

1. **Check prerequisites.** Inspect current package commands, required
   configuration presence, target identity, and database baseline. Use
   `pnpm module:preflight -- --needs <capabilities>` for required capabilities.
   Record usable prerequisites or exact blockers without secret values.
2. **Implement one complete result.** Use the layer skills in the entrypoint.
   Trace write input through validation and persistence to returned values,
   display, and edit loading. Check the boundaries below before repeating the
   pattern. For an uncertain provider, establish the
   [external contract](verification-strategy.md#external-integrations) first.
3. **Prepare the development preview.** Review migration SQL and the selected
   target. Apply pending migrations and required permission/system seed within
   authority, using the existing commands. Check service readiness and source
   wiring for routes, navigation, and access. Report the URL, setup result,
   actor role, data prerequisites, and unfinished work as soon as ready.
4. **Finish requested behavior.** Complete all remaining actions and restrictions.
   Use the [tight loop](verification-strategy.md#tight-loop), then review.

Development and test targets are separate. If existing tables conflict with
migration history, stop affected writes and report the mismatch. Use an
explicitly disposable target or authorized reconciliation. Preserve applied
migrations; subsequent changes use new migrations. A remote target or available
credentials do not imply reset authority. Demo data and account changes need
scope beyond the required system seed.

For entity changes, inspect connected-entity and audit references before
migration generation. Keep required constraints and SQL consistent. After route
changes, run the current supported route/type generation before diagnosing
stale route names as application errors.

## Boundary checks

| Boundary | Required result |
|---|---|
| Access | Server rules, resource actions, route guards, navigation, and permission seed agree. The server checks current state and parent membership. |
| Relations | List, detail, and returned writes include display labels. The write schema accepts the declared identity; a filtered lookup does not grant access. |
| Values | Raw schema input, draft, parsed output, and stored values agree under the [field contract](frontend-field-contract.md). |
| Writes | Coupled effects use one transaction. Deletion and recovery match the approved behavior. |
| Reads and refresh | Each data set has one loading owner; affected consumers refresh under the [cache contract](web-query-cache.md). |
| Entry points | Routes resolve, visible parents and Back targets are correct, and intended sidebar entries are registered. |

## Review and finish

Use `$verify-carta-module` with the original request, approved decisions,
relevant diff, and current evidence. Prefer an independent reviewer when
available and permitted; label self-review otherwise. Apply the shared
[verdict rules](verification-strategy.md#verdicts).

Repair material in-scope defects under existing authority. Reopen affected
review after a repair, including other uses of the same faulty pattern.
Preserve valid evidence for unaffected behavior. Optional suggestions are
follow-up work, not completion gates.

Record three results in the existing work record:

- **Source ready:** implementation and migration files are complete.
- **Preview ready:** required development schema/seed and service setup are
  complete; include the URL or exact blocker. Source checks do not prove rendering.
- **Verified:** required evidence and the final review verdict are recorded.

Update relevant application-map entries and, for the full process, worksheet
states. On interruption, inspect saved changes and results before resuming.
Stop an old worker before transferring its unfinished work to another owner.

# Plan 065 current Loom contract inventory

This ledger records the current guide split, preserved rules, examples, links, and checks. It does not describe any TODO repair as shipped.

## Source and provenance

- Snapshot source commit: `05ebfa3e8b9608c50d5483c2fb2c1f6a01ef0f23`.
- Plan baseline: `1246387`, 2026-09-26.
- Plan 073 was already implemented in the working tree and independently reviewed before this plan started. Its removal ledger is [plans/073-removal-ledger.md](073-removal-ledger.md). The Plan 073 changes were uncommitted at the snapshot source commit.
- The Plan 073 working diff changed the architecture from generator delivery instructions to current source-check and direct-authoring guidance. It also changed the Loom README's example list to point to current app modules. The full removal diff remains in the shared working tree and its actions are recorded in the Plan 073 ledger.
- Plan 065 started with a dirty working tree. The architecture, Loom README, root plans index, and Plan 065 already had Plan 073 edits. The Plan 073 removal ledger and independent worksheet test were untracked. Other changed and deleted owners were part of Plan 073. Those changes were preserved.
- `git diff --stat 1246387..HEAD -- docs/resource_system_overhaul/ARCHITECTURE.md packages/loom/README.md docs/architecture/web-application-architecture.md` returned no committed diff. The relevant Plan 073 changes were in the working tree, not in HEAD.
- Before rewriting, the current architecture had 1,023 lines and SHA-256 `01ee4f42a253ef5bb235d91977bb678a28016f4386697f9f9bafaff49e859da1`.
- The post-Plan-073 snapshot is [architecture-before-current-guide.md](../docs/resource_system_overhaul/history/architecture-before-current-guide.md). Its body follows the historical notice and back-link. The source had no Markdown links to rebase; its technical references are external URLs. The notice adds the relative link `../ARCHITECTURE.md` to return to the current guide.

## Incoming links and anchors

The required search was rg -n 'resource_system_overhaul/ARCHITECTURE\.md' AGENTS.md README.md docs .agents packages/loom/README.md apps/web/README.md scripts .github. It found the root README and AGENTS pointer, web and Loom READMEs, the web architecture page, active module and surface skills, old plan records, the architecture checker, and CI path filters. The checker and CI paths remain unchanged. Historical plan mentions remain historical.

Before Plan 065 edits, 12 Markdown links pointed to the architecture. None used a fragment. The Loom README and web architecture page now link to #direct-module-authoring. The plan inventory adds links to the current guide and target-contract heading. The final repo-wide scan found 14 inbound Markdown links and 4 fragments; all paths and fragments resolve. The four fragments are the two direct-authoring links and the two links in this inventory. There are no older inbound fragments to migrate.

| Source path | Fragment |
|---|---|
| README.md | None |
| AGENTS.md | None |
| apps/web/README.md | None |
| packages/loom/README.md | #direct-module-authoring |
| docs/architecture/web-application-architecture.md | #direct-module-authoring |
| .agents/skills/carta-module-development/SKILL.md | None |
| .agents/skills/carta-module-design/SKILL.md | None |
| .agents/skills/migrate-web-resource/SKILL.md | None |
| .agents/skills/carta-module-development/references/frontend-field-contract.md | None |
| .agents/skills/carta-module-plan/SKILL.md | None |
| .agents/skills/implement-schema-first-zod/SKILL.md | None |
| .agents/skills/verify-carta-module/SKILL.md | None |
| plans/065-loom-contract-inventory.md | #direct-module-authoring, #1-target-contract |

Other textual path references remain in .agents/skills/web-ui-surfaces/SKILL.md, scripts/check-surface-architecture.mjs, scripts/web-validation-workflow.test.mjs, .github/workflows/web-validation.yml, and historical plan bundles. They are source/checker paths or historical records, not Markdown links that need fragment migration.

The active guide keeps the previous heading IDs for sections 1–11 and their numbered subsections. Sections 9.1, 9.2, and 11 keep their anchors as short links to the archive. The new direct-authoring heading is #direct-module-authoring.

## Old section and rule mapping

| Previous section or rule group | Disposition | Current destination | Reason |
|---|---|---|---|
| 1. Target contract | Merged | [Direct module authoring](../docs/resource_system_overhaul/ARCHITECTURE.md#direct-module-authoring) and [target contract](../docs/resource_system_overhaul/ARCHITECTURE.md#1-target-contract) | The current owner table and author path now precede the contract summary. |
| 1.1 Required consumption | Retained | 1.1 | Keeps direct and managed binding, prop precedence, and submit replacement behavior. |
| 1.2 Component boundaries | Retained | 1.2 | Keeps the Form and wrapper ownership distinction. |
| 1.3 Authority and permitted derivation | Retained | 1.3 | Keeps one owner for schema, draft, assets, display, operation access, page lifecycle, query, and transport. |
| 2. Definitions and reuse | Merged | Section 2 | Keeps current definition rules under one authoring heading. |
| 2.1 Construction | Retained | 2.1 | Keeps constructor/runtime and reference/snapshot behavior. |
| 2.2 Labels | Retained | 2.2 | Keeps label precedence and the label-only contract. |
| 2.3 Shared business metadata and inputs | Retained | 2.3 | Keeps explicit choices, ordinary fragments, and typed behavior context. |
| 2.4 Forms and submit ownership | Retained | 2.4 | Keeps operation-specific forms, parsed output, and resource wrapping. |
| 2.5 Complete display reuse | Retained | 2.5 and 3.2 | Keeps shared display fragments and separates constructor checks from mounted checks. |
| 2.6 Relation names instead of identifiers | Retained | 2.6 | Keeps loader ownership of relation data and forbids per-cell requests. |
| 3. Public contracts | Merged | Section 3 | Keeps the author-facing type rules and removes the exhaustive migration target matrix from the active path. |
| 3.1 Form types | Retained | 3.1 | Keeps schema input, FormDraft, parsed output, renderer, and field behavior distinctions. |
| 3.2 Display, table, and detail types | Retained | 3.2 | Keeps record keys, computed reads, sort keys, and renderer props. |
| 3.3 Renderer registration and execution | Retained | 3.3 and Current repair limits | Keeps separate registries and records the outstanding type-roster split under Plan 063. |
| 3.4 Canonical props and native forwarding | Retained | 3.4 | Keeps component-owned props and native forwarding. |
| 3.5 Explicit loaders and component models | Retained | 3.5 and Current repair limits | Keeps explicit component loaders and records outstanding mode-type ownership under Plan 070. |
| 4. Schemas and value ownership | Merged | Section 4 | Keeps schema, draft, and asset rules grouped by value owner. |
| 4.1 Schema runtime and validation | Retained | 4.1 | Keeps raw-schema and metadata/parse boundaries. |
| 4.2 Requiredness | Retained | 4.2 | Keeps schema-owned requiredness and explicit renderers. |
| 4.3 Drafts, defaults, and records | Retained | 4.3 | Keeps the record-to-draft-to-output mapping and initial-value precedence. |
| 4.4 Global asset service | Retained | 4.4 and Current repair limits | Keeps canonical app assets, lifecycle, and the generic File Manager adapter limitation. |
| 5. Form and DialogForm runtime | Merged | Section 5 | Keeps session behavior with the wrappers that forward it. |
| 5.1 Form props, state, and events | Retained | 5.1 | Keeps present-model detection and single-session ownership. |
| 5.2 Submission | Retained | 5.2 and Current repair limits | Keeps validation and stale-session ownership; Plan 061 remains open for repeat submission after an uncertain write. |
| 5.3 Slots and accessibility | Retained | 5.3 | Keeps typed slots and Form-owned accessibility. |
| 5.4 DialogForm parity | Retained | 5.4 | Keeps current prop forwarding and close-session rules. |
| 6. Resource composition | Merged | Section 6 | Keeps operation and identity ownership as one author task. |
| 6.1 Declaration and result | Retained | 6.1 | Keeps one-object declarations and static versus identity-bound operations. |
| 6.2 Binding responsibilities | Retained | 6.2 and Current repair limits | Keeps copied identities, access, post-write classification, and server authorization; route-entry array behavior is an open Plan 074 repair. |
| 6.3 Commands and delete handles | Retained | 6.3 | Keeps explicit row context and ordinary business arguments. |
| 6.4 Navigation and transport | Retained | 6.4 and 7.5 | Keeps page completion and the Hono query-schema limitation. |
| 7. Collections, views, and composite inputs | Merged | Section 7 | Groups collection, filter, component, and transport rules by author task. |
| 7.1 Table, TreeTable, Detail, and page views | Retained | 7.1 and Current repair limits | Keeps runtime one-source enforcement and controlled-query ownership; Plan 068 is still needed for exclusive public source types. |
| 7.2 Filters | Retained | 7.2 and Current repair limits | Keeps current filtering behavior and states that changed draft/output keys are not fully supported until Plan 067. |
| 7.3 TableInput | Retained | 7.3 | Keeps separate table/form ownership and explicit row mapping. |
| 7.4 Lookup, option, and location inputs | Retained | 7.4 and Current repair limits | Keeps component-owned loaders, staging, and location behavior; Plan 072 owns option-cache invalidation. |
| 7.5 Frontend transport query boundary | Retained | 7.5 and Current repair limits | Keeps parse/encoding ownership and states the current factory requirement tracked by Plan 075. |
| 8. Implementation ownership | Merged | Section 8 | Replaces the migration ownership matrix with current source/test owners and a separate list of open limits. |
| 9. Blast radius and removal | Archived | 9.1 and 9.2 pointers to the snapshot | This inventory belongs to migration history, not the normal module path. |
| 9.1 Required migration inventory | Archived | [Snapshot section 9.1](../docs/resource_system_overhaul/history/architecture-before-current-guide.md#91-required-migration-inventory) | Retains the original implementation inventory without presenting it as current work. |
| 9.2 Delete replaced paths | Archived | [Snapshot section 9.2](../docs/resource_system_overhaul/history/architecture-before-current-guide.md#92-delete-replaced-paths) | Retains the completed deletion record in its original context. |
| 10. Type and runtime verification | Merged | Section 10 | Keeps actual current gates and example owners. The larger target proof matrix stays in the archive. |
| 10.1 Type boundaries | Merged | 10.1 and Current repair limits | Keeps current public boundaries; open gaps are identified by plan and not claimed as complete. |
| 10.2 Runtime diagnostics | Merged | 10.2 and Current repair limits | Keeps current boundary checks and names diagnostic gaps under Plans 062 and 064. |
| 10.3 Decisive integration tests | Merged | 10.3 and the compiled-example map below | Points to real current fixtures and their actual package gate. |
| 10.4 CI and active examples | Merged | 10.4 and the compiled-example map below | Lists current commands; the snapshot preserves the earlier migration gate list. |
| 11. Execution and completion | Archived | [Snapshot section 11](../docs/resource_system_overhaul/history/architecture-before-current-guide.md#11-execution-and-completion) | Keeps implementation sequence and completion records out of the current guide. |
| Technical references | Retained | Technical references | Keeps the external language/framework sources. Their reachability was not checked. |

## Current repair status

Plan 073 is DONE, as recorded in the root index and its removal ledger. Plan 065 is completed by this ledger and guide. These remaining plans are still TODO; their target behavior must not be described as shipped:

| Plan | Current issue |
|---|---|
| [061](061-block-repeat-submit-after-post-write-failure.md) | Form does not block a repeat submit after an uncertain post-write failure. |
| [062](062-unify-display-definition-checks.md) | Display constructor checks are repeated and can differ from mounted checks. |
| [063](063-derive-renderer-types-from-runtime-roster.md) | Built-in renderer keys have separate type and runtime rosters. |
| [064](064-report-resource-contract-errors-at-the-member.md) | Some invalid resource declarations produce a generic type error. |
| [066](066-evaluate-loom-agent-repair-work.md) | Candidate evaluation is not complete; no time or reliability improvement is claimed. |
| [067](067-make-filter-query-ownership-explicit.md) | List filters do not declare output-key ownership or reverse draft mapping. |
| [068](068-enforce-one-data-source-in-surface-types.md) | Public source types allow both or neither; runtime checks require exactly one. |
| [069](069-give-compact-form-contracts-one-owner.md) | Resource types repeat the form-owned compact type projection. |
| [070](070-move-input-model-rules-to-component-owners.md) | Textarea and asset model-mode rules remain partly in Form authoring types. |
| [071](071-align-file-manager-values-with-canonical-assets.md) | File Manager provider types remain generic while the input model is canonical AssetValue. |
| [072](072-preserve-resource-ownership-in-option-caches.md) | Resource writes do not invalidate resource-owned option-source entries. |
| [074](074-unify-resource-route-access-evaluation.md) | Route entry ignores registered permission arrays and uses the detail operation. |
| [075](075-decouple-transport-from-unselected-operations.md) | Hono actions require querySchema even when no list operation exists. |
| [076](076-preserve-post-write-outcomes-in-delete-surfaces.md) | ListView can make a delete target available again after a post-write error. |

## Executable example and check map

| Example | Actual check that compiles or runs it |
|---|---|
| [users.schema.ts](../apps/web/src/routes/%28authenticated%29/settings/users/users.schema.ts), [users.actions.ts](../apps/web/src/routes/%28authenticated%29/settings/users/users.actions.ts), and [users.resource.ts](../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts) | `pnpm --filter @southneuhof/framework-web type-check` compiles app schemas, actions, resource bags, and route files. |
| [User list route](../apps/web/src/routes/%28authenticated%29/settings/users/index.route.vue), [create route](../apps/web/src/routes/%28authenticated%29/settings/users/create.route.vue), [detail route](../apps/web/src/routes/%28authenticated%29/settings/users/%5BuserId%5D/detail.route.vue), and [edit route](../apps/web/src/routes/%28authenticated%29/settings/users/%5BuserId%5D/edit.route.vue) | `pnpm --filter @southneuhof/framework-web type-check` compiles the literal page bindings and route types shown in the current guide. |
| [SelectForm.browser.spec.ts](../packages/loom/src/components/composites/__tests__/SelectForm.browser.spec.ts) and [SurfaceParity.browser.spec.ts](../packages/loom/src/components/composites/__tests__/SurfaceParity.browser.spec.ts) | `pnpm --filter @southneuhof/loom test:browser` runs both fixtures. The Loom type check also compiles their companion type fixtures. |
| [AssetParity.browser.spec.ts](../packages/loom/src/assets/__tests__/AssetParity.browser.spec.ts) | `pnpm --filter @southneuhof/loom test:browser` runs direct and managed asset cases. |
| [DisplayParity.browser.spec.ts](../packages/loom/src/components/core/__tests__/DisplayParity.browser.spec.ts) | `pnpm --filter @southneuhof/loom test:browser` runs Table, TreeTable, Detail, and extraction cases. |
| [export.spec.ts](../packages/loom/src/services/__tests__/export.spec.ts) | `pnpm --filter @southneuhof/loom exec vitest run --environment jsdom src/services/__tests__/export.spec.ts` runs export behavior. |
| [TableInput.browser.spec.ts](../packages/loom/src/components/composites/__tests__/TableInput.browser.spec.ts) and [table-input.type-test.ts](../packages/loom/src/components/composites/__type-tests__/table-input.type-test.ts) | `pnpm --filter @southneuhof/loom test:browser` runs row behavior; the Loom type check compiles the type fixture. |
| [QueryOwnershipFixture.vue](../apps/web/src/framework/acceptance/QueryOwnershipFixture.vue) and [QueryOwnershipFixture.spec.ts](../apps/web/src/framework/acceptance/QueryOwnershipFixture.spec.ts) | The app type check compiles the direct Form and Table bindings. `pnpm --filter @southneuhof/framework-web test:focused -- framework/acceptance/QueryOwnershipFixture.spec.ts` runs the controlled-query integration fixture. |

These are existing examples. This plan adds no new documentation-string tests or parser.

## One-off snapshot check

The exact body-match command was:

~~~sh
python3 - <<'PY'
from pathlib import Path
import hashlib
archive = Path('docs/resource_system_overhaul/history/architecture-before-current-guide.md').read_bytes()
marker = b'> Historical snapshot; not the current authoring contract.\n> Use the [current Loom contract and authoring guide](../ARCHITECTURE.md).\n>\n> ---\n\n'
if not archive.startswith(marker):
    raise SystemExit('historical notice does not match')
body = archive[len(marker):]
expected = '01ee4f42a253ef5bb235d91977bb678a28016f4386697f9f9bafaff49e859da1'
actual = hashlib.sha256(body).hexdigest()
if actual != expected:
    raise SystemExit(f'archive body changed: expected {expected}, got {actual}')
print(f'archive body matches pre-edit architecture SHA-256 {actual}; no source-relative Markdown links required rebasing')
PY
~~~

Result: exit 0. The snapshot body matches the architecture text before the rewrite. Its only new relative Markdown link is the notice link back to the current guide.

## One-off link check

The exact link-check command was:

~~~sh
python3 - <<'PY'
import re
from pathlib import Path
from urllib.parse import unquote
files = [
    Path('docs/resource_system_overhaul/ARCHITECTURE.md'),
    Path('packages/loom/README.md'),
    Path('docs/architecture/web-application-architecture.md'),
    Path('docs/resource_system_overhaul/history/architecture-before-current-guide.md'),
    Path('plans/065-loom-contract-inventory.md'),
]
link_pattern = re.compile(r'!?\[[^\]\n]*\]\(([^)\n]+)\)')
external = re.compile(r'^(?:[a-z][a-z0-9+.-]*:|//)', re.I)
def prose(path):
    lines = []
    fence = None
    for line in path.read_text().splitlines():
        opening = re.match(r'^\s*(\x60{3,}|~{3,})', line)
        if opening:
            marker = opening.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is None:
            lines.append(line)
    return '\n'.join(lines)
def slug(title):
    title = re.sub(r'<[^>]+>', '', title).strip().lower()
    title = re.sub(r'[^\w -]', '', title)
    return re.sub(r'\s+', '-', title)
def headings_for_target(target_path):
    result = set()
    for line in target_path.read_text().splitlines():
        match = re.match(r'^#{1,6}\s+(.+?)\s*#*\s*$', line)
        if match:
            result.add(slug(match.group(1)))
    return result
missing = []
checked = 0
for source in files:
    for match in link_pattern.finditer(prose(source)):
        target = match.group(1).strip().split()[0].strip('<>')
        if not target or external.match(target):
            continue
        path_part, hash_mark, fragment = target.partition('#')
        path_part = path_part.split('?', 1)[0]
        local = unquote(path_part)
        target_path = (source.parent / local).resolve() if local else source.resolve()
        checked += 1
        if not target_path.exists():
            missing.append(f'{source}: missing path {target}')
            continue
        if hash_mark and fragment and target_path.suffix == '.md':
            fragment = unquote(fragment)
            if fragment not in headings_for_target(target_path):
                missing.append(f'{source}: missing anchor {target}')
if missing:
    raise SystemExit('\n'.join(missing))
print(f'{len(files)} Markdown files checked; {checked} local links resolved; no missing paths or anchors')
PY
~~~

Result: exit 0; 5 Markdown files checked; 118 local links resolved; no missing paths or anchors. External URL reachability was not checked.

## Plan 065 execution evidence

| Step | Result |
|---|---|
| 1. Confirm Plan 073, record drift and links, read current owners | Done. Plan 073 was DONE. The committed drift command was empty; the uncommitted Plan 073 changes were reviewed and preserved. The baseline architecture gate passed with 18 tests and the real-source check. The final inbound scan found 14 Markdown links and 4 resolving fragments. |
| 2. Snapshot the post-Plan-073 architecture | Done. The one-off body check exited 0 and matched the pre-edit SHA above. The source contained no relative Markdown links that needed rebasing. |
| 3. Publish the current direct-authoring guide | Done. The owner/API map, normal author path, short usage examples, and current repair limits come first. Examples link to actual compiled app and Loom owners. |
| 4. Check Markdown paths and anchors | Done. The one-off check exited 0; 118 local links resolved across the active docs, archive, and this ledger. No local paths or anchors are missing. |
| 5. Run final gates and review | Done. See results below. No Plan 065 source, test, skill, or CI file changed. |

| Gate | Exact command | Result |
|---|---|---|
| Architecture | pnpm test:surface-architecture | Exit 0; 18 tests passed and the real-source check passed. |
| CI contract | node --test scripts/web-validation-workflow.test.mjs | Exit 0; 2 tests passed. |
| Loom examples and types | pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json | Exit 0. |
| App examples and routes | pnpm --filter @southneuhof/framework-web type-check | Exit 0; route contract, route generation, and Vue types passed. No new tracked route artifacts were created. |
| Direct Form and Table fixture | pnpm --filter @southneuhof/framework-web test:focused -- framework/acceptance/QueryOwnershipFixture.spec.ts | Exit 0; 1 fixture and 7 tests passed. |
| Users module source check | node scripts/module-ui-check.mjs --sources 'apps/web/src/routes/(authenticated)/settings/users' | Exit 0; selected template checks passed. Design, runtime, and acceptance were not reviewed by this check. |
| Whitespace | git diff --check | Exit 0. |

No new tests, source-code changes, skill edits, CI edits, commits, or pushes were made for Plan 065. Plan 066 remains TODO. No agent-performance improvement is claimed.

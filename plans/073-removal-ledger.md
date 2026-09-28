# Plan 073 removal ledger

This ledger records the owner search, removals, and checks for Plan 073. The
previous authoring tools are retired. Agents now write modules from the current
design, plan, and package contracts.

## Starting state

- HEAD: `05ebfa3e8b9608c50d5483c2fb2c1f6a01ef0f23`.
- `git status --short`: empty before edits and after the baseline checks.
- The drift review against `1246387` showed prior approved skill and plan work.
  The module development skill and its helpers already use direct authoring and
  the independent evidence recorder. No local edits were present to protect.
- `pnpm test:module-tooling`: PASS; 121 Node tests and 2 Python tests.
- `pnpm test:surface-architecture`: PASS; 19 tests and the real-source check.

## Inventory and action

The first reachability search found these active owners and references. The
second search found related names and old example ties. Each path below was
opened before its action was selected.

| Path | Action |
| --- | --- |
| `scripts/scaffold-bounded-module.mjs` and `.test.mjs` | Delete the tool and its generation tests. |
| `scripts/integrate-bounded-module.mjs` and `.test.mjs` | Delete the owner-editing CLI and its tests. |
| `scripts/verify-module.mjs` and `.test.mjs` | Delete the syntax/template checker and its tests. |
| `scripts/test-support/bounded-fixture.mjs` | Delete after removing its only test imports. |
| `scripts/check-surface-architecture.mjs` | Remove generated-output execution. Keep source, type-setting, path, and Markdown checks. |
| `scripts/check-surface-architecture.test.mjs` | Remove its generated-output case. Keep real-source analyzer cases. |
| `scripts/module-tooling.test.mjs` | Move the worksheet initializer case to its own test file. Move the command-output contract to the evidence test owner. Delete checker-only cases and this mixed file. |
| `scripts/module-skills.test.mjs` | Keep skill-link, active-skill, API test setup, and evidence-command checks. Remove checks tied to the retired commands and example path. |
| `scripts/module-evidence.mjs` and `.test.mjs` | Keep. This recorder has no dependency on the retired owners. |
| `scripts/module-ui-check.mjs` and `.test.mjs` | Keep. These checks inspect real app sources and UI contracts. |
| `package.json` | Remove the two retired command aliases. Keep `module:evidence` and the independent tooling test command. |
| `README.md` | Remove the obsolete manifest workflow and missing guide link. State the direct-authoring handoff. |
| `AGENTS.md` | Replace the stale module-scaffolding prerequisite with direct application authoring. |
| `packages/loom/README.md`, `docs/ui/forms.md` | Replace generated-fixture examples with current application source links. |
| `apps/web/src/framework/__type-tests__/plan057_generated_users/` | Delete all files. The user resource and its list, detail, and edit routes already exercise these public bags in the real app; the duplicate fixture adds no independent contract. |
| `evals/carta-module-workflow/cases.json` | Remove the five command/output cases and the environment case that depends on a manifest check. Keep design, plan, handoff, review, freshness, and unavailable-runtime cases. |
| `evals/carta-module-workflow/fixtures/workflow/` | Delete its four manifests and four task briefs. No retained case uses them. |
| `evals/carta-module-workflow/README.md`, `grading.md` | Keep independent evaluator guidance; remove retired command, manifest, and result instructions. |
| `evals/carta-module-workflow/plan-019-result.md` | Delete this historical report. Its subject is the retired workflow. |
| `plans/018-*`, `plans/019-*`, `plans/020-*`, `plans/021-*`, `plans/057-*` | Delete old implementation instructions whose purpose is the retired workflow. Git history keeps the original records. |
| `plans/002-*`, `026-*`, `027-*`, `029-*`, `030-*`, `034-*`, `042-*`, `044-*`, `050-*`, `051-*`, `058-*`, `065-*`, `066-*`, `075-*`, and `plans/resource-system-overhaul-inventory.md` | Remove stale command, example, or test references. Keep unrelated route, schema, type, and verification history. |
| `plans/README.md` | Remove obsolete plan rows and old workflow instructions. Mark Plan 073 complete after review. |
| `docs/resource_system_overhaul/ARCHITECTURE.md` | Remove obsolete generation requirements. Keep independent source checks and real module examples. |
| `docs/resource_system_overhaul/findings/plans/README.md`, `plans_batch_2/README.md`, and `plans/062-*` through `plans/069-*` | Remove obsolete paths and instructions. Add a historical notice where the retained record changes. |
| `docs/resource_system_overhaul/findings/plans/implementation-evidence/coverage.json`, `repository-plan-index.txt` | Retire the copied evidence records. They no longer describe the supported workflow; original bytes remain in Git history. |
| `docs/resource_system_overhaul/findings/plans/implementation-evidence/baseline-observations.json` | Restore and keep the original observation unchanged. It contains no direct reference to a retired command or source owner. |
| `docs/resource_system_overhaul/findings/plans/implementation-evidence/baseline-verification.json` | Restore and keep the original result unchanged. The recorded test result describes the baseline run and contains no direct reference to a retired command or source owner. |
| `plans/carta-module-skill-alignment/reports/tooling.json`, `tooling-final.json` | Retire the source-fingerprint reports. Their hashes cover files removed by this plan. Keep the independent UI report. |
| `docs/findings/command-code-session-27ba8e55.md` | Keep the coffee-shop transcript. Redact its obsolete CLI instruction, manifest guide link, and three source-file paths; add a notice that this is a targeted redaction and not the original export. |
| `.github/workflows/module-tooling-validation.yml`, `.github/workflows/web-validation.yml` | Keep. Their selected checks still cover evidence, skills, UI contracts, and app source. They do not depend on the removed commands. |
| `apps/web/src/components/navigations/CommandPalette.spec.ts` | Remove a stale comment that credited navigation entries to generated modules. Keep the current app navigation assertions unchanged. |

The module CLI also accepted a `routes` manifest. It had no caller outside the
same owner and its tests. Remove that branch with the CLI. Vue Router continues
to generate route types from hand-authored file routes; the web type-check stays
in the required gates.

## Test audit

The tests selected for removal have no production callers. Their only callers
are their matching scripts, the static-output check, and the removed mixed test
file. The runtime modules previously created by those tools remain in the app.

| Test | Failure it detected | Remaining owner after retirement |
| --- | --- | --- |
| `scaffold-bounded-module.test.mjs` | Invalid manifests, generated paths and source, command options, generated browser/API cases, and migration rollback. | None is an active product contract. Application source, API routing, migrations, and Vue Router remain owned by their app/framework tests. |
| `integrate-bounded-module.test.mjs` | Registration edits, idempotency, missing anchors, and duplicate owner entries. | Module changes are authored at the existing domain, permission, seed, and navigation owners. These are not a supported separate CLI contract. |
| `verify-module.test.mjs` | Manifest checks, generated-file expectations, proof command selection, and checker reports. | `module-evidence.test.mjs` owns evidence freshness and command recording; app and package gates own their runtime/type contracts. |
| Generated-output test in `check-surface-architecture.test.mjs` | Whether emitted module templates pass the source checker. | No module source templates are emitted. The same checker scans current source files and active examples. |
| Generator cases in `module-tooling.test.mjs` | CLI behavior and verifier orchestration. | None after the CLI removal. The worksheet initializer remains in its own test. |

The existing `command evidence retains full output and its working directory`
case tested the command runner now owned by the evidence recorder. Move that
case to `module-evidence.test.mjs`: it protects complete evidence output and the
recorded working directory. A truncation or incorrect directory would make a
record misleading. Existing recorder cases test failures, logs, freshness,
overlap, and path safety, but do not prove that full output and the selected
directory are retained together. It needs no production seam.

The worksheet initializer case also stays. It proves that the script creates
the canonical worksheet, leaves user edits intact, and rejects traversal. Its
Python sibling tests validate worksheet contents, not this CLI boundary.

## Final evidence

The first post-edit Tooling run failed because the active-skill reference test
still called the removed `prose()` Markdown-fence helper. I restored the helper;
the final Tooling rerun passed.

| Gate | Exact command | Result |
| --- | --- | --- |
| Tooling | `pnpm test:module-tooling` | Exit 0; 68 Node tests and 2 Python tests passed. |
| Architecture | `pnpm test:surface-architecture` | Exit 0; 18 tests passed and the current-source check passed. |
| Loom types | `pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json` | Exit 0. |
| Web types | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0; route contract, route type generation, and Vue types passed. No tracked route artifacts changed. |
| Navigation test | `pnpm --filter @southneuhof/framework-web exec vitest run src/components/navigations/CommandPalette.spec.ts` | Exit 0; 1 file, 4 tests passed. The only test-file edit removes an obsolete comment. |
| Eval inputs | `python3` JSON/path check below | Exit 0; valid JSON, 9 cases, all 10 input paths exist. |
| Markdown links | `python3` local-path resolver below | Exit 0; 37 edited Markdown files checked, no missing local targets. |
| Exact reachability | `rg -n --hidden -g '!.git/**' -g '!node_modules/**' -g '!pnpm-lock.yaml' 'scaffold-bounded-module|integrate-bounded-module|verify-module|scaffold:bounded-module|verify:module|bounded-fixture' .` | Exit 0; all matches are in this plan and ledger. |
| Secondary inventory | `rg -n -i 'bounded.module|module generator|module scaffolding|generated user|plan057_generated_users' scripts docs .agents evals plans README.md packages/loom/README.md apps/web/src/framework/__type-tests__ .github` | Exit 0. Matches remain in this plan and ledger and in the preserved transcript: two copied Plan 018 index entries, one historical decision sentence about a second generator, and one transcript thought note. These are historical content, not runnable instructions or active links. |
| Whitespace | `git diff --check` | Exit 0. |

The repository has no `scripts/check-changed.mjs`; the test-audit autoreview
tool is absent from the available tool list. These checks are unavailable, not
passes. Full workspace tests and hosted CI were not run.

The final tree includes no route-generation replacement and no tracked generated
route artifacts. No commits, pushes, migrations, or seeds were made.

## Self-review

The app resource fixtures were duplicates of the real users resource and routes;
the web type check still compiles those real owners. The source checker lost only
its generated-output branch and still scans current source, type settings, and
active documentation. The evidence recorder and UI checker still run through the
tooling suite. The independent worksheet initializer and command-output case
remain under their owning tests. The coffee-shop transcript retains its original
body apart from the targeted command, guide, and source-path redactions; its note
states that the edited file is not the original export. Both baseline JSON records
match their original Git bytes. The only test-code behavior comment removed was
stale; the navigation assertions did not change. No app route, runtime resource,
framework contract, or unrelated route-type generation file changed.

The one-off eval-input check was:

```sh
python3 - <<'PY'
import json
from pathlib import Path
root = Path('evals/carta-module-workflow')
data = json.loads((root / 'cases.json').read_text())
missing = [(case['id'], source) for case in data['cases'] for source in case.get('inputs', []) if not (root / source).is_file()]
if missing:
    raise SystemExit('\n'.join(f'{case}: {source}' for case, source in missing))
print(f"valid JSON; {len(data['cases'])} cases; all {sum(len(case.get('inputs', [])) for case in data['cases'])} input paths exist")
PY
```

The one-off local-link check was:

```sh
python3 - <<'PY'
import re, subprocess
from pathlib import Path
from urllib.parse import unquote
status = subprocess.check_output(['git', 'status', '--porcelain=v1', '-z']).decode().split('\0')
files = []
for row in status:
    if not row or len(row) < 4:
        continue
    code, name = row[:2], row[3:]
    path = Path(name)
    if name.endswith('.md') and code != ' D' and path.is_file():
        files.append(path)
missing = []
for file in files:
    prose, fence = [], None
    for line in file.read_text().splitlines():
        opening = re.match(r'^\s*(`{3,}|~{3,})', line)
        if opening:
            marker = opening.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is None:
            prose.append(line)
    for match in re.finditer(r'!?\[[^\]\n]*\]\(([^)\n]+)\)', '\n'.join(prose)):
        target = match.group(1).strip().split()[0].strip('<>')
        if not target or re.match(r'^(?:[a-z][a-z0-9+.-]*:|#|//)', target, re.I):
            continue
        local = unquote(target.split('#', 1)[0].split('?', 1)[0])
        if local and not (file.parent / local).exists():
            missing.append((str(file), target))
if missing:
    raise SystemExit('\n'.join(f'{source}: {target}' for source, target in missing))
print(f'{len(files)} edited Markdown files checked; no missing local link targets')
PY
```

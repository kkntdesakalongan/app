# Plan 066 comparison protocol

Status: `KIT BLOCKED / PILOT NOT RUN`.

## Source and instruction controls

The baseline commit is `12463870df8df3d488070ae1f9c1992cf577756d`, with Git
tree `22d0b6afdf1536120b6fa328af3623c7755d6482`. Its worker source snapshot
hash is `66bcdb6da4abcbc00c7b099819ac28fedd04a88dd070b67c8544960421e6e825`
over 1,137 files.

The candidate is an uncommitted working-tree snapshot based on the same
revision. It is a pre-final checkpoint, captured on 2026-09-27 at 13:04 WIB.
Its patch was written at 13:04:14 WIB and its untracked archive at 13:04:28
WIB; the source manifest was written at 13:15:57 WIB. It contains work from
Plans 061–065 and 067–076 as represented at that checkpoint. The final Plan 074
nested-navigation fixture correction was still pending, so the ledger excludes
Plan 074 from the completed-plan list and records its earlier work separately.
This checkpoint does not represent the current final worktree. Its worker
source snapshot hash is
`458f2ab6cdd125f4b798d61cbb5a9a8578a165bd5e690e9c52146738a3fc9755` over 1,134
files. Its exact capture is `/tmp/plan066/snapshots/candidate.patch` plus
`/tmp/plan066/snapshots/untracked.tar`. The patch SHA-256 is
`ea901df654a2dcd27e8398c463002b4235bf056df5a6ecdb7400416240ee6aeb`; the
untracked archive SHA-256 is
`bb9a74e6dab8d29c6382a9ed0013818085d710d3ba8cecf6ccd30233cf93e9cf`. The
sorted path list is `/tmp/plan066/snapshots/untracked-paths.txt`, SHA-256
`4123a0cedcb74c0fe5905ed9f8287a43ce64fe12e956ac10b90c5b3a465ffb79`. The
source manifest paths and their content hashes are recorded in the results
ledger. The candidate patch excludes `evals/`, `plans/`, `docs/findings/`, and
historical finding archives. It excludes environment files, database settings,
secrets, `.git`, installed packages, and build output.

After capture, `apps/web/src/router/__tests__/nested-navigation.spec.ts` was
corrected so two scoped instances use the same resource owner name. The captured
file hash was
`656f65502898001870002b4cd64f0c0a80ffb8b541984b405284747ea1247406`; the
current file hash is
`df05d75b4b0ecf12992b1d517dca7efc8f2157f9343404c795fc9bf7ce746e51`. Root also
updated plan index/status documents after capture. Those plan documents are
excluded from worker workspaces, but the recorded candidate remains a historical
checkpoint. No pilot used it. Before any future pilot, capture the final
candidate worktree again and record fresh source-tree, patch, untracked-file,
manifest, and plan-state hashes. Do not use the pre-final hash as the final
candidate identity.

Both variants use the same current `AGENTS.md`, `.agents/skills/`, root
`README.md`, `docs/`, and `packages/loom/README.md` snapshot. The instruction
snapshot hash is
`cd514a2f87f635b1fca5e2e45c44efb888ea365798bab385be2ed9b846b5c19d` over 147
files. The skills hash is
`a7b2e52f329e6bebea06b36cfcd4a44ddb27a55ab8464ff4e65bf6a088eb9b16` over 132
files. Root `AGENTS.md` hash is
`9bf0f7171a1756250924e90d010464469af807bdc108abddd16d62847e372963`. The
fixture hash is
`134e73b525ba8352adb5656ac9b69b6672c9193727a858d5c8abebd4c31ecba7` over 39
files: `cases.json`, this evaluation's README and rubric, and `fixtures/loom/`.
Hashes use SHA-256 over sorted relative paths, a NUL byte, each file-content
SHA-256, and a newline.

Both workspaces use the same lockfile, SHA-256
`857c955c9546a64203d4ff3130e83ed68f8ff231c79df11313f460a5108d61f6`. Their
installed `node_modules/.pnpm/lock.yaml` hashes match at
`63665adc6efd1262db87325721e6c2425ea646612d03a1c9bb4e9fd10e1499da`. Each
workspace used `pnpm install --offline --frozen-lockfile`, with 860 packages
installed and no downloads. Both used Node `v26.9.0` and pnpm `12.1.0`. The
package manifests differ only in scripts; dependency declarations and lockfile
match.

## Worker isolation

Make a clean checkout for each worker. Start from the recorded baseline or
candidate snapshot. Remove `evals/` and `plans/`. Do not include `.git`, local
environment files, database settings, or secrets. Give the worker one request
from `cases.json` and only that case's named inputs. Prepare its fixture with
`fixtures/loom/prepare-workspace.mjs` in `worker` mode. Do not give the worker
the rubric, private reference, seeded-fail files, evaluator tests, other case
fixtures, or this protocol.

Keep the completed worker checkout unchanged. Make a separate evaluator copy
after the session ends. Install the grader there with `grade` mode, then run the
type-check and focused test commands. This separation prevents a worker from
searching the repository for expected results. No worker session started in
this attempt, so no transcript or worker artifact exists.

## Case runs and budget

The intended comparison is five fresh baseline/candidate pairs. Each pair uses
one `gpt-6-luna` session at maximum reasoning effort, the same checkout tools,
one request, and no human reply. The proposed cap is 8,000 output tokens and 15
minutes, but neither was selected or used because no worker started. The ledger
records the model and budget as unselected for every run. No measured cost or
elapsed time is reported.

The local Codex CLI was installed and login status was available. No CLI worker
process was started. The comparison stopped before that step because the
candidate reference for case B did not type-check after two fixture-preparation
attempts. This is a fixture contract block, not a missing CLI installation and
not an agent result.

## Preparation and acceptance commands

Run these commands from the repository root unless a command names a disposable
workspace.

| Purpose | Command | Result |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- evals/carta-module-workflow` and `git status --short` | The case files are working-tree changes; the initial status contained other user work, which remains untouched. |
| Case inventory | `node -e 'const fs=require("node:fs"); const c=JSON.parse(fs.readFileSync("evals/carta-module-workflow/cases.json","utf8")); const ids=c.cases.map(x=>x.id); if(new Set(ids).size!==ids.length) process.exit(1); console.log(ids.length)'` | 14 unique ids, including five new Loom cases. |
| Fixture type-check | `pnpm --filter @southneuhof/framework-web type-check` | Case A reference passed in baseline and candidate. Case B did not pass; preparation stopped at the two-attempt limit. |
| Focused acceptance | `pnpm --filter @southneuhof/framework-web test:focused -- framework/__tests__/loom-agent-eval.spec.ts` | Case A reference passed three tests in baseline and candidate. No other case was run. |
| Loom regression | `pnpm --filter @southneuhof/loom test` | Not run; the comparison stopped during fixture preparation. |
| JSON syntax | `python3 -m json.tool evals/carta-module-workflow/loom-repair-results.json` | Passed after ledger creation. |
| Whitespace | `git diff --check` | Passed for task-owned changes. |

The reference completion for case A passed the focused test in both variants:
three tests passed in each workspace. Type-check passed in both. Case B failed
reference preparation. On the first type-check attempt, the component prop bag
also failed because `inputMode` was not in the component contract. That member
was removed. On the second candidate attempt, type-check still reported
`TS2322`: the update form callback produced `submit: (output: never) =>
Promise<AmountRecord>`, which failed `UpdateSubmitInputDiagnostic`; TypeScript
then hid the resource's `update` operation. The baseline also failed to accept
the transformed update declaration. The plan's two-attempt stop rule was
reached, so case B was not prepared again and cases C–E were not prepared.

The A command summaries were observed during preparation, but their full output
was not saved as a separate artifact. The ledger records the commands and
outcomes and marks the artifact path as unavailable. Case A seeded-fail
validation and reference/seeded validation for cases B–E were not run. The
complete worker-run ledger marks all ten pairs `BLOCKED`; none is `PASS` or
`FAIL`. The type-check failure belongs to fixture preparation, not to a worker.
See [the report](loom-repair-report.md) and
[the ledger](loom-repair-results.json) for the recorded detail.

## Stops and future runs

Do not patch Loom to make the fixture pass. Review case B's reference against
the current `ResourceUpdateDeclaration` input/output types in a later bounded
preparation. Prove the reference passes and the seeded declaration defect fails
before starting workers. For a future comparison, select and record a budget
before the first fresh session. Append run ids; do not replace earlier records.
Keep evaluator files outside every worker-readable checkout.

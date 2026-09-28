# Plan 066 comparison protocol

Status: `KIT READY / PILOT BLOCKED` — the fixtures pass their applicable reference and seeded-defect checks. No worker session started because the local Codex CLI sandbox does not provide the required outside-read isolation.

## Current source and instruction capture

The baseline is commit `12463870df8df3d488070ae1f9c1992cf577756d`, Git tree `22d0b6afdf1536120b6fa328af3623c7755d6482`, 1,075 worker-source files, and source-tree SHA-256 `15316e170c63493495c15eaf0a5f5cf6f8673c65824b8257ba1472fd64bb7a59`.

The final candidate is commit `38cb2a991a30b36c5628fbe955b2ba60a5728ded`, Git tree `3e11ec0222780648b8aa9a919b4a98a68826ae32`, 1,072 worker-source files, and source-tree SHA-256 `1080bc6ae8eb39c47010146f522f9cae4bc0f383acb1cc07f2ef6c4e41caa41c`. It includes completed product Plans 061–065 and 067–076, including the final Plan 074 correction. Plan 066 is an evaluation and is not listed as completed product work.

Fresh deterministic source archives and manifests are in `/tmp/plan066/final-capture/`:

| Capture | File | SHA-256 |
|---|---|---|
| Baseline source archive | `baseline-source.tar` | `edb6466ba82eff9fce9aba553927f01e6935f18bd09302d2dd511770efa8f915` |
| Baseline manifest | `baseline-source-manifest.json` | `bf23fd123adf7c2675af04481edb8dcc8df5777ba92a375e085a01ff79aa2024` |
| Candidate source archive | `candidate-source.tar` | `ee252b1cdbf2d2930238add7c61b66c5692846bc8e77b78f06c05870b99e964d` |
| Candidate manifest | `candidate-source-manifest.json` | `f4d3b4b23d34fd341efdd5d062699835b2e99f410b4a2e4c505c795dc85f035b` |
| Baseline-to-candidate patch | `candidate-final.patch` | `38991add91d31ae1e672d53d0d304dcf9ce392a7c6bbf6bca2b7b81bd9d4e202` |
| Candidate untracked archive | `candidate-untracked.tar` | `84ff92691f909a05b224e1c56abb4864f01b4f8e3c854e4bb4c7baf1d3f6d652` |
| Candidate untracked path list | `candidate-untracked-paths.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The patch excludes evaluation files, plan files, and top-level historical findings. There are no untracked worker-source files. The current shared instruction hash is `866ee53f40672a292366e12fa1ec3751f2494518ebb44bb9ab76314588e68806` over 147 files. The current `.agents` skill hash is `c583f3f920a8838eaaf26f0d1d3b10f7c7667682c8eeceb22ed410a3724a2d79` over 132 files; root `AGENTS.md` is `9bf0f7171a1756250924e90d010464469af807bdc108abddd16d62847e372963`. The current case, README, rubric, and fixture hash is `269bdded5e527f351ef420423beab9257fe301776083887d68cacc28865049f4` over 39 files. The exact manifests are beside the source captures.

The pilot-start snapshot of `plans/066-evaluate-loom-agent-repair-work.md` and `plans/README.md` has tree hash `607718ab23c8dd295ee9f3bfc4e113dd54d70c068525ba375d88854ec3bbea9d`. Its manifest and archive are also under `/tmp/plan066/final-capture/`. This snapshot records `KIT READY / PILOT STARTING`; the report and plan were changed to the final blocked state after the isolation check.

Both variants use Node `v26.9.0`, pnpm `12.1.0`, lockfile SHA-256 `857c955c9546a64203d4ff3130e83ed68f8ff231c79df11313f460a5108d61f6`, and installed pnpm-lock SHA-256 `63665adc6efd1262db87325721e6c2425ea646612d03a1c9bb4e9fd10e1499da`. Dependency declarations match. Existing installed package trees were reused; no install ran during this capture.

## Fixture validation

`fixtureVersion` is now 2. The current fixture hashes identify the corrected B test accessor, deterministic C refresh check, compile-valid D seeded list, and corrected A seeded defect. These changes preserve the stated business acceptance conditions. The earlier fixture hash and all ten earlier `BLOCKED` run records remain unchanged in the ledger.

`prepare-workspace.mjs` materialized each case in disposable baseline and candidate copies. The private evaluator stayed outside the prepared workspaces. Results:

| Case | Baseline reference | Candidate reference | Seeded defect |
|---|---|---|---|
| A — dependent selection | Type-check and 3/3 focused tests pass | Type-check and 3/3 pass | Type-check passes; all three acceptance checks fail as seeded in both variants |
| B — transformed update | Type-check and 4/4 pass | Type-check and 4/4 pass | The declared `create.typo` fails type-check; B-01 and combined B-02/B-03 fail as seeded in both variants |
| C — row command | Type-check and 3/3 pass on attempt 2 | Type-check and 3/3 pass on attempt 2 | Type-check passes; C-01 fails as seeded in both variants |
| D — create-only module | Type-check and 2/2 pass | Type-check and 2/2 pass after a focused recheck | Type-check passes; D-02 fails as seeded in both variants |
| E — relation freshness | Framework block: baseline rejects the `resource` prop; E-01 also observes a stale label | Type-check and the focused E-01/E-02 test pass | Type-check passes; E-01 fails as seeded in the candidate. Baseline seeded validation is not applicable after the reference block. |

Case C's first focused run raced the initial list load. The evaluator now waits for the visible initial row state, then the updated row state, before it checks reload. Both corrected references pass. Case D's first candidate focused log showed one passing test; a second isolated check exercised both D-01 and D-02 and passed both. D's anticipated baseline transport block did not reproduce. Do not score it as a candidate-only capability.

The Case B seeded type-check reports the declared `create.typo` and the incomplete transformed update submit contract. Both are repair targets in the case request; neither is an unrelated fixture compiler defect. Its reference uses the bound form schema for parser checks; it does not rely on a private `updateSchema` export. Case E's baseline failure is a framework limit and is not a worker mistake.

Full command logs, each with a SHA-256 recorded in `loom-repair-results.json`, are in `/tmp/plan066/final-validation/`. The Loom regression command passed in both isolated source variants: baseline 450 tests in 61 files; candidate 492 tests in 62 files. Logs: `baseline/loom-regression-final.txt` SHA-256 `f8e93a339ba6d32efd0c649802f488ced1b66c761a03f17ae0aab2962f25b00c` and `candidate/loom-regression-final.txt` SHA-256 `369e52d1fc2068607202b3f150bfb518d19ccb6a1a7182eff50950c362d5a0f6`.

## Worker isolation and stop

The selected pilot budget was recorded before any session: ten new sessions, five baseline/candidate pairs, GPT-6 Luna at `max` reasoning, Codex CLI `0.157.1`, workspace-write tools, no human replies, an 8,000 output-token prompt cap, and a 900-second enforced time limit. The CLI has no hard per-session output-token cap; the token cap would be an instructed limit checked against reported usage.

The local Codex CLI sandbox template says `workspace-write` permits file reads while restricting edits to the current directory and writable roots. See the [Codex sandbox template](https://github.com/openai/codex/blob/main/codex-rs/prompts/templates/permissions/sandbox_mode/workspace_write.md). A local check from a prepared worker CWD ran `codex sandbox -P :workspace ... -- test -r /Users/gamer/Documents/projects/carta/evals/carta-module-workflow/grading.md` and exited 0. The saved check record is `/tmp/plan066/isolation-canary/private-rubric-read-check.json`, SHA-256 `a43fc20ddd515c99abb81574851bfc568f90460263554d1355c479dcca219fd7`. It did not read or print the rubric contents. The sandbox also read the public root `README.md` from the host checkout; its copied bytes match SHA-256 `e086447bcbc95471a4474ff61bb5ca1e1a5c626df12d28fc67a87cf32c3ca8ae`. The private rubric check tested read access without reading its contents. This confirms that workspace separation alone does not blind these local CLI sessions from the host checkout.

The worker copies omit `evals/`, `plans/`, `.git`, `reference/`, `seeded-fail/`, and `evaluator-only/`, and they contain only one public case. However, the sandbox does not deny reads from outside CWD. Starting ten sessions would violate the plan's private-grader requirement. No worker session started, so no worker transcript, source artifact, acceptance score, repair count, elapsed time, or token use exists. The ten new run IDs are `BLOCKED` by this harness isolation gate, not worker failures. The first ten `BLOCKED` records remain historical and immutable.

A future pilot needs an isolated executor or container that mounts only one source variant and one public case, blocks reads from the host repository and credentials, and preserves the same model, effort, tools, budget, and prompt for each pair. Do not start the pilot in the current local workspace-write harness.

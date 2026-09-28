# Plan 066 report

Status: `KIT READY / PILOT BLOCKED`.

The five-case evaluation kit is now validated against its private references and seeded defects. The current baseline and final candidate have fresh source, patch, untracked-file, manifest, dependency, instruction, skill, fixture, and pilot-start plan-state captures. The first pre-final candidate capture and its ten blocked runs remain historical. See the [comparison protocol](loom-repair-protocol.md) and [results ledger](loom-repair-results.json).

## Correctness

Cases A–D reference implementations pass their focused tests in both baseline and candidate. Candidate E passes its focused test. Baseline E cannot express the relation resource binding: its `defineForm` declaration rejects the `resource` prop, and the behavior check shows the option label stays stale. Record that as a baseline framework block, not a worker error.

The seeded defects fail for their intended reasons in every applicable variant. Case B's explicit `create.typo` is the declared repair. Its other seeded editor defects produce expected diagnostics and acceptance failures. The grader now reads the public bound form schema. Case C's evaluator waits for visible list states before checking refresh. Case D's baseline reference passes; the anticipated baseline transport limitation did not reproduce. Case E's seeded defect is tested only in the candidate because baseline reference validation is blocked. Validation commands and hashes are in the ledger.

The baseline Loom regression passed 450 tests in 61 files. The candidate passed 492 tests in 62 files. These framework results check their respective snapshots; they do not measure agent work.

## Worker work and limits

No worker session ran. Local Codex CLI `0.157.1` can start fresh sessions, but its `workspace-write` sandbox does not provide the required read isolation. Its sandbox contract permits reads while limiting writes. From a prepared worker CWD, a read-permission check for the main checkout's private grading file exited 0. The check did not print the file contents; its command record and hash are in `/tmp/plan066/isolation-canary/private-rubric-read-check.json` and the ledger. The same sandbox read the public host-checkout README, confirming outside-CWD content reads. This means an agent session could search the host checkout even though its worker workspace omits `evals/`, `plans/`, and evaluator fixtures. The pilot stopped before any model session to preserve blinding.

All ten newly appended run records are `BLOCKED` at the harness gate. They contain no worker output, artifact, command count, source review, or measured cost. The model and budget were selected before preparation, but no GPT-6 Luna session was invoked. The ledger keeps unavailable values `null` with reasons. It preserves all ten earlier blocked records and their original candidate and fixture hashes.

There was no real backend, database, production, or external write. No product packages or application source changed in the working checkout. No package install ran during final capture; both variants reused identical installed package trees and locks.

## Next action

Use a fresh-session executor with a workspace-only read boundary. It must expose one captured baseline or candidate source tree and one public task fixture per session while denying access to the host checkout and credentials. Then run the ten paired sessions with the recorded model, effort, prompt, and caps. Until that harness is available, there is no agent-quality or cost comparison and no supported efficiency claim.

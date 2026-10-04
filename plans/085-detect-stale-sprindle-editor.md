# Plan 085: Detect an out-of-date Sprindle editor installation

> Implementation instructions: When execution is authorized, read the whole
> plan, run its drift command first, and follow each verification gate. Compare
> changed owners with the current-state excerpts. Reconcile named prerequisites;
> stop and report other contract mismatches. Update this plan and its index row
> only after implementation and review. Preserve unrelated work.
>
> Use the repository's `api-conventions` skill for API changes and
> `test-audit` for tests. No code comments, compatibility aliases, commits,
> pushes, or external writes are authorized by this planning pass.

## Status

- Status: DONE — APPROVE.
- Priority: P2.
- Effort: M.
- Risk: LOW; normal development only reads the installed extension.
- Category: dx / correctness.
- Confidence: HIGH for the missing check; the receipt format is proposed.
- Depends on: Plan 082 for the build-input inventory and development launcher.
- Planned at: commit `206768c`, 2026-10-04.

## Why this matters

The installed language extension contains a copy of Sprindle's compiler and
public types. Updating the workspace does not update that copy. Developers
must currently remember when to run `pnpm setup:editor`. Normal API
development should detect an old or incomplete installed copy and give one
clear command to repair it.

Installation remains an explicit user action. This plan does not write to
the user's VS Code extension directory during development.

## Current state

`packages/sprindle/editor/install.mjs:8–15` builds and replaces one
installation:

```js
const build = spawnSync(process.execPath, [join(editor, 'build.mjs')], { encoding: 'utf8' })
if (build.status) throw new Error(build.stderr || build.stdout)
const extensions = process.env.SPRINDLE_VSCODE_EXTENSIONS_DIR || join(homedir(), '.vscode', 'extensions')
const target = join(extensions, 'southneuhof.sprindle-language-0.0.0')
mkdirSync(extensions, { recursive: true })
rmSync(target, { recursive: true, force: true })
cpSync(editor, target, { recursive: true, filter: (source) => !source.endsWith('/test') && !source.endsWith('/install.mjs') && !source.endsWith('/build.mjs') && !source.endsWith('/.DS_Store') })
```

- `packages/sprindle/editor/build.mjs:7` rebuilds tooling.
  Lines 12–21 bundle the language server. Lines 22–37 copy the native
  compiler, selected dependencies, route definition, and public types.
- `packages/sprindle/editor/package.json:5` has version `0.0.0`.
  That version does not identify the current workspace source.
- `packages/sprindle/editor/extension.cjs:23` starts its installed
  `dist/language-server.mjs`; it does not load the workspace compiler.
- `packages/sprindle/editor/test/install.mjs:7–19` already runs the
  actual installer with `SPRINDLE_VSCODE_EXTENSIONS_DIR` set to an
  owned temporary directory. It checks entry files, then removes that directory.
- `package.json:30` exposes `setup:editor`.
  `apps/api/README.md:89–91` tells the developer to run it once.
- `package.json:27` runs root `scripts/*.test.mjs` in
  `test:module-tooling`. The module-tooling workflow uses Node 24.
- Plan 082 adds `apps/api/scripts/dev-launcher.mjs`. That launcher is
  the normal API development entry and prepares current framework tools.

Use the existing installer path and environment override. Reuse Plan 082's
plain JavaScript input-state helper without a new public package export.
Do not add code comments, another extension ID, an editor setting, or a
compatibility wrapper. The check compares installed build state; it cannot
prove that VS Code has loaded or restarted the extension.

## Scope

In scope:

- `packages/sprindle/editor/state.mjs` — create the private editor
  input/receipt logic.
- `packages/sprindle/editor/build.mjs` — publish a receipt after a valid build.
- `packages/sprindle/editor/install.mjs` — keep private check/build files out
  of the installed extension while preserving the existing target and override.
- `packages/sprindle/editor/test/install.mjs` — cover receipt delivery
  through the actual installer.
- `scripts/check-editor.mjs` — create the read-only CLI check.
- `scripts/check-editor.test.mjs` — create installed-state/notice proofs.
- `apps/api/scripts/dev-launcher.mjs` — invoke the check after preparation.
- `apps/api/scripts/dev-launcher.test.mjs` — cover nonblocking startup.
- `apps/api/scripts/dev-runtime-reload.proof.mjs` — copy the actual editor
  check inputs into the isolated Plan 082 launcher fixture.
- `.github/workflows/module-tooling-validation.yml` — trigger the check's
  tests for changes to its framework owners.
- `.github/workflows/backend-validation.yml` — run the focused check proof.
- `README.md`, `apps/api/README.md`, this plan, and `plans/README.md`.

Out of scope: automatic installation, global editor writes, VS Code launch
or reload, extension behavior, installer target changes, language-service
rewrites, Loom, frontend RPC generation, and dependency upgrades. Plan 082
owns tooling receipt generation; do not create a second package inventory.

## Commands you will need

Run from the repository root with Node 24 or newer.

| Purpose | Command | Expected result |
|---|---|---|
| Drift | `git diff --stat 206768c..HEAD -- packages/sprindle/editor scripts/check-editor.mjs scripts/check-editor.test.mjs apps/api/scripts/dev-launcher.mjs apps/api/scripts/dev-launcher.test.mjs .github/workflows/module-tooling-validation.yml .github/workflows/backend-validation.yml README.md apps/api/README.md` | Reconcile Plan 082 and later changes first |
| Read-only check proof | `node --test scripts/check-editor.test.mjs` | Correct notices, no installation mutations |
| Installation proof | `pnpm --filter @southneuhof/sprindle test:editor-install` | Actual installer delivers valid state in its owned temporary directory |
| Launcher and Plan 082 proofs | `node --test apps/api/scripts/ensure-tooling.test.mjs apps/api/scripts/dev-launcher.test.mjs` | Editor check does not block API development; all seven Plan 082 proofs pass |
| API route proof | `pnpm --filter @southneuhof/api test:dev-routes` | Runtime reload proof passes with the reconciled fixture |
| Root helper suite | `pnpm test:module-tooling` | Root helpers and skill validators pass |
| Package types | `pnpm --filter @southneuhof/sprindle type-check` | Exit 0 |
| Editor and check helper lint | `node packages/sprindle/node_modules/oxlint/bin/oxlint packages/sprindle/editor/build.mjs packages/sprindle/editor/state.mjs packages/sprindle/editor/install.mjs packages/sprindle/editor/test/install.mjs scripts/check-editor.mjs scripts/check-editor.test.mjs` | Exit 0 |
| API lint | `pnpm --filter @southneuhof/api lint` | Exit 0 |
| Scope | `git diff --check` and `git status --short` | Only listed changes; no whitespace errors |

Every installation proof must use the temporary-directory override. Do not run
`setup:editor` against the user's default installation to verify this plan.
These commands are implementation gates; planning runs none of them.

## Steps

### 1. Specify and test the read-only check through its CLI

Use an owned temporary Carta-shaped workspace and extension root.
Copy actual build, install, and check owners; link the installed dependencies
and native compiler store. Generate a valid receipt through the real editor
producer and installer. Do not construct a receipt that the producer is
meant to generate.

Run the check with `SPRINDLE_VSCODE_EXTENSIONS_DIR` pointing to that
temporary root. Prove an unchanged installation produces no stale notice.
Change a fixture framework input and assert a notice containing
`pnpm setup:editor`. Also cover an old installation without a receipt,
a missing server payload, and a changed payload with an unchanged receipt.

For each invocation, compare the installed directory's file inventory and
content hashes before and after. An absent installation must remain absent.
Use the existing installation test's cleanup pattern.

**Verify:** `node --test scripts/check-editor.test.mjs` passes after
Steps 2–3. The stale-installation case must show the missing behavior before
the normal launcher hook is added.

### 2. Write an editor build receipt at the producer

In `editor/state.mjs`, reuse the package input fingerprint from
Plan 082. Add editor source/configuration and the resolved identities of
dependencies copied into the installation. Exclude tests and generated
directories unless they are actual inputs to this editor producer.

Have `editor/build.mjs` capture inputs before and after the build.
Write `editor/dist/editor-state.json` only when they agree and all
required installed payload is complete. Record a schema version, input
fingerprint, and hashes of the shipped server, extension entry, public types,
route definition, and copied runtime/compiler payload. Exclude the receipt
itself and build/install scripts from payload hashes.

A failed build must leave no receipt that declares partial output current.
The existing installer copies `dist`, so it carries the receipt without
a new installation path. Extend its test to consume that installed receipt.
Do not invoke installation from the receipt helper.

**Verify:** `pnpm --filter @southneuhof/sprindle test:editor-install`
passes using its owned override. The CLI proof distinguishes a valid build
from source drift and incomplete installed payload.

### 3. Compare current inputs with the installed receipt

Implement `scripts/check-editor.mjs` as a read-only command.
Resolve the workspace and installation paths with the existing
`fileURLToPath(import.meta.url)` and installer conventions. Calculate
expected input identity from source, not from a possibly old editor build
directory. Validate the installed receipt and its payload.

Print one concise reminder for an existing stale or unverifiable installation.
An absent installation is silent; the explicit first-time setup remains in
the README. Missing files, denied reads, and invalid receipts must not crash
API development. Print a bounded diagnostic when comparison is not possible.
Never print environment values, dependency contents, or user credentials.

Exit 0 after an advisory result. Do not repair files, create directories, run
a build, or start the editor from this command.

**Verify:** `node --test scripts/check-editor.test.mjs` passes.
The proof observes CLI output and unchanged installation contents, not a
private predicate or expected hash copied into an assertion.

### 4. Run the check from normal development

After successful preparation in Plan 082's launcher, invoke the check before
starting its worker. Repeat after a successful framework replacement when
the expected editor input identity changes. Suppress duplicate reminders for
the same state during one launcher session. A failed check must not stop the
server or cause a restart.

Add the focused proof to backend CI. Add
`packages/sprindle/editor/**` and the shared package-state owner to
module-tooling CI path filters, so its existing root helper command covers
receipt changes. Document detection and the explicit repair command.

**Verify:** `node --test apps/api/scripts/dev-launcher.test.mjs`
passes with a stale, absent, and unreadable
fixture installation. Run the remaining command table, review source scope,
and record the results in this plan and its index row.

## Test plan

The producer/installer proof owns receipt delivery. The CLI proof owns
installed-state detection and the no-write rule. The launcher proof owns
nonblocking integration and duplicate notice control. Use actual producer
outputs and temporary installations; add no source-text assertions or tests
that merely repeat receipt predicates.

## Done criteria

- [x] Normal API development detects a stale or incomplete existing installation.
- [x] Current installations produce no stale notice.
- [x] The check changes no installation contents and creates no absent directory.
- [x] The receipt identifies source and compiler/type payload, not only version `0.0.0`.
- [x] A check failure does not stop development or trigger a server restart.
- [x] Repeated identical state produces at most one reminder per launcher session.
- [x] All command-table gates pass and CI runs the new proof.
- [x] Documentation keeps installation explicit; parent scope and index reviews pass.

## STOP conditions

Stop and report if verification reaches the user's real editor directory;
comparison requires building or installing during normal startup; dependency
payload hashing prevents practical startup; or the plan requires extension
activation changes. Reconcile Plan 082 first. After two failed repairs to one
fault, investigate it separately.

## Execution record

The producer now records an editor receipt only after it builds the package,
copies the shipped compiler/type inputs, verifies required output, and confirms
that the source identity stayed stable. Schema 2 records payload hashes and
file modes, including executable bits. The private state helper is filtered
from the installed extension.
The existing extension ID, install path, and environment override remain the
same.

The CLI checks current source and the installed receipt without writing files.
An absent installation is silent. A stale or unverifiable installation gets
one `pnpm setup:editor` reminder. API development checks after successful
preparation and before it starts or replaces its worker. The check does not
stop startup when it cannot compare state. It suppresses repeated reminders
for the same state and message during one launcher session. The README says
that a matching install does not prove that VS Code has reloaded the extension;
the reminder itself only gives the setup command.

Scope reconciliation was required because the private `editor/state.mjs`
helper must stay out of the installed extension. The authorized change to
`editor/install.mjs` uses that helper to preserve the existing target name,
target path, and `SPRINDLE_VSCODE_EXTENSIONS_DIR` override while excluding
private build/check files. Plan 082's runtime-reload proof also copies the
actual editor input files into its isolated fixture because the launcher now
imports the real checker; the fixture still runs the real producer and keeps
its HTTP, artifact, and lifecycle assertions. The launcher fixture copies the
same actual owners. No fake checker or fallback module path was added.

The PR and push path filters now include the editor files and shared
`package-state.mjs` owner. Backend CI runs the CLI proof, the real installer
proof, and focused Oxlint. Both READMEs keep first-time installation explicit
and document automatic stale detection.

Verification passed:

- `node --test scripts/check-editor.test.mjs` — current, source-stale,
  no-receipt, missing-server, changed-payload, malformed-receipt, denied-read,
  absent-install, lost native compiler execute permissions, and no-write proofs.
- `pnpm --filter @southneuhof/sprindle test:editor-install` — actual producer
  and installer delivered a valid receipt to their temporary override.
- `node --test apps/api/scripts/ensure-tooling.test.mjs apps/api/scripts/dev-launcher.test.mjs`
  — all seven Plan 082 proofs and the stale/absent/unreadable API startup
  proofs passed.
- `pnpm --filter @southneuhof/api test:dev-routes` — both API route proofs
  passed, including the reconciled runtime-reload fixture.
- `pnpm test:module-tooling` — 73 Node tests and both Python validators passed.
- `pnpm --filter @southneuhof/sprindle type-check` and
  `pnpm --filter @southneuhof/api lint` passed.
- Focused Oxlint passed for the editor producer, installer, CLI, and tests.
  The package wrapper rejects file paths containing `..`; the equivalent
  direct repository-root Oxlint command in the command table passed.
- `git diff --check` passed. The API development command still disables
  route declarations; Plan 086 remains excluded.
- A pre-hook launcher proof failed as expected: the API started, but no stale
  reminder appeared before the hook was added.
- With a valid temporary installation of about 43 MB, the checker took
  699 ms and printed no notice. The timing includes process startup and
  receipt, payload, and mode checks.

The external test-audit services and repository test wrapper/check-changed
scripts were unavailable. Native project checks and manual review were used
as the authorized fallback. No check used the default editor directory.
The executable-mode proof runs on non-root POSIX systems. It is skipped on
Windows because Windows does not use POSIX execute bits, and as root because
root can bypass those permission checks. The API runtime-reload fixture now
creates its editor directory before copying files into it.
The parent accepted the changes after the permission and fixture-order revision.
The parent repeated all four read-only editor proofs, all five launcher proofs,
and both API development proofs; all eleven passed. Focused helper lint and
the whitespace check also passed. The index records final acceptance. Windows
runtime behavior and the GitHub workflows remain unverified. Changes are
uncommitted.

## Maintenance notes

The editor producer owns the receipt. The check owns read-only comparison.
The launcher owns when to show it. Update receipt inputs and payload together
when the installer ships a new compiler dependency. A matching installation
does not imply that a running editor has reloaded its extension.

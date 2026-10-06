# Plan 087 implementation evidence

Status: accepted by the parent on 2026-10-05. See Plan 087 for review evidence.

## Source graph

The generator now discovers route and scope inputs, reachable dependencies, and
ambient type contributors before it stages source. It identifies route-tree
modules that use Sprindle helpers, then follows their importers back to route
entries. It computes this full projection set before it rewrites any specifier.
The source editor uses AST nodes for imports, exports, dynamic imports, and
literal `require` calls. It leaves unrelated ordinary modules at their authored
paths. Projected imports are rebased to the authored target selected by the API
config. A selected named suffix remains in that path. The generated source has
no ordinary-module alias tree or copy, so nested relative imports, external
type updates, ambient augmentations, and nominal type identity stay attached to
authored modules.

The graph treats JSON as data. It records JSON, dynamic imports, and `require`
calls as runtime inputs. It keeps dynamic and type-only edges out of static cycle
checks. The bundle analysis checks each local runtime input against the authored
graph. It accepts both the authored path and the real path of a symlinked file.

The generator reads `files`, `include`, and `exclude` from the local TypeScript
config chain. It adds path reference directives for project ambient files to
the generated source. Those references keep script declarations, script
globals, module globals, and module augmentations in the consumer type graph.
They do not import or run those files. No explanatory comments were added.

The generated manifest uses mutable tuples for parameter and method values and
literal path and method types. Its value satisfies the public
`FileRouteManifest` accepted by `installSprindle`. Consumers need no cast.

The generation lock now claims the stale lock directory before it removes it.
The claim is inside the lock and keyed by the stale owner token. A contender
checks that the owner is unchanged before removal. The generator also removes a
new lock directory when writing `owner.json` fails. The lock tests use two
separate processes at a start barrier and exercise the public generator call.
The owner-write test injects a filesystem error and proves that a later build
can acquire the lock.

The installed-package declaration test now imports an explicit copy of the old
declaration artifact after deleting route source. This keeps the temporary
declaration-emitter proof away from canonical `.sprindle/routes.ts` resolution.

## Regression evidence

The parent review reproduced the pre-repair failures against temporary
projects. The original producer accepted JSON imports and dynamic imports with
declarations disabled. The 087 candidate before this repair failed on JSON
with a Babel parse error and failed on a literal dynamic import because esbuild
could not resolve its staged path. A separate TypeScript 6 consumer also failed
with TS2322 when a route re-exported a scoped helper, and with TS2304 when its
ambient declarations came only from the API project.

The repaired source proof uses TypeScript 6 from `apps/web`. Its consumer
project has `files: ["consumer.ts"]` and an empty `include`, so it does not load
the API source roots. It imports the generated contract and manifest, checks
inherited custom output and scoped CRUD input from helper/re-export files, and
passes the manifest to `installSprindle`. The four ambient forms resolve there.
Runtime tests prove that ambient files with throw statements do not execute.
The same proof checks live external type-only inference, exact paths and
methods, invalid values, and ordinary module identity.

The API fixture uses `moduleSuffixes: [".server", ""]` with
`lib/choice.server.ts` exporting `"server"` and `lib/choice.web.ts` exporting
`"web"`. The external consumer config does not extend the API config. It uses
TypeScript 6, `strict`, `noEmit`, `skipLibCheck`, ESNext, Bundler resolution,
and `moduleSuffixes: [".web", ""]`. The generated import retains the selected
`.server` name, and the consumer sees `"server"`.

The separate frontend consumer also resolves a live ordinary module with
nested relative type and runtime imports. Its nominal class type matches a
direct import of the authored class, and the relative module augmentation still
applies. The Hono runtime response covers the nested runtime import.

An unsuffixed API fallback has a documented boundary. If the API config selects
`choice.ts` while the frontend config has `choice.web.ts`, the generated source
specifier cannot encode the API config's choice. TS6 also applies
`moduleSuffixes` to an explicit `.ts` specifier. The frontend can therefore
select `choice.web.ts`; this is inconsistent consumer resolution and is not a
supported parity case. Source inference does not copy or alias ordinary files
to hide that difference. The current API has no `.server.ts` or `.web.ts`
files.

The manifest runtime test uses real Hono requests. It covers JSON, dynamic
import, and `require` in bundled mode, runs the same inputs in source mode,
checks watcher ownership for all three, observes a live response after edits,
preserves the last response after an invalid edit, and recovers after the edit
is fixed.

## Verification

- `pnpm --filter @southneuhof/sprindle type-check` — exit 0.
- `pnpm --filter @southneuhof/sprindle exec vitest run src/tooling/source.spec.ts src/tooling/language.spec.ts` — exit 0; 2 files, 12 tests.
- `pnpm --filter @southneuhof/sprindle test:tooling` — exit 0; 6 files, 66 tests.
- `pnpm --filter @southneuhof/sprindle lint` — exit 0.
- `pnpm --filter @southneuhof/api type-check` — exit 0; route build, route check, and TypeScript check passed.
- `git diff --check` — exit 0.

The installed-package tests run the installed commands with normal Node. The
API type check uses the current application callers. No database-dependent API
suite ran.

## Baseline

The raw pre-edit reports remain in `baseline.initial.json` and `baseline.json`.
They record the host and compiler versions, exact commands, raw samples,
completion timings, cold HTTP readiness, process memory, and frontend timings.
The baseline tooling run passed 58 tests and failed one installed-package
fixture check. The fixture lacked the optional platform compiler package. The
fixture now links that existing package. The final tooling run passes all 66
tests, including the JSON/template-import recovery case and the CommonJS cycle
HTTP and watcher-ownership case.

The full frontend baseline took 7.16 seconds and used 817 MB maximum resident
memory. The three Vue checks had a 6.78 second median. No frontend performance
claim is made for this plan's implementation.

## Migration notes

Plans 088 and 089 still own the caller switch and removal of the declaration
emitter. This work does not change application callers, SDK exports, language,
dependencies, editor installation, or database code. The plan remains
IMPLEMENTED until parent acceptance. The plan index remains parent-owned.

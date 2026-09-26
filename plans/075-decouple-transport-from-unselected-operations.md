# Plan 075: Remove list-query requirements from non-list transport

## Status and intent

- Status: TODO. Priority: P2. Effort: M. Risk: MED. Confidence: HIGH.
- Category: type/runtime contract / separation of concerns. Depends on root Plan 073; do not repair or retain the retired module generator. Depends also on 064's bounded compiler runner for permanent negative cases.
- Planned at: `1246387`, 2026-09-26.

An application can select create, update, detail, list, and delete independently. A create-only or update-only endpoint must not require a list schema or a fake endpoint. Keep Hono wire validation at the transport owner without making it an obligation for operations that never use it.

## Current evidence

`apps/web/src/framework/hono/actions.ts:38` always requires `{ querySchema }`. `hono/contracts.ts:79` checks it against `ListEndpoint<TRoute>`. An in-memory compiler probe with a create-only Hono route produced `never`; adding a matching list endpoint made the paired control pass. The runtime shape check requires five endpoint methods, while the public return type already conditionally exposes available operations.

Hono clients use dynamic proxies. Runtime property probing does not prove that an endpoint exists on the server. Do not claim that the five-method test verifies server capabilities, or replace it with another proxy introspection mechanism. Existing `hono/actions.spec.ts` includes a deliberately rejected partial plain route; revise that expectation to the selected contract rather than preserve it blindly.

## Scope and target contract

Change `apps/web/src/framework/hono/{actions,contracts}.ts`, `actions.spec.ts`, existing Hono public type fixtures under `apps/web/src/framework/__type-tests__/`, and relevant Hono/query guidance. Extend `packages/loom/scripts/check-contract-diagnostics.mjs` with the explicit app-owner mode described in 064, add its transport cases, and add that command to the existing web-validation workflow. Keep app compiler configuration and temporary fixtures app-local. Update the existing workflow test for that one command; do not make Loom's default check depend on the app. No generator files, backend endpoint additions, response envelope changes, identity encoding redesign, or module-local wrappers.

1. Keep one `createHonoResourceActions` entry point. When the typed route has list, require and infer its raw query schema exactly as today. Without list, permit omission of options and forbid a meaningless query schema. Detail/create/update/delete types must not depend on a list output generic.
2. Keep the return type limited to actual typed endpoint operations. Preserve input, output, identity, signal, and query inference. A create-only adapter has no callable public list member; update-only plus a technical detail read does not create a visible detail page.
3. Remove the all-five-endpoints prerequisite. Validate obvious invalid inputs and check the requested transport operation at invocation where useful. Do not inspect a Hono proxy to discover all server routes. A malformed endpoint invocation must name the failing operation; a missing list schema on an untyped list call must fail before transport.
4. List calls still parse asynchronously exactly once, map frontend sort names once, retain endpoint-specific query restrictions, forward cancellation, and normalize responses as before. Do not add a broad optional-query-schema path that weakens real list typing.
5. Keep construction free of requests. Do not make operation selection require a second runtime manifest or let inferred missing operations become public `any` methods.

## Execution rules

This is an approved plan, not completed implementation. Read root AGENTS, the current resource architecture, and `test-audit` before source/test edits. Use the applicable web skill for app changes. Read this entire plan. Preserve existing local work; record `git status --short` before editing. Add no implementation comments, compatibility aliases, broad type suppressions, unrelated formatting, installs, commits, pushes, migrations, or seeds.

Run the drift command first. Compare changed owners with the excerpts below and reconcile approved predecessor changes. Stop on incompatible drift, an out-of-scope requirement, or two failed bounded correction attempts. Do not weaken a contract to make a check pass. Record command, exit status, and actual selected tests in this plan; update the index after review. The local test skill references unavailable OpenClaw tools: report those as unavailable rather than successful checks. App type checks can generate route artifacts; preserve unrelated work.

## Commands and steps

| Gate | Command | Expected |
|---|---|---|
| Drift | `git diff --stat 1246387..HEAD -- apps/web/src/framework/hono apps/web/src/framework/__type-tests__` | Compare live owners |
| Transport | `pnpm --filter @southneuhof/framework-web test:focused -- framework/hono/actions.spec.ts` | All pass |
| App | `pnpm --filter @southneuhof/framework-web type-check` | Exit 0 |
| Diagnostics | `node packages/loom/scripts/check-contract-diagnostics.mjs --project app` | Exit 0; valid controls compile and intended negatives fail |
| CI contract | `node --test scripts/web-validation-workflow.test.mjs` | Exit 0 |
| Architecture | `pnpm test:surface-architecture` | Exit 0 |

1. Confirm 073 removal is complete. Run Drift, Transport, and App. Enumerate existing factory callers and keep their current list schema inference. Read the current Hono type helpers before changing overloads or conditional arguments.
2. Separate list configuration from other operation inference in the existing factory. Remove the all-operation runtime guard. Run App and Transport; all existing full-resource calls remain valid without new annotations.
3. Extend transport tests using real local Hono apps and `hc`, with local fetch dispatch only. Cover list-only, create-only, update plus detail read, and the existing full resource. Assert the intended request, parsed result, and no construction-time request. Do not mock all five operations for a partial case.
4. Add public type cases accepting create-only without options, requiring schema for list, rejecting wrong query keys, preserving mutation input/result, and rejecting access to an absent operation. Pair every negative compiler case with a valid control. Run App, Transport, and Diagnostics. Record compiler evidence; do not add suppression comments or widen return types.
5. Update the query guidance to distinguish list and non-list configuration. Run all gates and `git diff --check`. Record results and update the index after review.

## Done and stops

- [ ] Partial-operation adapters compile and execute through real local Hono clients.
- [ ] No list configuration is required without list; list validation is unchanged.
- [ ] No fake endpoint, cast at application call sites, runtime capability manifest, or extra wrapper was added.
- [ ] All checks pass; generator removal remains complete.

Stop if the type solution requires sacrificing endpoint inference, or if the current endpoint layout differs from this plan. Keep a minimal compiler fixture and report the unsupported shape instead of adding automatic protocol detection.

## Evidence

Planning only. The create-only `never` failure and list-bearing valid control were reproduced without writing files. Proposed runtime and public-contract tests have not run.

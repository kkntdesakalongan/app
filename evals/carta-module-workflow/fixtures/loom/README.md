# Loom repair fixtures

This folder holds the five Plan 066 cases. The public inputs are under `cases/`.
The reference implementations, seeded defects, tests, and test helper are private
evaluator files. Do not copy `reference/`, `seeded-fail/`, or `evaluator-only/`
into a worker workspace. Remove `evals/` and `plans/` from each worker checkout.

Prepare one new isolated checkout for every worker run. Run from the repository
root:

```sh
node evals/carta-module-workflow/fixtures/loom/prepare-workspace.mjs /path/to/checkout loom-dependent-selection worker
```

Use the case id from `cases.json`. The script copies only that case's starter,
service fixture, and required route files. The worker can read normal source and
the named fixture files. Give it the case request and the input files from the
case record. Do not put the rubric or evaluator test in that checkout.

After a worker run, keep its workspace immutable and make a separate evaluator
copy. Install the grader there:

```sh
node evals/carta-module-workflow/fixtures/loom/prepare-workspace.mjs /path/to/evaluator-copy loom-dependent-selection grade
pnpm --filter @southneuhof/framework-web type-check
pnpm --filter @southneuhof/framework-web test:focused -- framework/__tests__/loom-agent-eval.spec.ts
```

The `grade` mode copies one private case test and its shared helper. It does not
replace worker files. Type-check the same workspace before running the focused
acceptance test. Record each command result and the hashes of the worker files.
Run source review for requirements that cannot be established by execution.

To check the evaluator against a reference or a seeded defect, start from a new
isolated checkout and use `reference` or `seeded-fail` instead of `worker`:

```sh
node evals/carta-module-workflow/fixtures/loom/prepare-workspace.mjs /path/to/checkout loom-dependent-selection reference
node evals/carta-module-workflow/fixtures/loom/prepare-workspace.mjs /path/to/checkout loom-dependent-selection grade
```

The script supports `loom-dependent-selection`, `loom-transformed-update`,
`loom-row-command`, `loom-create-only`, and
`loom-relation-source-freshness`. It clears prior Plan 066 fixture and grader
files before it prepares a worker, reference, or seeded-fail case.

## Acceptance test value

The tests exercise real Loom forms, resource binding, option loading, and table
refresh. Each case protects a separate observable contract. A plausible fault
in the prepared module makes the corresponding assertion fail. Existing package
tests do not check these task-specific fixtures, data, or submitted values. The
tests use the public component and resource boundaries. They add no product
test seam.

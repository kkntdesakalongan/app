# Module execution worksheet

Read only for full-process planning, execution, or review. Standard work stays
in its design record. The full process has `design.md`, numbered plans,
`worksheet.md`, and `reports/`; acceptance IDs connect them.

## Ownership and evidence

After design approval, initialize from the [template](../assets/worksheet-template.md):

```sh
python3 .agents/skills/carta-module-development/scripts/init_worksheet.py <feature>
```

| Record | Owns |
|---|---|
| Design | Behavior, approval, rule IDs, acceptance cases, obligation inventory |
| Plan | Technical steps, dependencies, and owned IDs under `- Acceptance:` |
| Worksheet | Plan status, required evidence surfaces, exact tests and report links |
| Reports | Commands, observed results, input fingerprints, and review verdicts |

Assign each acceptance ID to one primary plan. Required evidence lists its
`API` and/or `UNIT` surfaces. Each Acceptance row names one surface and test;
the tuple of acceptance ID, surface, and test must be unique. Repeat an ID only
for another required test or surface within its primary plan.

Use `PENDING` for an unselected test only while the result is `PENDING` or
`BLOCKED` and the plan is `TODO`, `IN_PROGRESS`, or `BLOCKED`. Otherwise use
`file::exact test title`. Evidence and Review paths are relative to the feature
folder. Executable evidence is recorder JSON; source review belongs in the
review report. Apply the [evidence rules](verification-strategy.md#evidence-interface).

Run before execution, after mapping changes, and at final review:

```sh
python3 .agents/skills/carta-module-development/scripts/check_worksheet.py plans/<feature>
```

The checker validates coverage links, ownership, dependencies, states, and
recorded command success. Run recorder freshness checks separately. Reviewers
must still check assertions, omitted obligations, and report truth.

## State and completion

Feature: `INTAKE` → `DESIGN` → `PLAN` → `READY` → `EXECUTE` → `VERIFY` → `DONE`.
`BLOCKED` names the affected stage and missing prerequisite.

| Plan state | Meaning |
|---|---|
| `TODO` | Planned, not started |
| `IN_PROGRESS` | Work or required checks remain |
| `IMPLEMENTED` | Work and checks complete; review remains |
| `VERIFIED` | Owned acceptance passed and review recorded |
| `BLOCKED` | A named prerequisite prevents progress |
| `SUPERSEDED` | Replaced plan; acceptance reassigned |

A dependent plan can start after its predecessor is `IMPLEMENTED` or `VERIFIED`.
If it needs only an early interface, keep the related assignments in one plan
until the complete result is implemented. Do not mark partial work implemented
just to unlock a dependency.

Acceptance states are `PENDING`, `PASS`, `FAIL`, and `BLOCKED`. The executor
supplies evidence; the reviewer determines acceptance. Label direct execution
and self-review when applicable.

`DONE` requires all selected plans verified, all required acceptance passed,
current evidence, and review of cross-plan effects. Link the final report in
`Latest review` and apply the [delivery verdict](verification-strategy.md#verdicts).

## Handoff and resume

Pass the approved revision, active plan, affected IDs, relevant diff, evidence,
write boundaries, and next action. Reopen only rows and plans affected by changed
rules or inputs, then check dependent work. Retain failures and replaced reports.

For old browser mappings, preserve their history outside the active module
worksheet and retain their business requirements with applicable API/UNIT proof.
The checker rejects active browser mappings and BROWSER/VISUAL evidence. Empty
historical journey tables need no conversion. Follow the
[browser boundary](verification-strategy.md#browser-journeys).

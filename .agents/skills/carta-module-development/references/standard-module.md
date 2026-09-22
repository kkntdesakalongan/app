# Standard module base

Build requested CRUD with standard resources, forms and Views. Add custom
workflows to that base where needed. Most modules can share this approach;
use a different structure when the requested task does not fit CRUD.

## Select the process

Use one [design record](../../carta-module-design/references/module-contract.md)
from the start of discovery. Record decisions, sources, conflicts and unknowns
there. Establish the in-scope actions, results and dependencies before selecting
the execution path. Use the standard path for CRUD and custom operations whose
rules and results can be specified and checked locally. A relation, custom
control or shared access predicate alone does not require the full process.

Use numbered plans and a worksheet for the affected scope when correctness
depends on a sequence of domain operations, coupled rules across operations, or
derived results that several consumers must keep consistent after writes. Also
use it for required traceability. Approval states are one source of complexity;
their absence does not establish that a flow is simple.

Record the selected execution path, scope and reason in the design when the
required flow is known. Keep independent CRUD on the standard path. Reassess
the path when new dependencies appear; preserve settled decisions and valid
evidence. Both paths use the same design and quality requirements.

## One work record

Use `plans/<feature>/design.md` for the draft and approved design. Follow the
same module contract on both execution paths. Add detailed rules for behavior
that needs them; summarize standard CRUD by resource and reference its existing
pattern.

Describe custom behavior sufficiently to implement and test it. Reference the
existing pattern for standard CRUD; ordinary fields need no separate acceptance
row. Separate user decisions from inferred defaults, and expected results from
observed evidence. Design is ready when material behavior is settled and each
custom outcome has a suitable check; name any blocked part explicitly.

## Design approval gate

Every module path uses this gate, including standard and full-contract work.
When the design is ready, present the design path and exact revision, ask
the user whether they approve that design, and stop. Continue to planning or
implementation only after the user explicitly approves the presented revision.
A request to build, plan, continue, infer defaults or invoke
a Carta skill is not design approval. Silence is not approval.

Record the approving reply, revision and scope in the design. Approval of that
exact unchanged revision survives resume. A material behavior revision returns
to this gate; technical detail added within the approved behavior does not.

On the standard path, keep the work plan and evidence in the design; create no
numbered plans or worksheet. Update at a usable result, decision, material
failure or handoff, not after each command.

## Resolve behavior

Read the original request and later answers before the current implementation.
Separate requirements from inferred defaults. A request to infer sensible defaults
permits routine choices, not contradictions of explicit access or business rules.
Record consequential assumptions as assumptions, not confirmations. Ask only
where the answer changes a material outcome or write authority.

Specify each visible field's label and displayed value; for relations also specify
stored identity, selectable label and loaded edit value. Use the
[display and form pattern](../../web-ui-surfaces/references/fields.md).
Reference unchanged field rules instead of copying them. An ordinary sort or
label choice needs no separate acceptance case unless the user requires it.

For design-only work, complete the design approval gate and stop. After approval,
planning adds exact owners, work order, commands and the first usable result to
the same record. A plan-only request stops there. Otherwise continue under
[execution](execution.md).

## Build the usable result

Before implementation, identify workflow rules that restrict standard actions,
such as edits after submission or deletion after approval. Apply those rules
in the first implementation; a preview must not expose prohibited operations.

For custom actions, read the [workflow reference](../../carta-module-design/references/custom-workflows.md).
Add only the required states, conditions, effects and checks to the same record.
Use YAML for custom workflows, not CRUD. Select control placement from
[DESIGN.md](../../../../DESIGN.md#actions-and-forms). Adding a workflow does not
require new document types or a restart.

Apply the process selection above to combined behavior. Reference the existing
base for unaffected work instead of repeating it in the design.

Use the standard API/resource/View path. Keep standard actions in their normal
locations and add custom controls only for a named user need. A related feature
can use one executor and one work record; layers are not separate deliverables.

For an uncertain external integration, establish the first working path under
[execution](execution.md#prepare-and-build) before completing dependent surfaces.
The first UI checkpoint is a working page with its required schema, permissions,
navigation and development setup, not an API skeleton. Establish a complete
relation path before copying it to another resource. Report the URL and remaining
work as soon as the preview is ready. Make setup blockers visible early.
Continue through all requested workflows before reporting module completion.

## Verify and hand off

Apply the [verification strategy](verification-strategy.md). Review list/detail/edit
source for readable values for every visible field per [DESIGN.md](../../../../DESIGN.md#controls-and-values).
Use focused non-browser
checks for access, persisted values and business rules. Do not create or run E2E
or require a manual journey. Report actual UI behavior as unverified.

Use `$verify-carta-module` for review against the original request and decisions.
Keep check output and report failures honestly; documentation shape is not an
acceptance criterion. Record these separate results:

- **Source ready:** implementation and migration files exist.
- **Preview ready:** the authorized development target has its required schema,
  seed and working page; include the URL or exact blocker.
- **Verified:** required behavior has sufficient current checks and review.

Do not claim completion while a requested result or necessary preview setup is
unfinished. Optional suggestions can remain follow-up work. In-scope repairs
continue under the existing authority.

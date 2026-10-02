# UI verification

Use the shared [verification strategy](../../carta-module-development/references/verification-strategy.md).
Module delivery excludes E2E generation, execution, repair and manual journeys.
Run the web type check and lint plus relevant focused non-browser checks. Fix
component resolution and casing errors with public imports or runtime
registration.

For changed API schema imports, use normal web dev/build and the graph proof in
the [API schema boundary](../../../../docs/architecture/web-application-architecture.md#api-schema-boundary).
That proof checks dependency portability. It does not establish API
authorization or rendered behavior.

Normal and focused ESLint show warnings for native controls and standard
replacement slots. Treat each warning as a review signal against
[DESIGN.md](../../../../DESIGN.md#controls-and-values). A warning does not prove
a defect or approve an exception.

Review source for readable values for every visible field, edit loading,
field dependencies, filter wiring, access declarations and standard actions.
Trace changed API values into the actual field configuration. Do not create
tests that copy configuration or repeat standard framework control behavior.
Use API tests for access enforcement, domain rules and stored effects.

For custom integration, trace the complete boundary: query to collection result,
field definition to control and submitted value, and write completion to dialog
state, feedback and affected data refresh. Check the application composition,
even when each framework component is already tested. Use the focused proof
rules in the shared verification strategy. Each lint and type check proves
only its declared checks.

Review custom composition against the
[framework-first rule](../SKILL.md#framework-first-composition).
Each custom block must meet a requirement not met by the standard components.
Compare the complete page with [DESIGN.md](../../../../DESIGN.md). Check the
applicable page structure, actions, controls, displayed values, text, and access
rules. In the existing review, cite the design sections checked and report
required exceptions with their authority. Record a defect when the source breaks
them, even if a standard View is also present.
For routing, use [file routing](file-routing.md#verify-changed-behavior).

Report which checks ran and state that actual rendered behavior was not verified.
This limit does not require browser testing or block module completion.

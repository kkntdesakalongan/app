# Carta Quality Requirements

**Requirements set:** `CARTA-QR-1`  
**Derived from:** [`quality-profile.md`](./quality-profile.md)  

## 1. Requirement grammar

Each requirement uses **SHALL** for a GATE and **SHOULD** for an ADVISORY.

A requirement states **what Carta must guarantee**. The measurement method and threshold are defined separately in [`quality-measures.md`](./quality-measures.md), and the audit procedure is in [`audit-worksheet.md`](./audit-worksheet.md).

---

## 2. Functional Suitability — ISO/IEC 25010:2023 3.1

### Functional completeness — 3.1.1

- **CAR-FS-CMP-01 — Standard-path completeness [GATE, Both, FRAMEWORK]**  
  Carta SHALL provide a complete public path for every standard framework capability it claims to support; a documented standard task must not require undocumented internal imports or mandatory consumer-side duplication of framework internals.

- **CAR-FS-CMP-02 — Scope/documentation completeness [GATE, Both, FRAMEWORK]**  
  Public documentation SHALL state what the framework owns, what the application owns, and the supported extension path for deliberately app-level concerns.

For Sprindle route authoring, verify the
[file-routing contract](../../api-conventions/references/file-routing.md) with
add, move, and delete cases through normal editor, dev, check, and build flows.
Require automatic context inference, no manual route artifacts, matching runtime
and SDK contracts, and a production build that runs without route source files.

### Functional correctness — 3.1.2

- **CAR-FS-COR-01 — Canonical Sprindle contract correctness [GATE, Sprindle, FRAMEWORK]**  
  Canonical routes SHALL preserve their documented HTTP methods, paths, parsing, status codes, success envelopes, error envelopes, not-found behavior, pipeline order, and server-owned state semantics.

- **CAR-FS-COR-02 — Schema/runtime/type agreement [GATE, Both, FRAMEWORK]**  
  Public TypeScript types, runtime validation, documented schemas, and actual runtime values SHALL describe the same supported contract; a type-safe public call must not routinely produce a different runtime shape without explicit documented narrowing/failure behavior.

- **CAR-FS-COR-03 — Source contract correctness [GATE, Sprindle, FRAMEWORK/SHARED]**  
  Framework-supplied `ModelSource` implementations SHALL obey the declared source contract. Custom source implementations SHALL have an explicit conformance contract and testable obligations.

- **CAR-FS-COR-04 — Loom standard-surface correctness [GATE, Loom, FRAMEWORK]**  
  Resource actions, display definitions, form value lifecycle, validation order, loading/error/empty states, access presentation, query/cache identity, and standard View prop bags and command execution SHALL behave as documented.

### Functional appropriateness — 3.1.3

- **CAR-FS-APP-01 — Thin abstraction [GATE, Both, FRAMEWORK]**  
  Carta SHALL not force consumers through redundant parallel abstractions for the same standard responsibility when one canonical path is sufficient.

- **CAR-FS-APP-02 — Explicit escape hatches [GATE, Both, FRAMEWORK/SHARED]**  
  Where Carta permits ordinary Hono handlers/middleware, custom persistence, custom Loom screens, adapters, renderers, or application services, the escape hatch SHALL be explicit and SHALL document which Carta guarantees continue to apply and which become consumer-owned.

---

## 3. Performance Efficiency — 3.2

### Time behaviour — 3.2.1

- **CAR-PE-TIM-01 — Sprindle request overhead budget [GATE, Sprindle, FRAMEWORK]**  
  Framework-controlled overhead on representative canonical requests SHALL remain within the ratified performance budget.

- **CAR-PE-TIM-02 — Query amplification control [GATE, Sprindle, FRAMEWORK]**  
  Framework-supplied canonical read/write behavior SHALL not introduce undocumented N+1 query patterns or per-record remote/database I/O; promised batching/query-count behavior SHALL be regression-tested.

- **CAR-PE-TIM-03 — Loom interaction/render budget [GATE, Loom, FRAMEWORK]**  
  Representative standard tables, collections, forms, dialogs, and input interactions SHALL remain within the ratified browser-performance budget.

### Resource utilization — 3.2.2

- **CAR-PE-RES-01 — Type-check peak-memory budget [GATE, Both, FRAMEWORK]**  
  Representative Carta consumer fixtures SHALL type-check within a ratified peak-memory budget. Framework type design that causes pathological compiler memory growth is a product-quality defect.

- **CAR-PE-RES-02 — Developer-tooling time budget [GATE, Both, FRAMEWORK]**  
  Representative framework/consumer type-check and build operations SHALL remain within ratified elapsed-time budgets.

- **CAR-PE-RES-03 — Runtime/browser resource stability [GATE, Both, FRAMEWORK]**  
  Repeated representative operations SHALL not show unbounded framework-controlled heap, listener, cache, or reactive-subscription growth.

### Capacity — 3.2.3

- **CAR-PE-CAP-01 — Declared capacity fixtures [GATE, Both, FRAMEWORK]**  
  Carta SHALL maintain representative large-resource fixtures and SHALL meet the recorded capacity acceptance criteria for canonical resource/list/form usage.

---

## 4. Compatibility — 3.3

### Co-existence — 3.3.1

- **CAR-CO-COE-01 — CSS/DOM/global coexistence [GATE, Loom, FRAMEWORK]**  
  Loom SHALL avoid uncontrolled global CSS, DOM, global-event, singleton, or browser-storage behavior that unexpectedly alters unrelated consumer UI. Required globals SHALL be documented and namespaced or intentionally scoped.

- **CAR-CO-COE-02 — Dependency coexistence [GATE, Both, FRAMEWORK]**  
  Runtime/peer dependencies SHALL be declared so that a supported consumer does not require accidental duplicate framework runtimes or incompatible peer versions to operate.

### Interoperability — 3.3.2

- **CAR-CO-INT-01 — Supported compatibility matrix [GATE, Both, FRAMEWORK]**  
  Carta SHALL publish and test the supported Node.js, TypeScript, Vue, Vue Router, Hono, Drizzle, Zod, and other contract-critical version ranges relevant to each package.

- **CAR-CO-INT-02 — Adapter/extension interoperability [GATE, Both, FRAMEWORK/SHARED]**  
  Public adapters, sources, renderers, schema bridges, and plugin extension contracts SHALL be testable independently of project-specific implementations and SHALL fail clearly when a required contract is absent.

- **CAR-CO-INT-03 — Wire/OpenAPI/client consistency [GATE, Sprindle, FRAMEWORK]**  
  Where Sprindle exposes OpenAPI or typed-client-facing route schemas, generated/described contracts SHALL remain consistent with runtime parsing and response behavior.

---

## 5. Interaction Capability — 3.4

### Appropriateness recognizability — 3.4.1

- **CAR-IC-REC-01 — Capability discoverability [ADVISORY, Both/docs, FRAMEWORK]**  
  Carta SHOULD make its standard capabilities, intended use, and non-goals recognizable from package READMEs and reference documentation without reading implementation source first.

### Learnability — 3.4.2

- **CAR-IC-LEA-01 — Public learning path [GATE, Both/docs, FRAMEWORK]**  
  A new consumer SHALL be able to implement representative standard Sprindle and Loom tasks using public entry points and maintained documentation, without copying hidden application internals.

### Operability — 3.4.3

- **CAR-IC-OPE-01 — Keyboard and focus operability [GATE, Loom, FRAMEWORK]**  
  Loom-owned interactive components SHALL preserve appropriate keyboard operation, focusability, focus movement/return, disabled state, and escape/dismiss behavior for the interaction they expose.

- **CAR-IC-OPE-02 — Standard state operability [GATE, Loom, FRAMEWORK]**  
  Standard data surfaces SHALL provide deterministic loading, ready, empty, error, disabled/submitting, and refresh/retry behavior where applicable, without requiring each application to reconstruct core state handling.

### User error protection — 3.4.4

- **CAR-IC-ERR-01 — Input and destructive-action protection [GATE, Loom + Sprindle, FRAMEWORK/SHARED]**  
  Framework validation and standard destructive/action patterns SHALL prevent or clearly reject invalid operations to the extent Carta owns the interaction; server validation remains authoritative.

### User engagement — 3.4.5

- **CAR-IC-ENG-01 — Consistent framework interaction language [ADVISORY, Loom, FRAMEWORK]**  
  Loom SHOULD maintain consistent component states, interaction patterns, and visual hierarchy. Pure aesthetic preference alone SHALL NOT be used as an audit failure.

### Inclusivity — 3.4.6

- **CAR-IC-INC-01 — Accessible framework primitives [GATE, Loom, FRAMEWORK]**  
  Loom-owned components and wrappers SHALL satisfy the applicable WCAG 2.2 Level A/AA requirements selected in the Loom accessibility profile, including preservation of accessibility behavior supplied by Reka UI or other primitives.

- **CAR-IC-INC-02 — Replaceable framework copy [GATE, Loom, FRAMEWORK]**  
  Framework-owned user-visible strings and accessible labels SHALL be centralized or overrideable so a consuming application can localize them without patching Loom source.

### User assistance — 3.4.7

- **CAR-IC-AST-01 — Associated labels, errors, and instructions [GATE, Loom, FRAMEWORK]**  
  When Loom renders labels, validation messages, instructions, tooltips, or assistance for a control, the relationship SHALL be perceivable visually and exposed programmatically where applicable.

### Self-descriptiveness — 3.4.8

- **CAR-IC-SELF-01 — Self-describing UI and developer failures [GATE, Both, FRAMEWORK]**  
  Framework states, validation errors, boot-time configuration failures, and development warnings SHALL identify the failed contract and provide enough context to locate or correct the misuse without exposing sensitive internals to end users.

---

## 6. Reliability — 3.5

### Faultlessness — 3.5.1

- **CAR-RE-FLT-01 — Deterministic public behavior [GATE, Both, FRAMEWORK]**  
  Public framework behavior SHALL be deterministic for equivalent supported inputs/state, except where nondeterminism is an explicit part of the contract.

- **CAR-RE-FLT-02 — Implementation parity [GATE, Sprindle, FRAMEWORK]**  
  Framework-provided alternate implementations of a public contract (for example testing memory source vs production source where relevant) SHALL satisfy the same externally observable contract unless a difference is explicitly documented.

### Availability — 3.5.2

- **OUT — no baseline Carta requirement.** Deployment/service uptime is consumer/operations owned.

### Fault tolerance — 3.5.3

- **CAR-RE-FT-01 — Controlled invalid-input/dependency failure [GATE, Both, FRAMEWORK]**  
  Malformed input, validation failure, expected not-found/conflict cases, and recoverable load/dependency errors SHALL resolve to documented failure states rather than undefined behavior or corrupted framework state.

- **CAR-RE-FT-02 — Extension failure containment [GATE, Both, FRAMEWORK/SHARED]**  
  Exceptions from hooks, enrichers, adapters, sources, validators, renderers, or custom actions SHALL propagate through documented boundaries, with framework cleanup/state consistency preserved to the extent Carta controls it.

### Recoverability — 3.5.4

- **CAR-RE-REC-01 — Atomic framework writes [GATE, Sprindle, FRAMEWORK/SHARED]**  
  Framework-supplied multi-step writes SHALL be atomic when the underlying supported database/transaction facility permits it, and documentation SHALL state where custom persistence transfers atomicity responsibility to the consumer.

- **CAR-RE-REC-02 — Recoverable Loom states [GATE, Loom, FRAMEWORK]**  
  Standard Loom load/mutation failures SHALL leave the component/query/form in a state from which the owning route/user can safely retry, refresh, correct input, or dismiss without full-page corruption.

---

## 7. Security — 3.6

### Confidentiality — 3.6.1

- **CAR-SE-CONF-01 — Safe external error contract [GATE, Sprindle, FRAMEWORK]**  
  Unexpected server exceptions SHALL not expose stack traces, SQL, secrets, or internal implementation details through the default Sprindle HTTP error response.

- **CAR-SE-CONF-02 — Safe framework logging [GATE, Both, FRAMEWORK/SHARED]**  
  Default framework logging and diagnostics SHALL not log credentials, authorization headers, secrets, full sensitive request bodies, or consumer data values unless an application deliberately supplies a policy-aware logger/diagnostic path.

- **CAR-SE-CONF-03 — Server-owned scope non-bypass [GATE, Sprindle, FRAMEWORK]**  
  Client query/body input SHALL not be able to unset, widen, or override server-owned read/write scope or server-owned write values on canonical paths.

### Integrity — 3.6.2

- **CAR-SE-INT-01 — Server precedence and transactional integrity [GATE, Sprindle, FRAMEWORK]**  
  Server-owned values/scopes SHALL have the documented precedence and framework-supplied compound writes SHALL preserve declared transaction semantics.

- **CAR-SE-INT-02 — Boundary validation integrity [GATE, Both, FRAMEWORK]**  
  Framework-owned parsing/validation boundaries SHALL reject invalid shapes according to the declared schema and SHALL not silently reinterpret values into a materially different contract unless the transformation is explicit.

### Non-repudiation — 3.6.3

- **OUT — no baseline Carta requirement.** Reassess if Carta owns legally/audit-significant evidence or signature facilities.

### Accountability — 3.6.4

- **CAR-SE-ACC-01 — Request/identity traceability seam [GATE, Sprindle, FRAMEWORK/SHARED]**  
  Sprindle SHALL provide stable request correlation and a logging/identity seam sufficient for consuming applications to attach accountable audit information without modifying framework internals.

### Authenticity — 3.6.5

- **CAR-SE-AUT-01 — Authentication seam correctness [GATE, Sprindle, SHARED]**  
  `authenticated()` and identity-dependent framework behavior SHALL derive identity only from the configured resolver/context and SHALL fail predictably when authenticated identity is absent. Carta SHALL NOT treat client-supplied identity fields as authenticated identity.

### Resistance — 3.6.6

- **CAR-SE-RES-01 — Known-vulnerability control [GATE, Both/tooling, FRAMEWORK]**  
  Carta SHALL have an automated process that identifies known vulnerabilities in framework runtime/development dependencies and a policy for blocking or time-bounding unresolved high-risk findings.

- **CAR-SE-RES-02 — Resource-abuse boundary [GATE, Sprindle, SHARED]**  
  Carta SHALL document where rate limiting, request-size limits, pagination limits, upload limits, timeouts, and similar abuse controls are consumer/platform responsibilities, and SHALL not make those controls impractical to install at the correct boundary.

- **CAR-SE-RES-03 — Extension-seam security invariants [GATE, Both, SHARED]**  
  Security-sensitive escape hatches SHALL explicitly state which validation, authorization, scope, transaction, and error guarantees are no longer automatically enforced.

- **CAR-SE-RES-04 — CI/supply-chain hygiene [GATE, Tooling, FRAMEWORK]**  
  Framework validation/release automation SHALL use reproducible dependency installation and SHALL minimize avoidable credential exposure or untrusted execution in privileged release paths.

---

## 8. Maintainability — 3.7

### Modularity — 3.7.1

- **CAR-MA-MOD-01 — Framework/application boundary [GATE, Both, FRAMEWORK]**  
  Sprindle and Loom SHALL not depend on `apps/*` or application-domain modules for their public framework behavior.

- **CAR-MA-MOD-02 — Responsibility boundaries [GATE, Both, FRAMEWORK]**  
  Transport, persistence/source, resource contracts, UI surfaces, adapters, and application policy SHALL remain separable through explicit public interfaces; crossing a boundary SHALL not require importing unrelated internal modules.

- **CAR-MA-MOD-03 — Dependency-cycle control [GATE, Both, FRAMEWORK]**  
  Public package/module architecture SHALL be free of cycles that make independent understanding/testing/replacement of framework areas impractical.

### Reusability — 3.7.2

- **CAR-MA-REU-01 — Domain-neutral framework core [GATE, Both, FRAMEWORK]**  
  Framework packages SHALL not embed project-specific entities, permissions, routes, branding, deployment assumptions, or business workflows as mandatory core behavior.

- **CAR-MA-REU-02 — Reusable extension contracts [GATE, Both, FRAMEWORK]**  
  Public source/adapter/renderer/schema/resource/component extension contracts SHALL be documented and testable without copying a specific application implementation.

### Analysability — 3.7.3

- **CAR-MA-ANA-01 — Actionable diagnostics [GATE, Both, FRAMEWORK]**  
  Contract/configuration failures detected by Carta SHALL identify the failing framework concept and enough context to locate the cause; boot-time detectable schema/configuration errors SHOULD fail early.

- **CAR-MA-ANA-02 — Architecture/documentation synchronization [GATE, Both/docs, FRAMEWORK]**  
  Public README/reference/architecture documentation and tests SHALL be updated in the same change when a public contract or ownership boundary changes.

- **CAR-MA-ANA-03 — Static analysis baseline [GATE, Both/tooling, FRAMEWORK]**  
  Framework source SHALL pass the configured lint/type-check/static-analysis baseline with no ignored error backlog unless a documented time-bounded exception exists.

### Modifiability — 3.7.4

- **CAR-MA-MODIF-01 — Public API compatibility control [GATE, Both, FRAMEWORK]**  
  Carta SHALL define its public API surface and SHALL detect unintended removal or incompatible change of public exports/contracts before release.

- **CAR-MA-MODIF-02 — Change/deprecation/migration policy [GATE, Both, FRAMEWORK]**  
  Intentional breaking changes SHALL follow the Carta public-API policy with release notes/migration guidance appropriate to the package versioning stage.

- **CAR-MA-MODIF-03 — Controlled change blast radius [GATE, Both, FRAMEWORK]**  
  A change inside one framework responsibility SHOULD not require unrelated consumer changes; the audit SHALL flag changes that propagate through broad unrelated types/modules without a contract reason.

### Testability — 3.7.5

- **CAR-MA-TEST-01 — Public-behavior test coverage [GATE, Both, FRAMEWORK]**  
  Every GATE-level public framework invariant SHALL have an executable test where it is objectively automatable; expert-review-only invariants SHALL have a prescribed review procedure and evidence requirement.

- **CAR-MA-TEST-02 — Compile-time contract tests [GATE, Both, FRAMEWORK]**  
  Public generic/type contracts whose correctness matters to consumers SHALL have positive and, where useful, negative compile-time/type tests.

- **CAR-MA-TEST-03 — Deterministic isolated fixtures [GATE, Both, FRAMEWORK]**  
  Framework test fixtures SHALL avoid hidden network/project state and SHALL be reproducible in clean CI. Integration fixtures MAY use declared services such as a controlled PostgreSQL instance.

---

## 9. Flexibility — 3.8

### Adaptability — 3.8.1

- **CAR-FL-ADP-01 — Supported extension without fork [GATE, Both, FRAMEWORK]**  
  Common application-specific differences SHALL be expressible through documented Hono middleware/routes, pipeline hooks, sources, Loom adapters/renderers/slots/custom screens, and related seams without patching Carta core.

- **CAR-FL-ADP-02 — Policy neutrality [GATE, Both, FRAMEWORK]**  
  Carta SHALL not hard-code one application's authorization roles, identity provider, file store, API service implementation, routing policy, or business workflow where the documented framework boundary places that policy in the consumer.

### Scalability — 3.8.2

- **CAR-FL-SCA-01 — Runtime scaling behavior [GATE, Both, FRAMEWORK]**  
  Representative runtime cost SHALL scale within the ratified complexity/performance envelope as record count, field count, relation count, and rendered controls increase.

- **CAR-FL-SCA-02 — Type-system scaling behavior [GATE, Both, FRAMEWORK]**  
  Public generic/type composition SHALL avoid disproportionate growth in compiler types/instantiations/memory on representative small-to-large consumer fixtures.

### Installability — 3.8.3

- **CAR-FL-INS-01 — Clean supported bootstrap [GATE, Both/tooling, FRAMEWORK]**  
  From a clean environment following the documented Carta distribution model, a supported consumer/workspace SHALL install dependencies, type-check, run framework tests, and build without undocumented manual patches.

- **CAR-FL-INS-02 — Declared toolchain consistency [GATE, Both/tooling, FRAMEWORK]**  
  Node/package-manager/TypeScript/peer-dependency requirements SHALL be mutually consistent across root, Sprindle, Loom, CI, and documentation for every declared supported configuration.

### Replaceability — 3.8.4

- **CAR-FL-REP-01 — Avoid needless lock-in [ADVISORY, Both, FRAMEWORK]**  
  Carta SHOULD preserve reasonable replacement seams for external services/primitives it wraps and SHOULD avoid exposing third-party internals as mandatory application contracts unless that dependency is intentionally part of Carta's public contract.

---

## 10. Safety — 3.9

All five Safety subcharacteristics are **OUT** in the baseline profile. This does not remove normal reliability/security requirements for safe failure; it only means Carta is not being qualified here as a safety-related product. See the profile reassessment triggers.

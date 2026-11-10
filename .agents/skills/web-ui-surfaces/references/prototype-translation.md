# Translate a prototype

Use [DESIGN.md](../../../../DESIGN.md) and current
[UI contracts](../../../../docs/ui/README.md) for production presentation.
The module's design and source restrictions still apply.

1. Inspect the entry point, action sequence, return path, information hierarchy,
   interactions, and feedback. Use the running prototype or source for behavior;
   screenshots alone cannot establish it. Label unresolved or inferred intent.
2. Use the [capability index](capabilities.md) to preserve that experience with
   production components. Keep information access, action prominence, cancel,
   recovery, and feedback. Prototype CSS, sample data, and mock state do not
   define production requirements.
3. Resolve routine styling locally. Changing an interaction, such as inline
   editing to a separate page, is a UX decision under the module design rules.
   Exact pixel fidelity requires an explicit request.
4. Compare the result with the intended experience. Select checks through
   [module verification](../../verify-carta-module/SKILL.md). Report significant
   adaptations, reasons, checks, and gaps in existing delivery notes.

This reference adds no approval gate or separate document.

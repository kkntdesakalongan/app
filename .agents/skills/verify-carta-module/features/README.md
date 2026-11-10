# Carta verification map

Use these recipes only for proof selected by the [module verification
skill](../SKILL.md). They do not require browser journeys for each module. Use
[runtime instructions](../references/runtime.md) for live instances. Existing
route specs use the guarded migrated `.env.test` target and run serially. They
drive the production app in process; they do not prove HTTP server startup or
browser behavior. Read assertions before reusing a result for a requirement.

| Feature | Primary proof | Page boundary |
|---|---|---|
| [Users](users.md) | HTTP account lifecycle; existing rule tests | API proof does not establish confirmation behavior |
| [Role permissions](role-permissions.md) | Existing route/database test | API proof does not establish switch feedback |
| [Sign-in](sign-in.md) | Existing route/database test | Login form and redirects are not established by API proof |

Recipes list entry points and proof scope. A different entry point is not
verified by implication. Missing fixture prerequisites fail the selected
journey; record the cause in its Gotchas instead of reducing its assertions.
Keep this index and affected recipes current when routes or contracts change.

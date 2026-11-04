# Automatic API namespace

The API application applies `/api` once. Route files remain relative to that
prefix. The web client and app services derive `/api/` from the configured API
origin. Auth remains at `/api/auth/...`. File URLs and OpenAPI server metadata
use the same prefix. Vercel now has one API rule and one website rule; new
modules need no deployment route entry. Old root API paths are not aliases.

Proof:

- All 84 API tests passed, including the production bundle, auth, files, CRUD,
  public modules, and the HTTP namespace contract.
- All 15 focused web service and login tests passed.
- Both browser module cases passed with prefixed requests.
- API build, API lint, web type check, web lint, web build, architecture gate,
  and local Vercel build passed. Existing lint and build warnings remain.
- The full web suite passed 262 cases and failed four. All four failures also
  occur on the prior commit: CommandPalette keyboard selection, denied nested
  navigation, delete completion feedback, and a route type diagnostic match.
- SDK type checking fails in two existing SDK tests because they use
  `client.api.auth` instead of the current `client.auth` contract. These are
  app-specific test references in a framework package. The package remains
  unchanged under the repository's framework-package restriction. Web and API
  production builds compile the current application contract.

Evidence is in `.local/verification/disaster-map/`, in the files with `prefix`
in their names. The baseline checks used a separate checkout at commit 5010e2b.

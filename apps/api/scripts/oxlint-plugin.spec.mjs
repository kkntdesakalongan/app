import { RuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'
import { routeAuthorization, routePrimitives } from './oxlint-plugin.mjs'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
})

ruleTester.run('route-authorization', routeAuthorization, {
  valid: [
    {
      name: 'guarded canonical factories and defineRoute',
      code: `
        import { defineRoute, list, detail, create, update, deleteRoute } from '@southneuhof/sprindle/routes'
        defineRoute({ authorize: [] })
        list({ authorize: [] })
        detail({ authorize: [] })
        create({ authorize: [] })
        update({ authorize: [] })
        deleteRoute({ authorize: [] })
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'aliased Sprindle factory',
      code: `
        import { list as makeList } from '@southneuhof/sprindle/routes'
        makeList({ authorize: [] })
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'authenticated alone',
      code: `
        import { defineRoute, authenticated } from '@southneuhof/sprindle/routes'
        defineRoute({ authorize: [authenticated()] })
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'permission guard alone',
      code: `
        import { list } from '@southneuhof/sprindle/routes'
        import { requirePermission } from '../../identity'
        list({ authorize: [requirePermission('list-example')] })
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'public health route',
      code: `
        import { defineRoute } from '@southneuhof/sprindle/routes'
        defineRoute({})
      `,
      filename: 'src/routes/health/+server.ts',
    },
    {
      name: 'public auth route',
      code: `
        import { defineRoute } from '@southneuhof/sprindle/routes'
        defineRoute({})
      `,
      filename: 'src/routes/auth/sign-in/email/+server.ts',
    },
  ],
  invalid: [
    {
      name: 'all guarded factories require authorize',
      code: `
        import { defineRoute, list, detail, create, update, deleteRoute } from '@southneuhof/sprindle/routes'
        defineRoute({})
        list({})
        detail({})
        create({})
        update({})
        deleteRoute({})
      `,
      filename: 'src/routes/example/example.ts',
      errors: [
        { messageId: 'missingAuthorize', line: 3 },
        { messageId: 'missingAuthorize', line: 4 },
        { messageId: 'missingAuthorize', line: 5 },
        { messageId: 'missingAuthorize', line: 6 },
        { messageId: 'missingAuthorize', line: 7 },
        { messageId: 'missingAuthorize', line: 8 },
      ],
    },
    {
      name: 'authenticated and permission guard are redundant',
      code: `
        import { list, authenticated } from '@southneuhof/sprindle/routes'
        import { requirePermission } from '../../identity'
        list({ authorize: [authenticated(), requirePermission('list-example')] })
      `,
      filename: 'src/routes/example/example.ts',
      errors: [{ messageId: 'redundantAuthenticated', line: 4 }],
    },
    {
      name: 'permission guard before authenticated is also redundant',
      code: `
        import { list, authenticated } from '@southneuhof/sprindle/routes'
        import { requirePermission } from '../../identity'
        list({ authorize: [requirePermission('list-example'), authenticated()] })
      `,
      filename: 'src/routes/example/example.ts',
      errors: [{ messageId: 'redundantAuthenticated', line: 4 }],
    },
  ],
})

ruleTester.run('route-primitives', routePrimitives, {
  valid: [
    {
      name: 'shared body reader',
      code: `
        import { readJsonBody } from '../../request-body'
        async function action(c) { return readJsonBody(c) }
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'declarative default sort',
      code: `
        import { list } from '@southneuhof/sprindle/routes'
        list({ query: { defaultSort: 'name' }, before: () => ({}) })
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'list enrich and detail response parsing',
      code: `
        import { detail, list } from '@southneuhof/sprindle/routes'
        list({ enrich: (rows) => rows })
        detail({ authorize: [], after: async (args) => args.response.json() })
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'typed custom response',
      code: `
        function action(c) { return c.json({ data: [] }) }
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'unrelated list and create functions',
      code: `
        function list(options) { return options }
        function create(options) { return options }
        list({ before: () => { query.sort ??= 'name' } })
        create({})
      `,
      filename: 'src/routes/example/example.ts',
    },
    {
      name: 'route-looking code outside route files',
      code: `
        import { list } from '@southneuhof/sprindle/routes'
        list({ before: () => { query.sort ??= 'name' }, after: (args) => args.response.json() })
        async function action(c) { return c.req.json() }
      `,
      filename: 'scripts/example.mjs',
    },
  ],
  invalid: [
    {
      name: 'direct request JSON parsing',
      code: `
        async function action(c) { return c.req.json() }
      `,
      filename: 'src/routes/example/example.ts',
      errors: [{ messageId: 'requestJson', line: 2 }],
    },
    {
      name: 'imperative default sort in list before',
      code: `
        import { list } from '@southneuhof/sprindle/routes'
        list({ before: () => { query.sort ??= 'name' } })
      `,
      filename: 'src/routes/example/example.ts',
      errors: [{ messageId: 'imperativeDefaultSort', line: 3 }],
    },
    {
      name: 'list after response parsing',
      code: `
        import { list as makeList } from '@southneuhof/sprindle/routes'
        makeList({ after: async (args) => args.response.json() })
      `,
      filename: 'src/routes/example/example.ts',
      errors: [{ messageId: 'listResponseJson', line: 3 }],
    },
  ],
})

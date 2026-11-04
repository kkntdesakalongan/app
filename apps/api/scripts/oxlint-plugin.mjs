const routeFactoryNames = new Set(['defineRoute', 'list', 'detail', 'create', 'update', 'deleteRoute'])
const permissionGuardNames = new Set(['requirePermission'])

function normalizedFilename(filename) {
  return String(filename).replaceAll('\\', '/')
}

function isRouteFile(filename) {
  const path = normalizedFilename(filename)
  return path.startsWith('src/routes/') || path.includes('/src/routes/')
}

function isPublicRouteFile(filename) {
  const path = normalizedFilename(filename)
  return path.endsWith('/routes/health/+server.ts') || /\/routes\/auth\/.+\/\+server\.ts$/.test(path)
}

function propertyName(node) {
  if (!node || node.computed) return undefined
  if (node.key.type === 'Identifier') return node.key.name
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') return node.key.value
  return undefined
}

function calledName(node) {
  return node?.type === 'CallExpression' && node.callee.type === 'Identifier' ? node.callee.name : undefined
}

function importedName(node) {
  if (node.type === 'Identifier') return node.name
  return typeof node.value === 'string' ? node.value : undefined
}

function collectImportedNames(node, sourceMatches, importedNames, target) {
  if (!sourceMatches(node.source.value)) return
  for (const specifier of node.specifiers) {
    if (specifier.type !== 'ImportSpecifier') continue
    const imported = importedName(specifier.imported)
    if (imported && importedNames.has(imported)) target.add(specifier.local.name)
  }
}

function firstObjectArgument(node) {
  const first = node.arguments[0]
  return first?.type === 'ObjectExpression' ? first : undefined
}

function findProperty(object, name) {
  return object?.properties.find((property) => property.type === 'Property' && propertyName(property) === name)
}

function isCallTo(node, names) {
  const name = calledName(node)
  return name !== undefined && names.has(name)
}

function isInsideListOption(node, optionName, listNames) {
  let current = node.parent
  while (current) {
    if (current.type === 'Property' && propertyName(current) === optionName) {
      const object = current.parent
      const call = object?.type === 'ObjectExpression' ? object.parent : undefined
      if (object && call?.type === 'CallExpression' && call.arguments[0] === object && isCallTo(call, listNames)) return true
    }
    current = current.parent
  }
  return false
}

function isMemberCall(node, innerName, outerName) {
  if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression' || node.callee.computed) return false
  const outer = node.callee
  if (outer.property.type !== 'Identifier' || outer.property.name !== innerName) return false
  const inner = outer.object
  return inner.type === 'MemberExpression' && !inner.computed && inner.property.type === 'Identifier' && inner.property.name === outerName
}

export const routeAuthorization = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      missingAuthorize: 'Route factories must declare authorize.',
      redundantAuthenticated: 'Permission guards already authenticate; remove authenticated().',
    },
  },
  create(context) {
    const routeNames = new Set()
    const authenticatedNames = new Set()
    const permissionNames = new Set()

    return {
      ImportDeclaration(node) {
        collectImportedNames(node, (source) => source === '@southneuhof/sprindle/routes', routeFactoryNames, routeNames)
        collectImportedNames(node, (source) => source === '@southneuhof/sprindle/routes', new Set(['authenticated']), authenticatedNames)
        collectImportedNames(node, (source) => source.endsWith('/identity'), permissionGuardNames, permissionNames)
      },
      CallExpression(node) {
        if (isPublicRouteFile(context.getFilename()) || !isCallTo(node, routeNames)) return
        const options = firstObjectArgument(node)
        const authorize = findProperty(options, 'authorize')
        if (!authorize) {
          context.report({ node, messageId: 'missingAuthorize' })
          return
        }
        if (authorize.value.type !== 'ArrayExpression') return
        const authenticatedCall = authorize.value.elements.find((element) => isCallTo(element, authenticatedNames))
        const hasPermissionGuard = authorize.value.elements.some((element) => isCallTo(element, permissionNames))
        if (authenticatedCall && hasPermissionGuard) context.report({ node: authenticatedCall, messageId: 'redundantAuthenticated' })
      },
    }
  },
}

export const routePrimitives = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      requestJson: 'Use readJsonBody(c) instead of c.req.json().',
      imperativeDefaultSort: 'Use list({ query: { defaultSort } }) instead of query.sort ??=.',
      listResponseJson: 'Use list({ enrich }) instead of parsing args.response.json() in a list after hook.',
    },
  },
  create(context) {
    const listNames = new Set()

    return {
      ImportDeclaration(node) {
        collectImportedNames(node, (source) => source === '@southneuhof/sprindle/routes', new Set(['list']), listNames)
      },
      CallExpression(node) {
        if (!isRouteFile(context.getFilename())) return
        if (isMemberCall(node, 'json', 'req')) context.report({ node, messageId: 'requestJson' })
        if (isMemberCall(node, 'json', 'response') && isInsideListOption(node, 'after', listNames)) context.report({ node, messageId: 'listResponseJson' })
      },
      AssignmentExpression(node) {
        if (!isRouteFile(context.getFilename()) || node.operator !== '??=') return
        const left = node.left
        if (left.type !== 'MemberExpression' || left.computed || left.object.type !== 'Identifier' || left.object.name !== 'query' || left.property.type !== 'Identifier' || left.property.name !== 'sort') return
        if (isInsideListOption(node, 'before', listNames)) context.report({ node, messageId: 'imperativeDefaultSort' })
      },
    }
  },
}

export default {
  meta: { name: 'carta' },
  rules: {
    'route-authorization': routeAuthorization,
    'route-primitives': routePrimitives,
  },
}

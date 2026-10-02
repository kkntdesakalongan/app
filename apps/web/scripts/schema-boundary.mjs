import { isBuiltin } from 'node:module'
import { realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const apiSourceRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../api/src'))
const repositoryRoot = resolve(apiSourceRoot, '../../..')
const sprindleSourceRoot = resolve(repositoryRoot, 'packages/sprindle/src')
const serverPackages = new Set([
  '@aws-sdk/client-s3',
  '@aws-sdk/s3-request-presigner',
  '@hono/node-server',
  '@libsql/client',
  '@prisma/client',
  'better-auth',
  'better-sqlite3',
  'hono',
  'mongodb',
  'mysql',
  'mysql2',
  'pg',
  'pg-native',
  'postgres',
  'sqlite3',
])

function normalizeId(id) {
  let path = id.split('?', 1)[0]
  if (path.startsWith('file://')) path = fileURLToPath(path)
  if (!isAbsolute(path)) return path
  try {
    return realpathSync.native(path)
  } catch {
    return resolve(path)
  }
}

function isApiFile(id) {
  const path = relative(apiSourceRoot, normalizeId(id))
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}

function apiFileKind(id) {
  if (!isApiFile(id)) return undefined
  const path = relative(apiSourceRoot, normalizeId(id)).split(sep).join('/')
  if (path === 'schema.ts' || /^routes\/.+\/schema\.ts$/.test(path)) return 'schema'
  if (/^routes\/.+\/[^/]+\.table\.ts$/.test(path)) return 'table'
  return 'backend runtime'
}

function packageName(id) {
  const path = normalizeId(id)
  if (!isAbsolute(path)) {
    if (isBuiltin(path)) return undefined
    const segments = path.split('/')
    return segments[0]?.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]
  }
  const marker = `${sep}node_modules${sep}`
  const index = path.lastIndexOf(marker)
  if (index < 0) return undefined
  const segments = path.slice(index + marker.length).split(sep)
  return segments[0]?.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]
}

function isServerPackage(name, source = '', id = '') {
  const specifier = source.split('?', 1)[0]
  const path = normalizeId(id)
  if (isAbsolute(path)) {
    const subpath = relative(sprindleSourceRoot, path)
    const inSprindleSource = subpath === '' || (!subpath.startsWith(`..${sep}`) && subpath !== '..' && !isAbsolute(subpath))
    if (inSprindleSource) return !['entity', 'validation', 'errors.ts'].includes(subpath.split(sep)[0])
  }
  if (name === '@southneuhof/sprindle') return !['@southneuhof/sprindle/entity', '@southneuhof/sprindle/validation'].includes(specifier)
  return serverPackages.has(name) || name.startsWith('@aws-sdk/') || name.startsWith('@better-auth/') || name.startsWith('@libsql/') || name.startsWith('@prisma/')
}

function describeId(id) {
  const path = normalizeId(id)
  if (!isAbsolute(path)) return path
  const localPath = relative(repositoryRoot, path)
  return localPath === '..' || localPath.startsWith(`..${sep}`) ? path : localPath.split(sep).join('/')
}

function apiEdgeViolation(importer, target, source) {
  if (!isApiFile(target)) return undefined
  const targetKind = apiFileKind(target)
  if (!isApiFile(importer)) {
    if (targetKind === 'schema') {
      const exportedSchema = source === '@southneuhof/api/src/schema.ts' || /^@southneuhof\/api\/src\/routes\/.+\/schema\.ts$/.test(source)
      return exportedSchema ? undefined : 'web runtime must import API schemas through their physical package exports'
    }
    return 'web runtime imports must enter API source through schema.ts'
  }
  const importerKind = apiFileKind(importer)
  if ((importerKind === 'schema' || importerKind === 'table') && (targetKind === 'schema' || targetKind === 'table')) return undefined
  return 'schema runtime may reach only schema.ts and *.table.ts files in API source'
}

function optimizedDependency(id, server) {
  const metadata = server?.environments?.client?.depsOptimizer?.metadata
  const path = normalizeId(id)
  const dependencies = [metadata?.optimized, metadata?.discovered, metadata?.chunks]
  for (const entries of dependencies) {
    const match = Object.entries(entries ?? {}).find(([, dependency]) => normalizeId(dependency.file) === path)
    if (match) {
      return {
        id: match[1].src ? normalizeId(match[1].src) : path,
        packageName: packageName(match[1].src ?? path) ?? match[0],
      }
    }
  }
  return { id: path, packageName: packageName(id) }
}

function findViolationFrom(root, edges, getPackageName = packageName) {
  const paths = new Map([[root, [root]]])
  const queue = [root]
  for (let index = 0; index < queue.length; index += 1) {
    const importer = queue[index]
    for (const edge of edges.get(importer)?.values() ?? []) {
      const displayTarget = isBuiltin(edge.source) && !isBuiltin(edge.id) ? edge.source : edge.id
      const path = [...paths.get(importer), displayTarget]
      const apiViolation = apiEdgeViolation(importer, edge.id, edge.source)
      if (apiViolation) return { path, reason: apiViolation }
      const targetName = edge.packageName ?? getPackageName(edge.id)
      if (isBuiltin(edge.id) || isBuiltin(edge.source) || isServerPackage(targetName ?? '', edge.source, edge.id)) {
        return { path, reason: `schema runtime reaches server dependency ${targetName ?? edge.source}` }
      }
      if (!paths.has(edge.id)) {
        paths.set(edge.id, path)
        queue.push(edge.id)
      }
    }
  }
  return undefined
}

function findViolation(edges, getPackageName = packageName) {
  for (const [importer, targets] of edges) {
    if (isApiFile(importer)) continue
    for (const target of targets.keys()) {
      if (apiFileKind(target) !== 'schema') continue
      const violation = findViolationFrom(target, edges, getPackageName)
      if (violation) return violation
    }
  }
  return undefined
}

function schemaAncestorPath(id, parents) {
  const paths = new Map([[id, [id]]])
  const queue = [id]
  for (let index = 0; index < queue.length; index += 1) {
    const child = queue[index]
    for (const parent of parents.get(child) ?? []) {
      if (paths.has(parent)) continue
      const path = [...paths.get(child), parent]
      if (apiFileKind(parent) === 'schema') return path.reverse()
      paths.set(parent, path)
      queue.push(parent)
    }
  }
  return undefined
}

function formatViolation(violation) {
  const chain = violation.path.map((id) => `  ${describeId(id)}`).join('\n  →')
  return `Browser API schema boundary violation: ${violation.reason}\nImport chain:\n${chain}`
}

export function schemaBoundaryPlugin() {
  const edges = new Map()
  const parents = new Map()
  let server

  function addEdge(importer, id, source, name) {
    let targets = edges.get(importer)
    if (!targets) {
      targets = new Map()
      edges.set(importer, targets)
    }
    const previous = targets.get(id)
    if (previous?.source === source && previous.packageName === name) return false
    targets.set(id, { id, source, packageName: name })
    let importers = parents.get(id)
    if (!importers) {
      importers = new Set()
      parents.set(id, importers)
    }
    importers.add(importer)
    return true
  }

  function removeImporter(importer) {
    for (const id of edges.get(importer)?.keys() ?? []) {
      const importers = parents.get(id)
      importers?.delete(importer)
      if (importers?.size === 0) parents.delete(id)
    }
    edges.delete(importer)
  }

  return {
    name: 'carta-web-schema-boundary',
    enforce: 'pre',
    configureServer(value) {
      server = value
    },
    async resolveId(source, importer) {
      const resolved = await this.resolve(source, importer, { skipSelf: true })
      const id = resolved?.id ?? (isBuiltin(source) ? source : undefined)
      if (id === undefined) return resolved
      const dependency = optimizedDependency(id, server)
      const normalizedId = dependency.id
      if (!importer) {
        if (!isApiFile(normalizedId)) return resolved
        if (apiFileKind(normalizedId) !== 'schema') {
          if (!(server && !this.environment)) {
            this.error(formatViolation({ path: [normalizedId], reason: 'API runtime entries are not browser schema entries' }))
          }
          return resolved
        }
        addEdge('carta:optimizer-entry', normalizedId, source)
      } else {
        const normalizedImporter = normalizeId(importer)
        const targetPackage = dependency.packageName ?? packageName(source)
        const changed = addEdge(normalizedImporter, normalizedId, source, targetPackage)
        const apiViolation = apiEdgeViolation(normalizedImporter, normalizedId, source)
        if (apiViolation && !(server && !this.environment)) {
          this.error(formatViolation({ path: [normalizedImporter, normalizedId], reason: apiViolation }))
        }
        const serverDependency = isBuiltin(normalizedId) || isBuiltin(source) || isServerPackage(targetPackage ?? '', source, normalizedId)
        if (changed && serverDependency && !(server && !this.environment)) {
          const displayTarget = isBuiltin(source) && !isBuiltin(normalizedId) ? source : normalizedId
          if (isApiFile(normalizedImporter)) {
            const importPath = apiFileKind(normalizedImporter) === 'schema' ? [normalizedImporter] : (schemaAncestorPath(normalizedImporter, parents) ?? [normalizedImporter])
            this.error(
              formatViolation({
                path: [...importPath, displayTarget],
                reason: `schema runtime reaches server dependency ${targetPackage ?? source}`,
              })
            )
          }
          const path = server ? schemaAncestorPath(normalizedImporter, parents) : undefined
          if (path) {
            this.error(
              formatViolation({
                path: [...path, displayTarget],
                reason: `schema runtime reaches server dependency ${targetPackage ?? source}`,
              })
            )
          }
        }
        const scanRoot =
          apiFileKind(normalizedId) === 'schema' ? normalizedId : isApiFile(normalizedImporter) && ['schema', 'table'].includes(apiFileKind(normalizedImporter)) ? normalizedImporter : undefined
        if (server && changed && edges.get(normalizedId)?.size > 0 && this.environment) {
          const ancestorPath = scanRoot ? undefined : schemaAncestorPath(normalizedImporter, parents)
          if (scanRoot || ancestorPath) {
            const violation = findViolationFrom(scanRoot ?? normalizedId, edges, (target) => optimizedDependency(target, server).packageName)
            if (violation) {
              const path = ancestorPath ? [...ancestorPath, ...violation.path] : violation.path
              this.error(formatViolation({ ...violation, path }))
            }
          }
        }
      }
      return resolved
    },
    moduleParsed(info) {
      const importer = normalizeId(info.id)
      const previous = edges.get(importer)
      const sources = new Map([...(previous?.values() ?? [])].map((edge) => [edge.id, edge.source]))
      removeImporter(importer)
      for (const id of [...info.importedIds, ...info.dynamicallyImportedIds]) {
        const dependency = optimizedDependency(id, server)
        addEdge(importer, dependency.id, sources.get(dependency.id) ?? id, dependency.packageName)
      }
    },
    buildEnd() {
      const violation = findViolation(edges, (target) => optimizedDependency(target, server).packageName)
      if (violation && !server) this.error(formatViolation(violation))
    },
    handleHotUpdate(context) {
      removeImporter(normalizeId(context.file))
    },
  }
}

#!/usr/bin/env node
// Check declared Vue surfaces. Semantic acceptance remains with the reviewer.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { displayRequirement } from '../packages/loom/src/display/requirements.policy.mjs'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { parse, compileScript } = require('vue/compiler-sfc')
const ts = require('typescript')
const routeKinds = { 'detail.route.vue': 'detail', 'create.route.vue': 'create', 'edit.route.vue': 'update' }
const views = { list: 'ListView', detail: 'DetailView', create: 'FormView', update: 'FormView' }
// Native elements that can replace a shared control. Other native elements
// (layout, text, option) add no item.
const nativeControls = new Set(['button', 'input', 'select', 'textarea'])
const normalize = name => name.replace(/-/g, '').toLowerCase()
const builtins = new Set(['component', 'slot', 'template', 'transition', 'transitiongroup', 'keepalive', 'teleport', 'suspense', 'routerlink', 'routerview'])

// A literal type="hidden" input carries state, not an interaction, so it
// adds no item. Any other type source (absent, dynamic, spread) can render
// a visible control, so it needs review.
function hiddenInput(node) {
  const type = (node.props ?? []).find(prop =>
    (prop.type === 6 && prop.name?.toLowerCase() === 'type')
    || (prop.type === 7 && prop.name === 'bind' && prop.arg?.content === 'type'))
  if (!type) return false
  return type.type === 6
    && typeof type.value?.content === 'string'
    && type.value.content.toLowerCase() === 'hidden'
}

function walk(node, visit) {
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

function registered(source, tag) {
  const file = ts.createSourceFile('registration.ts', source, ts.ScriptTarget.Latest, true)
  let found = false
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'component' && node.arguments.length === 2
      && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === tag) found = true
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

export function checkUiContract(contract, options) {
  return checkSurfaces(contract, options)
}

export function checkUiSources(paths, { root = process.cwd() } = {}) {
  function collect(path) {
    if (statSync(resolve(root, path)).isDirectory()) {
      return readdirSync(resolve(root, path)).sort().flatMap(name => collect(join(path, name)))
    }
    return path.endsWith('.vue') ? [path] : []
  }
  function collectResources(path) {
    if (statSync(resolve(root, path)).isDirectory()) {
      return readdirSync(resolve(root, path)).sort().flatMap(name => collectResources(join(path, name)))
    }
    return path.endsWith('.resource.ts') ? [path] : []
  }
  const surfaces = [...new Set(paths.flatMap(collect))].map(file => ({ file }))
  const result = checkSurfaces({ surfaces }, { root }, false)
  const resourceFiles = [...new Set(paths.flatMap(collectResources))]
  const displayResult = checkResourceDisplay(resourceFiles, { root })
  result.errors.push(...displayResult.errors)
  result.review.push(...displayResult.review)
  const vueContents = []
  for (const surface of surfaces) {
    try { vueContents.push(readFileSync(resolve(root, surface.file), 'utf8')) } catch { /* surface already reported */ }
  }
  for (const item of checkResourceRowOps(resourceFiles, { root, vueContents })) result.review.push(item)
  return result
}

function checkSurfaces(contract, { root = process.cwd(), read = path => readFileSync(resolve(root, path), 'utf8') } = {}, declared = true) {
  const errors = [], review = []
  if (!Array.isArray(contract.surfaces) || !contract.surfaces.length) return { errors: ['Select at least one Vue surface.'], review }
  const globals = new Set()
  for (const global of contract.globals ?? []) {
    if (!global.tag || !global.registration || !registered(read(global.registration), global.tag)) errors.push(`Global ${global.tag}: no literal component registration in ${global.registration}`)
    else { globals.add(normalize(global.tag)); review.push(`Confirm registration is installed: ${global.tag} in ${global.registration}`) }
  }
  const files = new Set()
  for (const surface of contract.surfaces) {
    const label = surface.file
    if (!label || files.has(label)) { errors.push(`Missing or duplicate surface: ${label}`); continue }
    files.add(label)
    const routeKind = routeKinds[basename(label)]
    if (declared) {
      if (routeKind && surface.kind !== routeKind) errors.push(`${label}: route convention requires kind ${routeKind}; record composition exceptions in gap`)
      if (!(surface.kind in views) && surface.kind !== 'custom') errors.push(`${label}: kind must be list, detail, create, update or custom`)
      if (surface.kind === 'custom' && !surface.gap?.trim()) errors.push(`${label}: custom surface needs a specific framework gap`)
    }
    try {
      const { descriptor, errors: parseErrors } = parse(read(label), { filename: resolve(root, label) })
      if (parseErrors.length) throw new Error(parseErrors.map(String).join('; '))
      if (!descriptor.template?.ast) throw new Error('Missing template')
      const script = descriptor.script || descriptor.scriptSetup ? compileScript(descriptor, { id: label }) : { imports: {}, bindings: {} }
      const imports = script.imports ?? {}, bindings = script.bindings ?? {}
      const tags = new Set(), slots = new Set()
      walk(descriptor.template.ast, node => {
        if (node.type !== 1) return
        if (node.tagType === 0 && nativeControls.has(node.tag.toLowerCase())) {
          if (!(node.tag.toLowerCase() === 'input' && hiddenInput(node))) {
            review.push(`${label}:${node.loc.start.line}: native <${node.tag.toLowerCase()}> needs source review against the shared controls`)
          }
        }
        if (node.tagType === 1) {
          tags.add(node.tag)
          const name = normalize(node.tag)
          const bound = Object.keys(bindings).some(binding => normalize(binding) === name)
          const imported = Object.entries(imports).some(([local, item]) => !item.isType && item.isFromSetup && normalize(local) === name)
          if (!builtins.has(name) && !globals.has(name) && !bound && !imported) errors.push(`${label}:${node.loc.start.line}: unresolved component <${node.tag}>`)
        }
        for (const prop of node.props ?? []) if (prop.type === 7 && prop.name === 'slot' && prop.arg?.isStatic) slots.add(prop.arg.content)
      })
      if (!declared) {
        if (slots.has('create-action')) review.push(`${label}: Create override needs source review against the requested interaction`)
        continue
      }
      if (!Array.isArray(surface.components) || !surface.components.length) errors.push(`${label}: declare the selected framework components`)
      const expectedView = views[surface.kind]
      const selected = surface.components ?? []
      const hasView = selected.some(component => (component.name === expectedView && component.from === '@southneuhof/loom')
        || (component.name === 'default' && component.from === `@southneuhof/loom/components/views/${expectedView}.vue`))
      if (expectedView && !hasView && !surface.gap?.trim()) errors.push(`${label}: ${surface.kind} requires ${expectedView}; a lower-level surface needs a reviewed gap`)
      if (surface.kind === 'detail' && !hasView && !selected.some(component =>
        (component.name === 'Detail' && component.from === '@southneuhof/loom')
        || (component.name === 'default' && component.from === '@southneuhof/loom/components/core/Detail.vue')))
        errors.push(`${label}: custom record composition still requires Detail`)
      for (const component of selected) {
        if (Object.keys(component).some(key => !['name', 'from'].includes(key))) errors.push(`${label}: component accepts only name/from; record a gap on the surface`)
        const used = Object.entries(imports).some(([local, item]) => !item.isType && item.source === component.from
          && item.imported === component.name && [...tags].some(tag => normalize(tag) === normalize(local)))
        if (!used) errors.push(`${label}: template must use ${component.name} from ${component.from}`)
      }
      const extensions = surface.extensions ?? []
      for (const extension of extensions) {
        if (!extension.slot || !extension.reason?.trim() || !slots.has(extension.slot)) errors.push(`${label}: invalid or unused slot exception ${extension.slot}`)
        else review.push(`${label}: ${extension.slot}: ${extension.reason}`)
      }
      if (slots.has('create-action') && !extensions.some(item => item.slot === 'create-action' && item.reason?.trim())) errors.push(`${label}: Create override needs a requested interaction in extensions`)
      if (surface.gap?.trim()) review.push(`${label}: component gap: ${surface.gap}`)
    } catch (error) { errors.push(`${label}: ${error.message}`) }
  }
  return { errors, review }
}

export function fieldNeedsDisplay(kindInfo, signals) {
  let kind = kindInfo?.kind ?? 'unknown'
  if (kind === 'string[]' || kind === 'number[]' || kind === 'boolean[]' || kind === 'object[]' || kind === 'selection[]') kind = 'array'
  if (kindInfo?.options && kind === 'string') kind = 'enum'
  return displayRequirement(kind, {
    read: signals.read ? true : undefined,
    renderer: signals.renderer ? 'configured' : undefined,
    format: signals.format ? 'configured' : undefined,
  }) !== undefined
}

function displayKindLabel(kindInfo) {
  if (!kindInfo || kindInfo.kind === 'unknown') return 'unknown'
  if (kindInfo.kind === 'string' && kindInfo.options) return 'enum'
  return kindInfo.kind
}

function parseTs(text, name) {
  return ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true)
}

function propInit(obj, key) {
  if (!obj || !ts.isObjectLiteralExpression(obj)) return undefined
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    const name = prop.name
    if ((ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === key) return prop.initializer
  }
  return undefined
}

function stringValue(node) {
  return node && ts.isStringLiteralLike(node) ? node.text : undefined
}

// One-hop file index over resource, schema, and entity sources. Reads go
// through the injected reader so tests can use memory files.
function makeFileIndex(root, read) {
  const cache = new Map()
  function load(absPath) {
    if (cache.has(absPath)) return cache.get(absPath)
    let entry
    try {
      const source = parseTs(read(absPath), absPath)
      entry = { absPath, source, consts: new Map(), aliases: new Map(), imports: [] }
      for (const stmt of source.statements) {
        if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.initializer) entry.consts.set(decl.name.text, decl.initializer)
          }
        } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
          entry.consts.set(stmt.name.text, stmt)
        } else if (ts.isTypeAliasDeclaration(stmt) && ts.isIdentifier(stmt.name)) {
          entry.aliases.set(stmt.name.text, stmt.type)
        } else if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
          const names = []
          const clause = stmt.importClause
          if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) names.push({ alias: el.name.text, target: (el.propertyName ?? el.name).text, typeOnly: clause.isTypeOnly || el.isTypeOnly })
          }
          entry.imports.push({ spec: stmt.moduleSpecifier.text, names })
        }
      }
    } catch { entry = undefined }
    cache.set(absPath, entry)
    return entry
  }
  function resolveImport(spec, fromAbs) {
    const candidates = []
    if (spec.startsWith('.')) {
      const base = resolve(dirname(fromAbs), spec)
      candidates.push(`${base}.ts`, base)
    } else if (spec.startsWith('@southneuhof/api/')) {
      candidates.push(join(root, 'apps/api/src', `${spec.slice('@southneuhof/api/'.length)}.ts`))
    } else if (spec.startsWith('@/')) {
      candidates.push(join(root, 'apps/web/src', `${spec.slice(2)}.ts`))
    } else {
      return undefined
    }
    for (const candidate of candidates) if (load(candidate)) return load(candidate)
    return undefined
  }
  return { load, resolveImport }
}

function importedBinding(name, entry, index) {
  for (const imp of entry.imports) {
    const binding = imp.names.find(item => item.alias === name && !item.typeOnly)
    if (!binding) continue
    const target = index.resolveImport(imp.spec, entry.absPath)
    return { entry: target, name: binding.target, spec: imp.spec }
  }
  return undefined
}

function resolveValue(node, entry, index, seen = new Set()) {
  const target = unwrapExpr(node)
  if (!target) return undefined
  if (ts.isIdentifier(target)) {
    const key = `${entry.absPath}::${target.text}`
    if (seen.has(key)) return undefined
    seen.add(key)
    if (entry.consts.has(target.text)) return resolveValue(entry.consts.get(target.text), entry, index, seen)
    const binding = importedBinding(target.text, entry, index)
    return binding?.entry ? resolveValue(binding.entry.consts.get(binding.name), binding.entry, index, seen) : undefined
  }
  if (ts.isPropertyAccessExpression(target)) {
    const object = resolveObject(target.expression, entry, index, seen)
    const property = object?.get(target.name.text)
    return property ? { node: property.node, entry: property.entry } : undefined
  }
  return { node: target, entry }
}

function resolveObject(node, entry, index, seen = new Set()) {
  const resolved = resolveValue(node, entry, index, seen)
  if (!resolved || !ts.isObjectLiteralExpression(resolved.node)) return undefined
  return objectEntries(resolved.node, resolved.entry, index, seen)
}

function objectEntries(node, entry, index, seen = new Set()) {
  const result = new Map()
  const target = unwrapExpr(node)
  if (!target || !ts.isObjectLiteralExpression(target)) return result
  for (const property of target.properties) {
    if (ts.isSpreadAssignment(property)) {
      const spread = resolveObject(property.expression, entry, index, new Set(seen))
      for (const [key, value] of spread ?? []) result.set(key, value)
      continue
    }
    if (ts.isPropertyAssignment(property)) {
      const name = property.name
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) result.set(name.text, { node: property.initializer, entry })
      continue
    }
    if (ts.isShorthandPropertyAssignment(property)) result.set(property.name.text, { node: property.name, entry })
  }
  return result
}

function resolvedProperties(node, entry, index) {
  const resolved = resolveValue(node, entry, index)
  if (!resolved || !ts.isObjectLiteralExpression(resolved.node)) return new Map()
  return objectEntries(resolved.node, resolved.entry, index)
}

function resolvedProperty(node, name, entry, index) {
  return resolvedProperties(node, entry, index).get(name)
}

function resolvedCalleeName(node, entry, index, seen = new Set()) {
  const target = unwrapExpr(node)
  if (!target || !ts.isIdentifier(target)) return undefined
  const key = `${entry.absPath}::${target.text}`
  if (seen.has(key)) return undefined
  seen.add(key)
  const binding = importedBinding(target.text, entry, index)
  if (binding) return binding.spec === '@southneuhof/loom' ? binding.name : undefined
  const init = entry.consts.get(target.text)
  return init ? resolvedCalleeName(init, entry, index, seen) : target.text
}

const transparentWrappers = new Set(['optional', 'nullable', 'nullish', 'default', 'partial', 'min', 'max', 'int',
  'positive', 'nonnegative', 'trim', 'toLowerCase', 'toUpperCase', 'describe', 'meta', 'brand',
  'readonly', 'catch', 'prefault', 'transform', 'pipe', 'refine', 'overwrite'])

function peelCalls(node) {
  const frames = []
  while (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    frames.push({ method: node.expression.name.text, args: [...node.arguments], typeArgs: node.typeArguments ? [...node.typeArguments] : [] })
    node = node.expression.expression
  }
  return { head: node, frames }
}

function resolveNameKind(name, entry, index, seen) {
  const key = `${entry.absPath}::${name}`
  if (seen.has(key)) return { kind: 'unknown' }
  seen.add(key)
  if (entry.consts.has(name)) return zodKindOf(entry.consts.get(name), entry, index, seen)
  for (const imp of entry.imports) {
    const binding = imp.names.find(item => item.alias === name)
    if (!binding) continue
    const target = index.resolveImport(imp.spec, entry.absPath)
    if (target) return resolveNameKind(binding.target, target, index, seen)
  }
  return { kind: 'unknown' }
}

// Follows `type X = z.infer<typeof Y>` to the enum behind a `$type<X>()` column.
function resolveEnumAlias(name, entry, index, seen) {
  const alias = entry.aliases.get(name)
  if (!alias || !ts.isTypeReferenceNode(alias)) return undefined
  const args = alias.typeArguments
  if (!args?.length || !ts.isTypeQueryNode(args[0])) return undefined
  const query = args[0].exprName
  if (!ts.isIdentifier(query)) return undefined
  const info = resolveNameKind(query.text, entry, index, seen)
  return info.options ? info : undefined
}

const drizzleNumberColumns = new Set(['smallserial', 'serial', 'bigserial', 'smallint', 'integer', 'bigint', 'real', 'doublePrecision', 'numeric', 'decimal'])
const drizzleStringColumns = new Set(['text', 'varchar', 'char', 'uuid'])

function columnKindOf(node, entry, index, seen) {
  const { head, frames } = peelCalls(node)
  const typed = frames.find(frame => frame.method === '$type' && frame.typeArgs.length === 1)
  if (typed) {
    const arg = typed.typeArgs[0]
    if (ts.isTypeReferenceNode(arg) && ts.isIdentifier(arg.typeName)
      && resolveEnumAlias(arg.typeName.text, entry, index, seen)) return { kind: 'string', options: true }
  }
  if (ts.isCallExpression(head) && ts.isIdentifier(head.expression)) {
    const name = head.expression.text
    if (drizzleNumberColumns.has(name)) return { kind: 'number' }
    if (drizzleStringColumns.has(name)) return { kind: 'string' }
    if (name === 'boolean') return { kind: 'boolean' }
    if (name === 'timestamp' || name === 'date') return { kind: 'date' }
    if (name === 'json' || name === 'jsonb') return { kind: 'object' }
    if (name === 'pgEnum') return { kind: 'string', options: true }
  }
  return { kind: 'unknown' }
}

function unwrapExpr(node) {
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node))) node = node.expression
  return node
}

// Raw property initializers; callers apply zod or column kinds.
function shapeNodesOf(obj, entry, index) {
  return resolvedProperties(obj, entry, index)
}

function shapeKindOf(obj, entry, index, seen) {
  const shape = new Map()
  for (const [key, value] of shapeNodesOf(obj, entry, index)) shape.set(key, zodKindOf(value.node, value.entry, index, seen))
  return shape
}

// extend/omit accept object literals or names of const shapes.
function shapeArgOf(arg, entry, index, seen) {
  if (ts.isObjectLiteralExpression(unwrapExpr(arg))) return shapeKindOf(arg, entry, index, seen)
  const info = zodKindOf(arg, entry, index, seen)
  return info.kind === 'shape' ? new Map(info.shape) : undefined
}

function applyShapeFrames(shape, frames, entry, index, seen) {
  // Frames run outermost-first; shape edits apply innermost-first.
  for (const frame of [...frames].reverse()) {
    if (frame.method === 'extend' && frame.args.length === 1) {
      const overlay = shapeArgOf(frame.args[0], entry, index, seen)
      if (!overlay) return undefined
      for (const [key, info] of overlay) shape.set(key, info)
    } else if (frame.method === 'omit' && frame.args.length === 1) {
      const keys = shapeArgOf(frame.args[0], entry, index, seen)
      if (!keys) return undefined
      for (const key of keys.keys()) shape.delete(key)
    } else if (transparentWrappers.has(frame.method)) {
      continue
    } else {
      return undefined
    }
  }
  return shape
}

function entitySchemas(callNode, entry, index, seen) {
  const config = callNode.arguments[0]
  const schemas = propInit(config, 'schemas')
  if (!schemas) return undefined
  const result = {}
  for (const key of ['select', 'create', 'update']) {
    const init = propInit(schemas, key)
    if (init) result[key] = zodKindOf(init, entry, index, seen)
  }
  const tableInit = propInit(config, 'table')
  if (tableInit && ts.isIdentifier(tableInit)) {
    const table = resolveNameKind(tableInit.text, entry, index, seen)
    if (table.kind === 'shape') {
      for (const key of ['select', 'create', 'update']) {
        if (!result[key] || result[key].kind !== 'shape') result[key] = { kind: 'shape', shape: new Map(table.shape) }
      }
    }
  }
  return result
}

function arrayKindOf(args, entry, index, seen) {
  if (!args.length) return { kind: 'array' }
  const element = zodKindOf(args[0], entry, index, seen)
  if (element.kind === 'shape') return { kind: 'object[]' }
  if (element.kind === 'string') return { kind: 'string[]' }
  if (element.kind === 'number') return { kind: 'number[]' }
  if (element.kind === 'boolean') return { kind: 'boolean[]' }
  return { kind: 'array' }
}

function zodKindOf(node, entry, index, seen) {
  if (ts.isIdentifier(node)) return resolveNameKind(node.text, entry, index, seen)
  if (ts.isPropertyAccessExpression(node)) {
    // Handles `name.schemas.select` entity references.
    if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'schemas'
      && ts.isIdentifier(node.expression.expression)
      && ['select', 'create', 'update'].includes(node.name.text)) {
      const schemas = resolveNameKind(node.expression.expression.text, entry, index, seen)
      if (schemas?.entity && schemas.entity[node.name.text]) return schemas.entity[node.name.text]
    }
    return { kind: 'unknown' }
  }
  if (!ts.isCallExpression(node)) return { kind: 'unknown' }
  const { head, frames } = peelCalls(node)
  if (ts.isIdentifier(head) && head.text === 'z') {
    const inner = frames[frames.length - 1]
    if (!inner) return { kind: 'unknown' }
    if (inner.method === 'string') return { kind: 'string' }
    if (inner.method === 'number') return { kind: 'number' }
    if (inner.method === 'boolean') return { kind: 'boolean' }
    if (inner.method === 'date') return { kind: 'date' }
    if (inner.method === 'enum') return { kind: 'string', options: true }
    if (inner.method === 'object' && inner.args.length === 1) {
      return { kind: 'shape', shape: shapeKindOf(inner.args[0], entry, index, seen) }
    }
    if (inner.method === 'array') return arrayKindOf(inner.args, entry, index, seen)
    return { kind: 'unknown' }
  }
  if (ts.isCallExpression(head) && ts.isIdentifier(head.expression)) {
    const name = head.expression.text
    if (/^checkedHono(?:Record|Create|Update|Query)Schema$/.test(name) && head.arguments.length >= 2) {
      return zodKindOf(head.arguments[head.arguments.length - 1], entry, index, seen)
    }
    if ((name === 'createSelectSchema' || name === 'createInsertSchema' || name === 'createUpdateSchema')
      && head.arguments.length >= 1 && ts.isIdentifier(head.arguments[0])) {
      const table = resolveNameKind(head.arguments[0].text, entry, index, seen)
      if (!table || table.kind !== 'shape') return { kind: 'unknown' }
      const shape = applyShapeFrames(new Map(table.shape), frames, entry, index, seen)
      return shape ? { kind: 'shape', shape } : { kind: 'unknown' }
    }
    if (name === 'createEntity' && head.arguments.length >= 1) {
      const schemas = entitySchemas(head, entry, index, seen)
      return schemas ? { kind: 'entity', entity: schemas } : { kind: 'unknown' }
    }
    if (name === 'pgTable' && head.arguments.length >= 2) {
      const columns = new Map()
      for (const [key, value] of shapeNodesOf(head.arguments[1], entry, index)) columns.set(key, columnKindOf(value.node, value.entry, index, seen))
      const shape = applyShapeFrames(columns, frames, entry, index, seen)
      return shape ? { kind: 'shape', shape } : { kind: 'unknown' }
    }
  }
  if (head === node) return { kind: 'unknown' }
  const base = zodKindOf(head, entry, index, seen)
  if (base.kind === 'shape') {
    const shape = applyShapeFrames(new Map(base.shape), frames, entry, index, seen)
    return shape ? { kind: 'shape', shape } : { kind: 'unknown' }
  }
  if (frames.every(frame => transparentWrappers.has(frame.method))) return base
  return { kind: 'unknown' }
}
function eachCall(source, name, entry, index) {
  const found = []
  function visit(node) {
    if (ts.isCallExpression(node) && (entry && index
      ? resolvedCalleeName(node.expression, entry, index) === name
      : ts.isIdentifier(node.expression) && node.expression.text === name)) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function schemaShapeOf(node, entry, index) {
  if (!node) return undefined
  const info = zodKindOf(node, entry, index, new Set())
  return info.kind === 'shape' ? info.shape : undefined
}

function surfaceKind(kind, schemaKind) {
  if (schemaKind?.kind === 'shape') return { kind: 'object' }
  if (schemaKind?.kind === 'array' || /\[\]$/.test(schemaKind?.kind ?? '')) return { kind: 'array' }
  if (schemaKind?.kind === 'entity' || schemaKind?.kind === 'columns') return { kind: 'unknown' }
  if (schemaKind) return schemaKind
  if (kind === 'form') return { kind: 'unknown' }
  return { kind: 'unknown' }
}

function displaySignals(node, entry, index) {
  const fields = resolvedProperties(node, entry, index)
  const configured = name => {
    const value = fields.get(name)?.node
    if (!value || value.kind === ts.SyntaxKind.UndefinedKeyword) return false
    return !(ts.isIdentifier(value) && value.text === 'undefined')
  }
  return { read: configured('read'), renderer: configured('renderer'), format: configured('format') }
}

function readPaths(node, entry, index) {
  const read = resolvedProperty(node, 'read', entry, index)
  const value = read ? resolveValue(read.node, read.entry, index) : undefined
  const fn = value?.node
  if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn))) return []
  const parameter = fn.parameters[0]?.name
  if (!parameter) return []
  if (ts.isObjectBindingPattern(parameter)) {
    return parameter.elements.flatMap(element => {
      const key = element.propertyName ?? element.name
      return ts.isIdentifier(key) ? [[key.text]] : []
    })
  }
  if (!ts.isIdentifier(parameter)) return []
  const paths = new Map()
  function pathFrom(current) {
    const target = unwrapExpr(current)
    if (ts.isIdentifier(target) && target.text === parameter.text) return []
    if (ts.isPropertyAccessExpression(target)) {
      const parent = pathFrom(target.expression)
      return parent ? [...parent, target.name.text] : undefined
    }
    if (ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression)) {
      const parent = pathFrom(target.expression)
      return parent ? [...parent, target.argumentExpression.text] : undefined
    }
    return undefined
  }
  function visit(current) {
    if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
      const path = pathFrom(current)
      if (path?.length) paths.set(path.join('.'), path)
    }
    ts.forEachChild(current, visit)
  }
  if (fn.body) visit(fn.body)
  return [...paths.values()]
}

function missingReadPath(path, shape) {
  let current = shape
  for (const key of path) {
    const info = current?.get(key)
    if (!info) return key
    current = info.kind === 'shape' ? info.shape : undefined
  }
  return undefined
}

function entryLine(item) {
  const entry = item?.entry
  const node = item?.node
  if (!entry || !node) return 1
  return ts.getLineAndCharacterOfPosition(entry.source, node.getStart(entry.source)).line + 1
}

function surfaceDefinitions(entry, index) {
  const definitions = []
  for (const name of ['defineTable', 'defineDetail', 'defineForm']) {
    for (const call of eachCall(entry.source, name, entry, index)) {
      const config = call.arguments[0]
      const kind = name === 'defineTable' ? 'table' : name === 'defineDetail' ? 'detail' : 'form'
      const key = kind === 'table' ? 'columns' : 'fields'
      const schema = resolvedProperty(config, 'schema', entry, index)
      const map = resolvedProperty(config, key, entry, index)
      const schemaShape = schema ? schemaShapeOf(schema.node, schema.entry, index) : undefined
      const members = map ? resolvedProperties(map.node, map.entry, index) : new Map()
      definitions.push({ kind, schemaShape, members, map, call })
    }
  }
  return definitions
}

export function checkResourceDisplay(files, { root = process.cwd(), read = absPath => readFileSync(absPath, 'utf8') } = {}) {
  const errors = []
  const review = []
  const index = makeFileIndex(root, read)
  for (const file of files) {
    const entry = index.load(resolve(root, file))
    if (!entry) {
      review.push(`${file}: cannot parse resource for surface check`)
      continue
    }
    for (const definition of surfaceDefinitions(entry, index)) {
      for (const [key, field] of definition.members) {
        const signals = displaySignals(field.node, field.entry, index)
        if (definition.kind === 'form') {
          if (definition.schemaShape && !definition.schemaShape.has(key)) {
            errors.push(`${file}:${entryLine(field)}: form surface field '${key}' is missing from its schema`)
          }
          continue
        }
        if (definition.schemaShape && !definition.schemaShape.has(key) && !signals.read) {
          errors.push(`${file}:${entryLine(field)}: ${definition.kind} surface field '${key}' is missing from its schema or a read accessor`)
          continue
        }
        if (definition.schemaShape && signals.read) {
          for (const path of readPaths(field.node, field.entry, index)) {
            const missing = missingReadPath(path, definition.schemaShape)
            if (missing) errors.push(`${file}:${entryLine(field)}: ${definition.kind} read accessor for '${key}' uses '${missing}', which is missing from its schema`)
          }
        }
        if (definition.kind === 'form') continue
        const schemaKind = definition.schemaShape?.get(key)
        const kindInfo = surfaceKind(definition.kind, schemaKind)
        if (fieldNeedsDisplay(kindInfo, signals)) {
          review.push(`${file}:${entryLine(field)}: ${key} (${displayKindLabel(kindInfo)}, ${definition.kind}) needs explicit display`)
        }
      }
    }
  }
  return { errors, review }
}

// Row-op sync (plan 049). Static mirror of plans 047 and 048: permission
// decides role access; the row allowedOperations array decides this-row
// access when present; omission hides by design; list and create never gate
// by row. When a resource declares a detail, update, or delete action with a
// route (delete has no route option, so any delete declaration counts), or a
// custom action consumed as a row control (a `.can(`/`.run(` call carrying a
// trailing `{ record }` context in a Vue source), its row enum must be able
// to carry that op name. A missing enum means permission-only rows, so the
// check passes. A list-only resource (no detail declaration) and a
// collection-only custom action (never called with a row) pass. Results are
// review-only: intentional per-row omission stays legal, the author resolves
// the warning explicitly.
const standardRowOps = new Set(['detail', 'update', 'delete'])

function parseResourceActions(entry, index) {
  const found = []
  for (const call of eachCall(entry.source, 'defineResource', entry, index)) {
    const config = call.arguments[0]
    const props = resolvedProperties(config, entry, index)
    const keyValue = props.get('key')
    const key = stringValue(unwrapExpr(keyValue?.node)) ?? 'unknown'
    const add = (name, item) => {
      const operation = resolvedProperties(item.node, item.entry, index)
      const line = entryLine(item)
      found.push({ key, name, hasRoute: operation.has('route'), line, declared: operation.size > 0 })
    }
    for (const name of ['list', 'create', 'detail', 'update', 'delete']) {
      const operation = props.get(name)
      if (operation) add(name, operation)
    }
    const actions = props.get('actions')
    for (const [name, action] of resolvedProperties(actions?.node, actions?.entry, index)) add(name, action)
  }
  return found
}

function enumStringsOf(node, out) {
  function visit(current) {
    if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)
      && current.expression.name.text === 'enum' && current.arguments.length >= 1
      && ts.isArrayLiteralExpression(unwrapExpr(current.arguments[0]))) {
      for (const el of unwrapExpr(current.arguments[0]).elements) {
        const text = stringValue(unwrapExpr(el))
        if (text !== undefined) out.add(text)
      }
    }
    ts.forEachChild(current, visit)
  }
  visit(node)
}

function rowOpsIn(entry, index, seen) {
  const values = new Set()
  const stack = [entry]
  while (stack.length) {
    const current = stack.pop()
    if (!current || seen.has(current.absPath)) continue
    seen.add(current.absPath)
    function visit(node) {
      if (ts.isPropertyAssignment(node) && ((ts.isIdentifier(node.name) && node.name.text === 'allowedOperations')
        || (ts.isStringLiteral(node.name) && node.name.text === 'allowedOperations'))) {
        enumStringsOf(node.initializer, values)
      }
      ts.forEachChild(node, visit)
    }
    visit(current.source)
    for (const imp of current.imports) {
      const target = index.resolveImport(imp.spec, current.absPath)
      if (target && !seen.has(target.absPath)) stack.push(target)
      // Follow one more hop: schema files import the entity holding the enum.
      if (target) {
        for (const nested of target.imports) {
          const resolved = index.resolveImport(nested.spec, target.absPath)
          if (resolved && !seen.has(resolved.absPath)) stack.push(resolved)
        }
      }
    }
  }
  return values
}

function rowUsedCustomNames(vueContents) {
  const used = new Set()
  for (const content of vueContents) {
    const pattern = /\.actions\.([A-Za-z_]\w*)\.(can|run)\s*\(/g
    let match
    while ((match = pattern.exec(content)) !== null) {
      const after = content.slice(match.index, match.index + 600)
      // A trailing `{ record }` (or `{ record:`) context marks a row call.
      // Collection calls carry only domain inputs, never a record context.
      if (/\{\s*record[\s,:}]/m.test(after)) used.add(match[1])
    }
  }
  return used
}

export function checkResourceRowOps(files, { root = process.cwd(), read = absPath => readFileSync(absPath, 'utf8'), vueContents = [] } = {}) {
  const review = []
  const index = makeFileIndex(root, read)
  const rowUsed = rowUsedCustomNames(vueContents)
  for (const file of files) {
    const abs = resolve(root, file)
    const entry = index.load(abs)
    if (!entry) {
      review.push(`${file}: cannot parse resource for row-op check`)
      continue
    }
    const declared = parseResourceActions(entry, index)
    if (!declared.length) continue
    const key = declared[0].key
    const byName = new Map(declared.map(item => [item.name, item]))
    const wanted = []
    for (const name of ['detail', 'update']) {
      const item = byName.get(name)
      if (item && item.hasRoute) wanted.push(item)
    }
    const deleted = byName.get('delete')
    if (deleted && deleted.declared) wanted.push({ ...deleted, name: 'delete' })
    for (const item of declared) {
      if (standardRowOps.has(item.name)) continue
      if (rowUsed.has(item.name)) wanted.push(item)
    }
    if (!wanted.length) continue
    const values = rowOpsIn(entry, index, new Set())
    // No allowedOperations enum reachable: permission-only rows fall back to
    // permission per plan 047, so the sync check passes.
    if (!values.size) continue
    for (const item of wanted) {
      if (!values.has(item.name)) {
        review.push(`${file}:${item.line}: ${key} declares ${item.name} but row allowedOperations cannot carry '${item.name}' (add '${item.name}' to the row enum or mark list-only/collection-only)`)
      }
    }
  }
  return review
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2] || process.argv[2] === '--help') {
    console.log('Usage: node scripts/module-ui-check.mjs --sources <Vue/resource file or directory>...\n       node scripts/module-ui-check.mjs <ui-contract.json> [repository-root]\nSource mode checks bindings, surface membership, display requirements, and native controls. Contract mode also checks declared composition. Review design, fields, globals and dynamic components in source.')
    process.exitCode = process.argv[2] ? 0 : 1
  } else {
    try {
      const result = process.argv[2] === '--sources'
        ? checkUiSources(process.argv.slice(3))
        : checkUiContract(JSON.parse(readFileSync(process.argv[2], 'utf8')), { root: resolve(process.argv[3] ?? '.') })
      for (const error of result.errors) console.error(`FAIL: ${error}`)
      for (const item of result.review) console.log(`REVIEW: ${item}`)
      if (!result.errors.length) console.log(result.review.length ? 'REVIEW_REQUIRED: resolve each exception in the acceptance review' : 'PASS: selected template checks; design, runtime and acceptance NOT_REVIEWED')
      process.exitCode = result.errors.length ? 1 : result.review.length ? 2 : 0
    } catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1 }
  }
}

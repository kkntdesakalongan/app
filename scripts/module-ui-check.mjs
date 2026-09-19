#!/usr/bin/env node
// Check declared Vue surfaces. Semantic acceptance remains with the reviewer.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
  for (const item of checkResourceDisplay(resourceFiles, { root })) result.review.push(item)
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

// Visible-field display risk (plan 045). Static mirror of
// requiresExplicitDisplay in packages/loom/src/fields/displayRequirement.ts:
// plain strings keep the default text; numbers, booleans, and dates accept
// format, renderer, or read; enums, selections, objects, arrays, and lookups
// need read or renderer. A plain-node share is impractical, so the agreement
// test in scripts/module-ui-check.test.mjs runs both functions over every
// InternalSchemaKind plus source-present rows. Update all three together.
const displayKindByFormRenderer = {
  text: 'string',
  number: 'number',
  currency: 'number',
  switch: 'boolean',
  date: 'date',
  datetime: 'date',
  select: 'selection[]',
  lookup: 'selection[]',
  table: 'array',
}

export function fieldNeedsDisplay(kindInfo, signals) {
  const kind = kindInfo?.kind ?? 'unknown'
  if (signals.source) return !(signals.read || signals.renderer)
  if (kind === 'unknown') return false
  const readOrRenderer = signals.read || signals.renderer
  if (kind === 'string' || kind === 'string[]') return !!kindInfo.options && !readOrRenderer
  if (kind === 'selection[]') return !readOrRenderer
  if (kind === 'number' || kind === 'boolean' || kind === 'date'
    || kind === 'number[]' || kind === 'boolean[]') return !(readOrRenderer || signals.format)
  return !readOrRenderer
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

function isFalseKeyword(node) {
  return !!node && node.kind === ts.SyntaxKind.FalseKeyword
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
        } else if (ts.isTypeAliasDeclaration(stmt) && ts.isIdentifier(stmt.name)) {
          entry.aliases.set(stmt.name.text, stmt.type)
        } else if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
          const names = []
          const clause = stmt.importClause
          if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) names.push({ alias: el.name.text, target: (el.propertyName ?? el.name).text })
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
    } else {
      return undefined
    }
    for (const candidate of candidates) if (load(candidate)) return load(candidate)
    return undefined
  }
  return { load, resolveImport }
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
function shapeNodesOf(obj) {
  const shape = new Map()
  const target = unwrapExpr(obj)
  if (!target || !ts.isObjectLiteralExpression(target)) return shape
  for (const prop of target.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    const name = prop.name
    if (!ts.isIdentifier(name) && !ts.isStringLiteral(name)) continue
    shape.set(name.text, prop.initializer)
  }
  return shape
}

function shapeKindOf(obj, entry, index, seen) {
  const shape = new Map()
  for (const [key, init] of shapeNodesOf(obj)) shape.set(key, zodKindOf(init, entry, index, seen))
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
      for (const [key, init] of shapeNodesOf(head.arguments[1])) columns.set(key, columnKindOf(init, entry, index, seen))
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
function eachCall(source, name) {
  const found = []
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function projectionSignals(obj) {
  const target = unwrapExpr(obj)
  if (!target || !ts.isObjectLiteralExpression(target)) return { read: false, renderer: false, format: false }
  return {
    read: propInit(target, 'read') !== undefined,
    renderer: propInit(target, 'renderer') !== undefined,
    format: propInit(target, 'format') !== undefined,
  }
}

function parseFieldProp(prop, source) {
  const name = prop.name
  if (!ts.isIdentifier(name) && !ts.isStringLiteral(name)) return undefined
  const init = unwrapExpr(prop.initializer)
  const parsed = {
    key: name.text,
    line: ts.getLineAndCharacterOfPosition(source, prop.name.getStart(source)).line + 1,
    display: { read: false, renderer: false, format: false },
    table: { read: false, renderer: false, format: false },
    detail: { read: false, renderer: false, format: false },
    tableFalse: false,
    detailFalse: false,
    formRenderer: undefined,
    formSource: false,
    rowFields: undefined,
  }
  if (!init || !ts.isObjectLiteralExpression(init)) return parsed
  const display = propInit(init, 'display')
  const table = propInit(init, 'table')
  const detail = propInit(init, 'detail')
  parsed.display = projectionSignals(display)
  parsed.table = projectionSignals(table)
  parsed.detail = projectionSignals(detail)
  parsed.tableFalse = isFalseKeyword(table)
  parsed.detailFalse = isFalseKeyword(detail)
  const form = unwrapExpr(propInit(init, 'form'))
  if (form && ts.isObjectLiteralExpression(form)) {
    parsed.formRenderer = stringValue(propInit(form, 'renderer'))
    parsed.formSource = propInit(form, 'source') !== undefined
    const props = unwrapExpr(propInit(form, 'props'))
    const rowInit = props ? propInit(props, 'fields') : undefined
    if (rowInit && ts.isIdentifier(rowInit)) parsed.rowFields = rowInit.text
  }
  return parsed
}

function parseResourceFile(entry) {
  const fields = new Map()
  let schemaName
  for (const call of eachCall(entry.source, 'defineFields')) {
    if (!schemaName && call.arguments.length >= 1 && ts.isIdentifier(call.arguments[0])) schemaName = call.arguments[0].text
    const catalog = unwrapExpr(call.arguments[1])
    if (!catalog || !ts.isObjectLiteralExpression(catalog)) continue
    for (const prop of catalog.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const parsed = parseFieldProp(prop, entry.source)
      if (parsed) fields.set(parsed.key, parsed)
    }
  }
  const actionFields = { list: [], detail: [] }
  for (const call of eachCall(entry.source, 'defineResource')) {
    const config = unwrapExpr(call.arguments[1])
    const actions = config ? propInit(config, 'actions') : undefined
    for (const surface of ['list', 'detail']) {
      const action = actions ? unwrapExpr(propInit(actions, surface)) : undefined
      const list = action && ts.isObjectLiteralExpression(action) ? unwrapExpr(propInit(action, 'fields')) : undefined
      if (!list || !ts.isArrayLiteralExpression(list)) continue
      for (const el of list.elements) {
        if (ts.isPropertyAccessExpression(el) && ts.isIdentifier(el.expression)
          && el.expression.text === 'fields' && ts.isIdentifier(el.name)
          && !actionFields[surface].includes(el.name.text)) actionFields[surface].push(el.name.text)
      }
    }
  }
  return { fields, actionFields, schemaName }
}

function resolveImportedEntry(name, entry, index) {
  if (entry.consts.has(name)) return entry
  for (const imp of entry.imports) {
    const binding = imp.names.find(item => item.alias === name)
    if (!binding) continue
    const target = index.resolveImport(imp.spec, entry.absPath)
    if (target && (target.consts.has(binding.target) || target.aliases.has(binding.target))) return target
  }
  return undefined
}

function asShape(info) {
  return info && info.kind === 'shape' ? info : undefined
}

// Merges record, form, and inferred shapes for one resource. Record shapes
// win; every source is best-effort and unknown keys stay silent.
function schemaPoolFor(schemaEntry, index) {
  const pool = new Map()
  const addShape = (info) => {
    if (!asShape(info)) return
    for (const [key, value] of info.shape) if (!pool.has(key)) pool.set(key, value)
  }
  for (const call of eachCall(schemaEntry.source, 'defineSchema')) {
    const config = unwrapExpr(call.arguments[call.arguments.length - 1])
    for (const key of ['record', 'create', 'update']) {
      const init = config ? propInit(config, key) : undefined
      if (init) addShape(zodKindOf(init, schemaEntry, index, new Set()))
    }
  }
  const queries = []
  function visit(node) {
    if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) queries.push(node.exprName.text)
    ts.forEachChild(node, visit)
  }
  visit(schemaEntry.source)
  for (const name of queries) addShape(asShape(resolveNameKind(name, schemaEntry, index, new Set())))
  for (const [name, init] of schemaEntry.consts) {
    if (!/form|input|write|create|update|schema/i.test(name)) continue
    addShape(asShape(zodKindOf(init, schemaEntry, index, new Set())))
  }
  return pool
}

function normalizeKind(info) {
  if (!info) return { kind: 'unknown' }
  if (info.kind === 'shape') return { kind: 'object' }
  if (info.kind === 'entity' || info.kind === 'columns') return { kind: 'unknown' }
  return info
}

function effectiveKind(schemaInfo, formRenderer) {
  const schema = normalizeKind(schemaInfo)
  if (schema.kind !== 'unknown') return schema
  const rendered = formRenderer ? displayKindByFormRenderer[formRenderer] : undefined
  return rendered ? { kind: rendered } : { kind: 'unknown' }
}

function parseRowFields(entry, ident) {
  const obj = unwrapExpr(entry.consts.get(ident))
  if (!obj || !ts.isObjectLiteralExpression(obj)) return []
  const rows = []
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    const parsed = parseFieldProp(prop, entry.source)
    if (parsed) rows.push(parsed)
  }
  return rows
}

function displayHint(kindInfo, signals) {
  if (signals.source || kindInfo.kind === 'object' || kindInfo.kind === 'array' || kindInfo.kind === 'object[]') {
    return 'add display read or renderer'
  }
  return 'add display format, renderer, or read'
}

export function checkResourceDisplay(files, { root = process.cwd(), read = absPath => readFileSync(absPath, 'utf8') } = {}) {
  const review = []
  const index = makeFileIndex(root, read)
  for (const file of files) {
    const abs = resolve(root, file)
    const entry = index.load(abs)
    if (!entry) {
      review.push(`${file}: cannot parse resource for display check`)
      continue
    }
    const { fields, actionFields, schemaName } = parseResourceFile(entry)
    let pool = new Map()
    if (schemaName) {
      const schemaEntry = resolveImportedEntry(schemaName, entry, index)
      if (schemaEntry) pool = schemaPoolFor(schemaEntry, index)
    }
    for (const [surface, keys, projection] of [['list', actionFields.list, 'table'], ['detail', actionFields.detail, 'detail']]) {
      for (const key of keys) {
        const field = fields.get(key)
        if (!field) continue
        if (projection === 'table' && field.tableFalse) continue
        if (projection === 'detail' && field.detailFalse) continue
        const signals = {
          read: field.display.read || field[projection].read,
          renderer: field.display.renderer || field[projection].renderer,
          format: field.display.format || field[projection].format,
          source: field.formSource,
        }
        const kindInfo = effectiveKind(pool.get(key), field.formRenderer)
        if (fieldNeedsDisplay(kindInfo, signals)) {
          review.push(`${file}:${field.line}: ${key} (${displayKindLabel(kindInfo)}, ${surface}) needs explicit display (${displayHint(kindInfo, signals)})`)
        }
      }
    }
    for (const field of fields.values()) {
      if (!field.rowFields) continue
      for (const row of parseRowFields(entry, field.rowFields)) {
        const signals = {
          read: row.display.read,
          renderer: row.display.renderer,
          format: row.display.format,
          source: row.formSource,
        }
        const kindInfo = effectiveKind(undefined, row.formRenderer)
        if (fieldNeedsDisplay(kindInfo, signals)) {
          review.push(`${file}:${row.line}: ${row.key} (${displayKindLabel(kindInfo)}, row) needs explicit display (${displayHint(kindInfo, signals)})`)
        }
      }
    }
  }
  return review
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2] || process.argv[2] === '--help') {
    console.log('Usage: node scripts/module-ui-check.mjs --sources <Vue/resource file or directory>...\n       node scripts/module-ui-check.mjs <ui-contract.json> [repository-root]\nSource mode checks bindings, native controls, and field display risk. Contract mode also checks declared composition. Review design, fields, globals and dynamic components in source.')
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

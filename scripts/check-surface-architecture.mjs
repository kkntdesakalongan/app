import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { boundedConfig } from './test-support/bounded-fixture.mjs'
import { scaffold } from './scaffold-bounded-module.mjs'

const requireFromLoom = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../packages/loom/package.json'))
const ts = requireFromLoom('typescript')
const vueSfc = requireFromLoom('vue/compiler-sfc')
const requireFromVueCompiler = createRequire(requireFromLoom.resolve('vue/compiler-sfc'))
const vueDom = requireFromVueCompiler('@vue/compiler-dom')
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'])
const sourceRoots = ['packages/loom/src', 'apps/web/src', 'scripts', '.agents/skills']
const markdownRoots = ['README.md', 'AGENTS.md', 'DESIGN.md', 'apps/web/README.md', 'packages/loom/README.md', 'docs/resource_system_overhaul/ARCHITECTURE.md', 'docs/ui', 'docs/architecture', '.agents/skills']
const skippedDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage'])
const removedNames = new Set([
  'ActionResource',
  'ActionableControl',
  'AppResourceContract',
  'ControlPlacement',
  'CoreTextRenderer',
  'FieldsInput',
  'FieldCatalog',
  'FieldDefinition',
  'FieldDetail',
  'FieldDisplay',
  'FieldForm',
  'FieldLayer',
  'FieldOverride',
  'FieldProjection',
  'FieldReference',
  'FieldTable',
  'FrameworkDefaultsInput',
  'FrameworkRuntime',
  'InputConfig',
  'InputPropsAdapter',
  'InputPropsRegistry',
  'ModelConfig',
  'ResourceActionField',
  'ResourceActionFields',
  'ResourceCapabilities',
  'ResourceRendererOverrides',
  'ResourceRendererSurface',
  'ResolvedField',
  'ResolvedSurfaceField',
  'SchemaAdapter',
  'WebResourceSchema',
  'appFieldDefaults',
  'appInputProps',
  'adaptVModelInput',
  'controlledInput',
  'createInputPropsRegistry',
  'createBehaviorRuntime',
  'defineSchema',
  'defineFields',
  'fromZod',
  'inferredRenderers',
  'readField',
  'readFields',
  'resolveFields',
  'toCatalog',
])
const removedModulePattern = /(?:^|\/)(?:fields|validation)(?:\/|$)|(?:^|\/)actionResource(?:\.[^/]*)?$/
const componentPropRules = new Map([
  ['Form', new Set(['form', 'formProps', 'run'])],
  ['DialogForm', new Set(['form', 'formProps', 'run'])],
  ['FormView', new Set(['schema', 'fields', 'submit', 'run', 'formProps', 'modelValue', 'load'])],
  ['ListView', new Set(['fields', 'columns', 'schema', 'load', 'data', 'query', 'formProps'])],
  ['DetailView', new Set(['fields', 'schema', 'data', 'formProps'])],
  ['Table', new Set(['fields'])],
  ['TreeTable', new Set(['fields'])],
  ['TableInput', new Set(['fields'])],
  ['LookupInput', new Set(['fields'])],
  ['FileInput', new Set(['upload', 'toModel', 'imageURLResolver'])],
  ['ImageInput', new Set(['upload', 'toModel', 'imageURLResolver'])],
])
const forbiddenPaths = [
  'packages/loom/src/fields',
  'packages/loom/src/validation',
  'packages/loom/src/contracts/fields.ts',
  'packages/loom/src/contracts/validation.ts',
  'packages/loom/src/resources/actionResource.ts',
  'apps/web/src/framework/fields',
  'apps/web/src/configs/defaults.ts',
]

function diagnostic(file, line, message) {
  return `${file}:${line}: ${message}`
}

function lineAt(sourceFile, position, lineOffset) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + lineOffset + 1
}

function modulePathIsRemoved(modulePath) {
  return removedModulePattern.test(modulePath.replaceAll('\\', '/'))
}

function isResourceModule(modulePath) {
  return /(?:^|\/)[^/]+\.resource(?:\.[cm]?[jt]sx?)?$/.test(modulePath.replaceAll('\\', '/'))
}

function moduleName(node) {
  return ts.isStringLiteralLike(node) ? node.text : undefined
}

function isExpectedNegativeArity(sourceFile, node, file) {
  if (!file.includes('__type-tests__/')) return false
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line
  const lines = sourceFile.text.split(/\r?\n/)
  return lines.slice(Math.max(0, startLine - 2), startLine).some((line) => /@ts-expect-error/.test(line))
}

function isExpectedNegativeImport(sourceFile, node, file) {
  if (!file.includes('__type-tests__/')) return false
  let statement = node
  while (statement && !ts.isImportDeclaration(statement)) statement = statement.parent
  if (!statement?.importClause?.isTypeOnly) return false
  const startLine = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line
  const lines = sourceFile.text.split(/\r?\n/)
  return lines.slice(Math.max(0, startLine - 2), startLine).some((line) => /@ts-expect-error/.test(line))
}

function isRemovedApiReference(node) {
  const parent = node.parent
  if (ts.isImportSpecifier(parent)) {
    return parent.name === node || parent.propertyName === node
  }
  if (ts.isExportSpecifier(parent)) {
    return parent.name === node || parent.propertyName === node
  }
  if (ts.isImportClause(parent) && parent.name === node) return true
  if (ts.isTypeReferenceNode(parent) && parent.typeName === node) return true
  if (ts.isCallExpression(parent) && unwrapExpression(parent.expression) === node) return true
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true
  if (ts.isFunctionDeclaration(parent) && parent.name === node) return true
  if (ts.isClassDeclaration(parent) && parent.name === node) return true
  if (ts.isInterfaceDeclaration(parent) && parent.name === node) return true
  if (ts.isTypeAliasDeclaration(parent) && parent.name === node) return true
  if (ts.isVariableDeclaration(parent) && parent.name === node && ts.isVariableStatement(parent.parent.parent)) {
    return parent.parent.parent.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
  }
  return false
}

function unwrapExpression(node) {
  let current = node
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) current = current.expression
  return current
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text
  return undefined
}

function objectMemberName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text
  return undefined
}

function analyzeTypeScript(source, file, lineOffset = 0) {
  const diagnostics = []
  const kind = file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind)
  const defineResourceAliases = new Set(['defineResource'])
  const defineFormAliases = new Set(['defineForm'])
  const namespaceAliases = new Set()

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const path = moduleName(statement.moduleSpecifier)
      if (path && modulePathIsRemoved(path)) diagnostics.push(diagnostic(file, lineAt(sourceFile, statement.getStart(sourceFile), lineOffset), `import uses removed module path "${path}"`))
      const bindings = statement.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings)) {
        for (const specifier of bindings.elements) {
          const imported = specifier.propertyName?.text ?? specifier.name.text
          if (imported === 'defineResource') defineResourceAliases.add(specifier.name.text)
          if (imported === 'defineForm') defineFormAliases.add(specifier.name.text)
        }
      }
      if (bindings && ts.isNamespaceImport(bindings)) namespaceAliases.add(bindings.name.text)
    }
    if (ts.isExportDeclaration(statement)) {
      const path = statement.moduleSpecifier && moduleName(statement.moduleSpecifier)
      if (path && modulePathIsRemoved(path)) diagnostics.push(diagnostic(file, lineAt(sourceFile, statement.getStart(sourceFile), lineOffset), `export uses removed module path "${path}"`))
    }
  }

  const variableInitializers = new Map()
  function collectVariableInitializers(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      variableInitializers.set(node.name.text, node.initializer)
    }
    ts.forEachChild(node, collectVariableInitializers)
  }
  collectVariableInitializers(sourceFile)
  function collectFunctionAliases(aliases, name) {
    let changed = true
    while (changed) {
      changed = false
      for (const [alias, initializer] of variableInitializers) {
        const value = unwrapExpression(initializer)
        const direct = ts.isIdentifier(value) && aliases.has(value.text)
        const namespaced = ts.isPropertyAccessExpression(value)
          && value.name.text === name
          && ts.isIdentifier(value.expression)
          && namespaceAliases.has(value.expression.text)
        if ((direct || namespaced) && !aliases.has(alias)) {
          aliases.add(alias)
          changed = true
        }
      }
    }
  }
  collectFunctionAliases(defineResourceAliases, 'defineResource')
  collectFunctionAliases(defineFormAliases, 'defineForm')

  function isDefineResourceCall(node) {
    const expression = unwrapExpression(node.expression)
    if (ts.isIdentifier(expression)) return defineResourceAliases.has(expression.text)
    return ts.isPropertyAccessExpression(expression)
      && expression.name.text === 'defineResource'
      && ts.isIdentifier(expression.expression)
      && namespaceAliases.has(expression.expression.text)
  }

  const scopeParents = new Map()
  const scopeBindings = new Map()
  const nodeScopes = new WeakMap()
  const functionScopes = new Set()

  function isScope(node) {
    return ts.isSourceFile(node)
      || ts.isBlock(node)
      || ts.isFunctionLike(node)
      || ts.isCatchClause(node)
      || ts.isForStatement(node)
      || ts.isForInStatement(node)
      || ts.isForOfStatement(node)
  }

  function declare(scope, name, initializer, status) {
    const bindings = scopeBindings.get(scope)
    if (bindings && !bindings.has(name)) bindings.set(name, { initializer, scope, status })
  }

  function bindingNames(name, result = []) {
    if (ts.isIdentifier(name)) result.push(name.text)
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) if (ts.isBindingElement(element)) bindingNames(element.name, result)
    }
    return result
  }

  function collectBindings(node, inheritedScope) {
    let scope = inheritedScope
    if (isScope(node)) {
      scopeParents.set(node, inheritedScope)
      scopeBindings.set(node, new Map())
      scope = node
      if (ts.isFunctionLike(node)) functionScopes.add(node)
    }
    nodeScopes.set(node, scope)
    if (ts.isFunctionLike(node)) {
      for (const parameter of node.parameters) for (const name of bindingNames(parameter.name)) declare(node, name, undefined)
    }
    if (ts.isVariableDeclaration(node)) {
      let bindingScope = scope
      const declarationList = node.parent
      if (ts.isVariableDeclarationList(declarationList) && !(declarationList.flags & ts.NodeFlags.BlockScoped)) {
        while (bindingScope && !functionScopes.has(bindingScope) && !ts.isSourceFile(bindingScope)) bindingScope = scopeParents.get(bindingScope)
      }
      if (bindingScope) for (const name of bindingNames(node.name)) declare(bindingScope, name, node.initializer)
    }
    ts.forEachChild(node, (child) => collectBindings(child, scope))
  }
  collectBindings(sourceFile)

  if (!/(?:__tests__|\.spec\.|__type-tests__)/.test(file)) {
    const initializers = new Map()
    function collectInitializers(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        initializers.set(node.name.text, node.initializer)
      }
      ts.forEachChild(node, collectInitializers)
    }
    collectInitializers(sourceFile)

    function resolveObject(expression, seen = new Set()) {
      const value = unwrapExpression(expression)
      if (ts.isObjectLiteralExpression(value)) return value
      if (!ts.isIdentifier(value) || seen.has(value.text)) return undefined
      const initializer = initializers.get(value.text)
      if (!initializer) return undefined
      seen.add(value.text)
      return resolveObject(initializer, seen)
    }

    function objectMembers(expression, seen = new Set()) {
      const value = unwrapExpression(expression)
      if (ts.isIdentifier(value)) {
        if (seen.has(value.text)) return new Map()
        seen.add(value.text)
      }
      const object = resolveObject(value)
      if (!object) return new Map()
      const values = new Map()
      for (const member of object.properties) {
        if (ts.isSpreadAssignment(member)) {
          for (const [name, spreadMember] of objectMembers(member.expression, seen)) values.set(name, spreadMember)
        } else if (ts.isPropertyAssignment(member)) {
          const name = objectMemberName(member.name)
          if (name !== undefined) values.set(name, { value: member.initializer, member: member.name })
        } else if (ts.isShorthandPropertyAssignment(member)) {
          values.set(member.name.text, { value: member.name, member: member.name })
        }
      }
      return values
    }

    function inspectField(expression, key) {
      const sourceMember = objectMembers(expression).get('source')
      if (sourceMember) {
        diagnostics.push(diagnostic(file, lineAt(sourceFile, sourceMember.member.getStart(sourceFile), lineOffset), `Form field "${key}" cannot declare the removed source member`))
      }
    }

    function inspectFields(expression) {
      for (const [key, field] of objectMembers(expression)) inspectField(field.value, key)
    }

    function isDefineFormCall(node) {
      const expression = unwrapExpression(node.expression)
      if (ts.isIdentifier(expression)) return defineFormAliases.has(expression.text)
      return ts.isPropertyAccessExpression(expression)
        && expression.name.text === 'defineForm'
        && ts.isIdentifier(expression.expression)
        && namespaceAliases.has(expression.expression.text)
    }

    function inspectFormDefinitions(node) {
      if (ts.isCallExpression(node) && isDefineFormCall(node)) {
        const definition = node.arguments[0]
        const fields = objectMembers(definition).get('fields')
        if (fields) inspectFields(fields.value)
      }
      ts.forEachChild(node, inspectFormDefinitions)
    }
    inspectFormDefinitions(sourceFile)

    const tsComponents = componentAliases(source, file)
    const vnodeFactories = new Set()
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || moduleName(statement.moduleSpecifier) !== 'vue') continue
      const bindings = statement.importClause?.namedBindings
      if (!bindings || !ts.isNamedImports(bindings)) continue
      for (const specifier of bindings.elements) {
        const imported = specifier.propertyName?.text ?? specifier.name.text
        if (imported === 'h' || imported === 'createVNode') vnodeFactories.add(specifier.name.text)
      }
    }
    function inspectComponentCalls(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(unwrapExpression(node.expression)) && vnodeFactories.has(unwrapExpression(node.expression).text)) {
        const component = unwrapExpression(node.arguments[0])
        const props = node.arguments[1]
        const name = ts.isIdentifier(component) ? tsComponents.get(component.text) : undefined
        const forbidden = name && componentPropRules.get(name)
        if (forbidden && props) {
          for (const [prop, value] of objectMembers(props)) {
            if (forbidden.has(prop)) diagnostics.push(diagnostic(file, lineAt(sourceFile, value.member.getStart(sourceFile), lineOffset), `<${name}> cannot receive removed prop "${prop}"`))
          }
        }
      }
      ts.forEachChild(node, inspectComponentCalls)
    }
    inspectComponentCalls(sourceFile)
  }

  function resourceBinding(name, scope) {
    let current = scope
    while (current) {
      const binding = scopeBindings.get(current)?.get(name)
      if (binding) {
        if (binding.status === null) return false
        if (binding.status !== undefined) return binding.status
        binding.status = null
        const initializer = binding.initializer && unwrapExpression(binding.initializer)
        const directResource = initializer && ts.isCallExpression(initializer) && isDefineResourceCall(initializer)
        const alias = initializer && ts.isIdentifier(initializer) && resourceBinding(initializer.text, binding.scope)
        binding.status = Boolean(directResource || alias)
        return binding.status
      }
      current = scopeParents.get(current)
    }
    return false
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const importedResource = isResourceModule(moduleName(statement.moduleSpecifier) ?? '')
    const bindings = statement.importClause?.namedBindings
    if (statement.importClause?.name) declare(sourceFile, statement.importClause.name.text, undefined, importedResource)
    if (bindings && ts.isNamespaceImport(bindings)) declare(sourceFile, bindings.name.text, undefined)
    if (bindings && ts.isNamedImports(bindings)) {
      for (const specifier of bindings.elements) declare(sourceFile, specifier.name.text, undefined, importedResource)
    }
  }

  function visit(node) {
    if (ts.isIdentifier(node) && removedNames.has(node.text) && isRemovedApiReference(node) && !isExpectedNegativeImport(sourceFile, node, file)) {
      diagnostics.push(diagnostic(file, lineAt(sourceFile, node.getStart(sourceFile), lineOffset), `uses removed API "${node.text}"`))
    }
    if (ts.isCallExpression(node)) {
      const expression = unwrapExpression(node.expression)
      if (isDefineResourceCall(node) && node.arguments.length !== 1 && !isExpectedNegativeArity(sourceFile, node, file)) {
        diagnostics.push(diagnostic(file, lineAt(sourceFile, node.getStart(sourceFile), lineOffset), 'defineResource must receive one complete definition object'))
      }
      if ((ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) && ['list', 'create'].includes(propertyName(expression) ?? '')) {
        const owner = unwrapExpression(expression.expression)
        if (ts.isIdentifier(owner) && resourceBinding(owner.text, nodeScopes.get(node))) {
          diagnostics.push(diagnostic(file, lineAt(sourceFile, node.getStart(sourceFile), lineOffset), `resource.${propertyName(expression)}() surface factories are removed`))
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return diagnostics
}

function isLoomComponentImport(importedPath, file) {
  if (importedPath === '@southneuhof/loom' || importedPath.startsWith('@southneuhof/loom/')) return true
  if (!importedPath.startsWith('.')) return false
  const sourcePath = resolve(workspaceRoot, file)
  const importedFile = resolve(dirname(sourcePath), importedPath)
  const componentsPath = resolve(workspaceRoot, 'packages/loom/src/components')
  return importedFile === componentsPath || importedFile.startsWith(`${componentsPath}${sep}`)
}

function componentAliases(source, file) {
  const aliases = new Map()
  const sourceFile = ts.createSourceFile('component-aliases.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const importedPath = moduleName(statement.moduleSpecifier) ?? ''
    if (!isLoomComponentImport(importedPath, file)) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const specifier of bindings.elements) {
        const imported = specifier.propertyName?.text ?? specifier.name.text
        if (componentPropRules.has(imported)) aliases.set(specifier.name.text, imported)
      }
    }
    if (statement.importClause?.name) {
      const name = basename(importedPath).replace(/\.(vue|[cm]?[jt]sx?)$/, '')
      if (componentPropRules.has(name)) aliases.set(statement.importClause.name.text, name)
    }
  }
  return aliases
}

function normalizePropName(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

function isExpectedVuePropError(comment, file) {
  return file.includes('__type-tests__/')
    && comment?.type === vueDom.NodeTypes.COMMENT
    && /^<!--\s*@vue-expect-error\b[\s\S]*-->$/.test(comment.loc.source)
}

function objectBindingNames(expression, scriptSource) {
  if (!expression) return []
  const sourceFile = ts.createSourceFile('template-binding.ts', `const __binding = (${expression})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const scriptFile = ts.createSourceFile('template-script.ts', scriptSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const initializers = new Map()
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) initializers.set(node.name.text, node.initializer)
    ts.forEachChild(node, collect)
  }
  collect(scriptFile)
  const binding = sourceFile.statements.find(ts.isVariableStatement)?.declarationList.declarations[0]?.initializer
  const names = []
  function resolveObject(node, seen = new Set()) {
    const value = node && unwrapExpression(node)
    if (!value) return undefined
    if (ts.isObjectLiteralExpression(value)) return value
    if (!ts.isIdentifier(value) || seen.has(value.text)) return undefined
    seen.add(value.text)
    return resolveObject(initializers.get(value.text), seen)
  }
  function visitObject(node, seen = new Set()) {
    const object = resolveObject(node, seen)
    if (!object) return
    for (const property of object.properties) {
      if (ts.isSpreadAssignment(property)) {
        visitObject(property.expression, seen)
      } else if (ts.isShorthandPropertyAssignment(property)) {
        names.push(property.name.text)
      } else if (ts.isPropertyAssignment(property)) {
        const name = property.name
        if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) names.push(name.text)
      }
    }
  }
  visitObject(binding)
  return names
}

function resourceFactoryCalls(expression, resourceNames) {
  const sourceFile = ts.createSourceFile('template-expression.ts', `const __expression = (${expression})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const calls = []
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = unwrapExpression(node.expression)
      if ((ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee))
        && ['list', 'create'].includes(propertyName(callee) ?? '')) {
        const owner = unwrapExpression(callee.expression)
        if (ts.isIdentifier(owner) && resourceNames.has(owner.text)) calls.push(propertyName(callee))
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return calls
}

function resourceImportAliases(source) {
  const aliases = new Set()
  const sourceFile = ts.createSourceFile('resource-imports.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !isResourceModule(moduleName(statement.moduleSpecifier) ?? '')) continue
    if (statement.importClause?.name) aliases.add(statement.importClause.name.text)
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const specifier of bindings.elements) aliases.add(specifier.name.text)
    }
  }
  return aliases
}

function analyzeTemplate(ast, file, aliases, resourceNames, scriptSource, lineOffset = 0) {
  const diagnostics = []
  function componentFor(node) {
    if (node.tag !== 'component') return node.tag.split('.').at(-1)
    const isProp = node.props.find((prop) => prop.type === vueDom.NodeTypes.DIRECTIVE
      && prop.name === 'bind'
      && prop.arg?.type === vueDom.NodeTypes.SIMPLE_EXPRESSION
      && prop.arg.isStatic
      && prop.arg.content === 'is')
    if (isProp?.exp?.type !== vueDom.NodeTypes.SIMPLE_EXPRESSION) return undefined
    return isProp.exp.content.trim().split('.').at(-1)
  }
  function visit(node, expectedPropError = false) {
    if (node.type === vueDom.NodeTypes.ELEMENT) {
      for (const prop of node.props) {
        if (prop.type !== vueDom.NodeTypes.DIRECTIVE || prop.exp?.type !== vueDom.NodeTypes.SIMPLE_EXPRESSION) continue
        for (const method of resourceFactoryCalls(prop.exp.content, resourceNames)) {
          diagnostics.push(diagnostic(file, prop.exp.loc.start.line + lineOffset, `resource.${method}() surface factories are removed`))
        }
      }
      const tag = componentFor(node)
      if (!tag) {
        if (node.children) for (const child of node.children) visit(child)
        return
      }
      const component = aliases.get(tag)
      const forbidden = componentPropRules.get(component)
      if (forbidden) {
        const props = []
        for (const prop of node.props) {
          if (prop.type === vueDom.NodeTypes.ATTRIBUTE) props.push({ name: normalizePropName(prop.name), line: prop.loc.start.line })
          if (prop.type === vueDom.NodeTypes.DIRECTIVE && prop.name === 'bind') {
            if (prop.arg?.type === vueDom.NodeTypes.SIMPLE_EXPRESSION && prop.arg.isStatic) props.push({ name: normalizePropName(prop.arg.content), line: prop.loc.start.line })
            if (!prop.arg) for (const name of objectBindingNames(prop.exp?.content, scriptSource)) props.push({ name: normalizePropName(name), line: prop.loc.start.line })
          }
        }
        for (const prop of props) {
          if (forbidden.has(prop.name) && !expectedPropError) diagnostics.push(diagnostic(file, prop.line + lineOffset, `<${component}> cannot receive removed prop "${prop.name}"`))
        }
      }
    }
    if (node.type === vueDom.NodeTypes.INTERPOLATION && node.content?.type === vueDom.NodeTypes.SIMPLE_EXPRESSION) {
      for (const method of resourceFactoryCalls(node.content.content, resourceNames)) {
        diagnostics.push(diagnostic(file, node.content.loc.start.line + lineOffset, `resource.${method}() surface factories are removed`))
      }
    }
    if (node.children) {
      for (let index = 0; index < node.children.length; index += 1) {
        const child = node.children[index]
        visit(child, isExpectedVuePropError(node.children[index - 1], file))
      }
    }
  }
  visit(ast)
  return diagnostics
}

function analyzeVue(source, file, lineOffset = 0) {
  const diagnostics = []
  const parsed = vueSfc.parse(source, { filename: file })
  if (parsed.errors.length) return parsed.errors.map((error) => diagnostic(file, 1 + lineOffset, `cannot parse Vue source: ${String(error)}`))
  const descriptor = parsed.descriptor
  const scriptBlocks = [descriptor.script, descriptor.scriptSetup].filter(Boolean)
  const scriptSource = scriptBlocks.map((block) => block.content).join('\n')
  const aliases = componentAliases(scriptSource, file)
  const resourceNames = resourceImportAliases(scriptSource)
  for (const block of scriptBlocks) {
    diagnostics.push(...analyzeTypeScript(block.content, `${file}.ts`, lineOffset + block.loc.start.line - 1))
  }
  if (descriptor.template?.ast) diagnostics.push(...analyzeTemplate(descriptor.template.ast, file, aliases, resourceNames, scriptSource, lineOffset))
  return diagnostics
}

function analyzeSource(source, file, lineOffset = 0) {
  if (extname(file) === '.vue') return analyzeVue(source, file, lineOffset)
  return analyzeTypeScript(source, file, lineOffset)
}

function markdownCode(source, file) {
  const diagnostics = []
  const lines = source.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*```(ts|tsx|js|jsx|mjs|vue|typescript|javascript)\s*$/i)
    if (!match) continue
    const start = index + 1
    const language = match[1].toLowerCase()
    const code = []
    index += 1
    while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++])
    const virtualFile = `${file}.${language === 'vue' ? 'vue' : language === 'ts' || language === 'typescript' ? 'ts' : language === 'tsx' ? 'tsx' : 'js'}`
    const snippet = code.join('\n')
    const fullSfc = /^\s*<(?:template(?:\s+lang=[^>]+)?|script(?:\s+setup)?(?:\s+lang=[^>]+)?)\s*>/.test(snippet)
    const lineOffset = language === 'vue' && !fullSfc ? start - 2 : start - 1
    const found = language === 'vue' && !fullSfc
      ? analyzeVue(`<template>\n${snippet}\n</template>`, virtualFile, lineOffset)
      : analyzeSource(snippet, virtualFile, lineOffset)
    diagnostics.push(...found)
  }
  return diagnostics
}

function filesUnder(root, relativePath) {
  const target = join(root, relativePath)
  if (!statSync(target, { throwIfNoEntry: false })?.isDirectory()) return []
  const files = []
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else files.push(path)
    }
  }
  visit(target)
  return files
}

function markdownFiles(root, relativePath) {
  const target = join(root, relativePath)
  if (!statSync(target, { throwIfNoEntry: false })) return []
  if (statSync(target).isFile()) return target.endsWith('.md') ? [target] : []
  return filesUnder(root, relativePath).filter((file) => file.endsWith('.md'))
}

function checkRemovedPaths(root) {
  return forbiddenPaths.flatMap((path) => statSync(join(root, path), { throwIfNoEntry: false })
    ? [diagnostic(path, 1, 'removed path still exists')]
    : [])
}

function checkVueSettings(root) {
  const diagnostics = []
  for (const path of ['packages/loom/tsconfig.json', 'apps/web/tsconfig.app.json']) {
    const config = ts.parseConfigFileTextToJson(path, readFileSync(join(root, path), 'utf8')).config
    const options = config.vueCompilerOptions ?? {}
    for (const setting of ['strictTemplates', 'checkUnknownProps']) {
      if (options[setting] !== true) diagnostics.push(diagnostic(path, 1, `${setting} must remain enabled`))
    }
  }
  return diagnostics
}

function checkGeneratedModule() {
  const fixtures = [
    boundedConfig(),
    JSON.parse(readFileSync(resolve(workspaceRoot, 'apps/web/src/framework/__type-tests__/plan057_generated_users/manifest.json'), 'utf8')),
  ]
  const diagnostics = []
  for (const config of fixtures) {
    const root = mkdtempSync(join(tmpdir(), 'carta-surface-architecture-'))
    try {
      const generated = scaffold(config, { root })
      diagnostics.push(...generated.generated.flatMap((path) => {
        const file = relative(root, path)
        if (extname(file) !== '.vue' && !extensions.has(extname(file))) return []
        return analyzeSource(readFileSync(path, 'utf8'), file)
      }))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
  return diagnostics
}

function checkWorkspace(root = workspaceRoot) {
  const diagnostics = [...checkRemovedPaths(root), ...checkVueSettings(root), ...checkGeneratedModule()]
  for (const sourceRoot of sourceRoots) {
    for (const file of filesUnder(root, sourceRoot)) {
      if (!extensions.has(extname(file)) && extname(file) !== '.vue') continue
      if (file.includes('/assets/lib/')) continue
      const relativeFile = relative(root, file)
      diagnostics.push(...analyzeSource(readFileSync(file, 'utf8'), relativeFile))
    }
  }
  const seenMarkdown = new Set()
  for (const markdownRoot of markdownRoots) {
    for (const file of markdownFiles(root, markdownRoot)) {
      if (seenMarkdown.has(file)) continue
      seenMarkdown.add(file)
      diagnostics.push(...markdownCode(readFileSync(file, 'utf8'), relative(root, file)))
    }
  }
  return diagnostics.sort((left, right) => left.localeCompare(right))
}

export { analyzeSource, checkGeneratedModule, checkWorkspace }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const diagnostics = checkWorkspace()
  if (diagnostics.length) {
    process.stderr.write(`${diagnostics.join('\n')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write('Surface architecture checks passed.\n')
  }
}

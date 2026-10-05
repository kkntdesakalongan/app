import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'
import { schemaBoundaryPlugin } from '../apps/web/scripts/schema-boundary.mjs'

const repositoryDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const webDirectory = resolve(repositoryDirectory, 'apps/web')
const apiDirectory = resolve(repositoryDirectory, 'apps/api')
const apiRoutesDirectory = join(apiDirectory, 'src/routes/(authenticated)')
const requireFromWeb = createRequire(join(webDirectory, 'package.json'))
const { build, createServer, loadConfigFromFile } = await import(pathToFileURL(requireFromWeb.resolve('vite')).href)

function createFixture(t) {
  const webRoot = mkdtempSync(join(webDirectory, '.schema-boundary-'))
  const apiRoot = mkdtempSync(join(apiRoutesDirectory, '__schema-boundary-'))
  const apiName = basename(apiRoot)
  const schemaPath = join(apiRoot, 'schema.ts')
  t.after(() => {
    rmSync(webRoot, { recursive: true, force: true })
    rmSync(apiRoot, { recursive: true, force: true })
  })
  return {
    apiRoot,
    apiName,
    schemaPath,
    schemaSpecifier: `@southneuhof/api/src/routes/(authenticated)/${apiName}/schema.ts`,
    webRoot,
  }
}

function writeMain(fixture, source) {
  writeFileSync(join(fixture.webRoot, 'main.ts'), source)
}

function writeIndexHtml(fixture) {
  writeFileSync(join(fixture.webRoot, 'index.html'), '<script type="module" src="/main.ts"></script>')
}

function writeApiSchema(fixture, source) {
  writeFileSync(fixture.schemaPath, source)
}

function relativeImport(fromDirectory, target) {
  const path = relative(fromDirectory, target).split('\\').join('/')
  return path.startsWith('.') ? path : `./${path}`
}

function serverConfig(fixture, include = [], extraPlugins = []) {
  const boundary = schemaBoundaryPlugin()
  return {
    configFile: false,
    logLevel: 'silent',
    optimizeDeps: {
      force: include.length > 0,
      include,
      rolldownOptions: { plugins: [boundary] },
    },
    plugins: [boundary, ...extraPlugins],
    cacheDir: join(fixture.webRoot, '.vite'),
    root: fixture.webRoot,
    server: {
      fs: { allow: [repositoryDirectory] },
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
  }
}

function buildConfig(fixture) {
  return {
    configFile: false,
    logLevel: 'silent',
    plugins: [schemaBoundaryPlugin()],
    root: fixture.webRoot,
    build: {
      emptyOutDir: true,
      lib: {
        entry: join(fixture.webRoot, 'main.ts'),
        fileName: 'schema-boundary',
        formats: ['es'],
      },
      outDir: join(fixture.webRoot, 'dist'),
      write: false,
    },
  }
}

async function loadDevGraph(server, initialUrl) {
  const pending = [initialUrl]
  const loaded = new Set()
  for (let index = 0; index < pending.length; index += 1) {
    const url = pending[index]
    if (loaded.has(url)) continue
    loaded.add(url)
    assert.ok(await server.transformRequest(url), `Dev module failed to load: ${url}`)
    const module = await server.environments.client.moduleGraph.getModuleByUrl(url)
    for (const dependency of module?.importedModules ?? []) pending.push(dependency.url)
  }
  return loaded
}

test('dev loads physical table-derived schemas through optimized shared chunks', async (t) => {
  const fixture = createFixture(t)
  writeMain(
    fixture,
    `
import { userCreateSchema } from '@southneuhof/api/src/routes/(authenticated)/users/schema.ts'
import { z } from 'zod'
import { z as v4 } from 'zod/v4'
export const parsed = userCreateSchema.safeParse({ name: 'Ada', email: 'ada@example.test' })
export const invalid = [z.string().safeParse(42), v4.string().safeParse(42)]
`
  )
  writeIndexHtml(fixture)
  const server = await createServer(serverConfig(fixture, ['zod', 'zod/v4']))
  try {
    await server.listen()
    const optimizer = server.environments.client.depsOptimizer
    if (optimizer?.scanProcessing) await optimizer.scanProcessing
    const loaded = await loadDevGraph(server, '/main.ts')
    assert.ok([...loaded].some((url) => url.includes('/users/schema.ts')))
    const chunks = Object.values(optimizer.metadata.chunks)
    assert.ok(chunks.some((chunk) => chunk.src === undefined))
    for (const chunk of chunks) assert.ok(await server.transformRequest(`/@fs${chunk.file}`))
  } finally {
    await server.close()
  }
})

test('bundled SDK consumers do not include the generated route source or server runtime', async (t) => {
  const fixture = createFixture(t)
  writeMain(fixture, `import { createRpcClient } from '@southneuhof/sdk/client'\nexport const client = createRpcClient('/api')\n`)
  const result = await build(buildConfig(fixture))
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output
  const entry = outputs.find((item) => item.type === 'chunk' && item.isEntry)
  assert.ok(entry)
  assert.doesNotMatch(entry.code, /\.sprindle\/routes\.ts|apps\/api\/src\/routes|apps\/api\/src\/db\.ts|@hono\/node-server|from ["']pg["']/)
})

test('worker builds reject schema dependencies on backend execution', async (t) => {
  const fixture = createFixture(t)
  writeFileSync(join(fixture.webRoot, 'worker.ts'), `import '@southneuhof/api'\n`)
  writeMain(fixture, `export const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })\n`)
  const previousVitest = process.env.VITEST
  process.env.VITEST = 'true'
  let loaded
  try {
    loaded = await loadConfigFromFile({ command: 'build', mode: 'test', isSsrBuild: false, isPreview: false }, join(webDirectory, 'vite.config.ts'), webDirectory, 'silent')
  } finally {
    if (previousVitest === undefined) delete process.env.VITEST
    else process.env.VITEST = previousVitest
  }
  await assert.rejects(build({ ...buildConfig(fixture), worker: loaded.config.worker }), (error) => {
    assertBoundaryFailure(error, ['apps/api/src/index.ts'])
    return true
  })
})

test('dev rejects an existing server dependency attached through a new shared helper', async (t) => {
  const fixture = createFixture(t)
  writeFileSync(join(fixture.webRoot, 'shared.ts'), "export { randomUUID } from 'node:crypto'\n")
  writeFileSync(join(fixture.webRoot, 'helper.ts'), "export { randomUUID } from './shared.ts'\n")
  writeApiSchema(fixture, `export { randomUUID } from '${relativeImport(fixture.apiRoot, join(fixture.webRoot, 'helper.ts'))}'\n`)
  writeMain(fixture, `export const load = () => import('${fixture.schemaSpecifier}')\n`)
  await withDevServer(fixture, async (server) => {
    assert.ok(await server.transformRequest('/shared.ts'))
    assert.ok(await server.transformRequest('/main.ts'))
    assert.ok(await server.transformRequest(`/@fs${fixture.schemaPath}`))
    await assert.rejects(server.transformRequest('/helper.ts'), (error) => {
      assertBoundaryFailure(error, ['schema.ts', 'helper.ts', 'shared.ts', 'node:crypto'])
      return true
    })
  })
})

test('web Vite config installs one boundary plugin for serve and dependency optimization', async () => {
  const previousVitest = process.env.VITEST
  process.env.VITEST = 'true'
  try {
    const loaded = await loadConfigFromFile({ command: 'serve', mode: 'test', isSsrBuild: false, isPreview: false }, join(webDirectory, 'vite.config.ts'), webDirectory, 'silent')
    assert.ok(loaded)
    const plugin = loaded.config.plugins.find((candidate) => candidate.name === 'carta-web-schema-boundary')
    const optimizerPlugin = loaded.config.optimizeDeps.rolldownOptions.plugins.find((candidate) => candidate.name === 'carta-web-schema-boundary')
    assert.ok(plugin)
    assert.equal(optimizerPlugin, plugin)
    assert.ok(loaded.config.plugins.includes(plugin))
  } finally {
    if (previousVitest === undefined) delete process.env.VITEST
    else process.env.VITEST = previousVitest
  }
})

function assertBoundaryFailure(error, fragments = []) {
  const message = String(error?.message ?? error)
  assert.match(message, /Browser API schema boundary violation/)
  assert.match(message, /Import chain:/)
  for (const fragment of fragments) assert.ok(message.includes(fragment), `Expected boundary diagnostic to include ${fragment}.\n${message}`)
}

async function expectBuildBoundaryFailure(fixture, fragments) {
  await assert.rejects(build(buildConfig(fixture)), (error) => {
    assertBoundaryFailure(error, fragments)
    return true
  })
}

async function expectDevBoundaryFailure(fixture, fragments, include = []) {
  let server
  try {
    server = await createServer(serverConfig(fixture, include))
    await server.listen()
  } catch (error) {
    assertBoundaryFailure(error, fragments)
    return
  }
  try {
    const optimizer = server.environments.client.depsOptimizer
    let optimizerFailure
    if (optimizer?.scanProcessing) {
      try {
        await optimizer.scanProcessing
      } catch (error) {
        optimizerFailure = error
      }
    }
    if (optimizerFailure) {
      assertBoundaryFailure(optimizerFailure, fragments)
      return
    }
    await assert.rejects(
      async () => {
        await server.transformRequest('/main.ts')
        await server.transformRequest(`/@fs${fixture.schemaPath}`)
      },
      (error) => {
        assertBoundaryFailure(error, fragments)
        return true
      }
    )
  } finally {
    await server.close()
  }
}

async function withDevServer(fixture, run) {
  const server = await createServer(serverConfig(fixture))
  try {
    await server.listen()
    await run(server)
  } finally {
    await server.close()
  }
}

function apiEscape(fixture, path) {
  return relativeImport(fixture.webRoot, path)
}

function hotUpdateObserver(path) {
  let completeUpdate
  let timeout
  return {
    plugin: {
      name: 'schema-boundary-hmr-observer',
      handleHotUpdate(context) {
        if (resolve(context.file) !== resolve(path)) return
        clearTimeout(timeout)
        completeUpdate?.()
      },
    },
    next() {
      return new Promise((resolveUpdate, rejectUpdate) => {
        completeUpdate = resolveUpdate
        timeout = setTimeout(() => rejectUpdate(new Error('Vite did not process the file update.')), 5000)
      })
    },
  }
}

test('build resolves physical user and role schemas and executes their parsers', async (t) => {
  const fixture = createFixture(t)
  const userSchema = '@southneuhof/api/src/routes/(authenticated)/users/schema.ts'
  const roleSchema = '@southneuhof/api/src/routes/(authenticated)/roles/schema.ts'
  const userEntity = join(apiDirectory, 'src/routes/(authenticated)/users/users.entity.ts')
  writeMain(
    fixture,
    `
import { userCreateSchema } from '${userSchema}'
import { roleCreateSchema } from '${roleSchema}'
import type { user } from '${apiEscape(fixture, userEntity)}'
export type UserEntity = typeof user
export const userResult = userCreateSchema.safeParse({ name: 'Ada', email: 'ada@example.test' })
export const roleResult = roleCreateSchema.safeParse({ roleCode: 'admin', name: 'Administrator', roleGroupId: 'group-admin' })
`
  )
  const result = await build({
    ...buildConfig(fixture),
    build: { ...buildConfig(fixture).build, write: true },
  })
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output
  const entry = outputs.find((item) => item.type === 'chunk' && item.isEntry)
  assert.ok(entry)
  assert.doesNotMatch(entry.code, /users\.entity\.ts/)
  const outputDirectory = join(fixture.webRoot, 'dist')
  writeFileSync(join(outputDirectory, 'package.json'), '{"type":"module"}')
  const bundle = await import(`${pathToFileURL(join(outputDirectory, entry.fileName)).href}?schema-boundary=${Date.now()}`)
  assert.equal(bundle.userResult.success, true)
  assert.equal(bundle.userResult.data.name, 'Ada')
  assert.equal(bundle.roleResult.success, true)
})

test('dev erases a type-only import from an entity module', async (t) => {
  const fixture = createFixture(t)
  const userEntity = join(apiDirectory, 'src/routes/(authenticated)/users/users.entity.ts')
  writeMain(fixture, `import type { user } from '${apiEscape(fixture, userEntity)}'\nexport type UserEntity = typeof user\nexport const loaded = true\n`)
  await withDevServer(fixture, async (server) => {
    const result = await server.transformRequest('/main.ts')
    assert.ok(result)
    assert.match(result.code, /loaded = true/)
    assert.doesNotMatch(result.code, /users\.entity\.ts/)
  })
})

test('web imports must use physical API schema package exports', async (t) => {
  for (const mode of ['build', 'dev']) {
    const fixture = createFixture(t)
    writeApiSchema(fixture, 'export const value = true\n')
    writeMain(fixture, `import '${apiEscape(fixture, fixture.schemaPath)}'\n`)
    if (mode === 'build') await expectBuildBoundaryFailure(fixture, ['schema.ts', 'physical package exports'])
    else await expectDevBoundaryFailure(fixture, ['schema.ts', 'physical package exports'])
  }
})

test('build rejects direct entity, operation, database and package-root imports', async (t) => {
  const fixture = createFixture(t)
  const targets = [
    [join(apiDirectory, 'src/routes/(authenticated)/users/users.entity.ts'), 'users.entity.ts'],
    [join(apiDirectory, 'src/routes/(authenticated)/users/users.ts'), 'users.ts'],
    [join(apiDirectory, 'src/db.ts'), 'db.ts'],
    ['@southneuhof/api', 'apps/api/src/index.ts'],
  ]
  for (const [target, diagnostic] of targets) {
    const source = typeof target === 'string' && target.startsWith('@') ? `import '${target}'\n` : `import '${apiEscape(fixture, target)}'\n`
    writeMain(fixture, source)
    await expectBuildBoundaryFailure(fixture, [diagnostic])
  }
})

test('dev rejects direct API runtime imports through resolved filesystem paths', async (t) => {
  const fixture = createFixture(t)
  const target = join(apiDirectory, 'src/routes/(authenticated)/users/users.ts')
  writeMain(fixture, `import '${apiEscape(fixture, target)}'\n`)
  await expectDevBoundaryFailure(fixture, ['users.ts'])
  writeMain(fixture, "import '@southneuhof/api'\n")
  await expectDevBoundaryFailure(fixture, ['apps/api/src/index.ts'])
})

test('build and dev reject schema re-exports and literal dynamic imports of operations', async (t) => {
  for (const mode of ['build', 'dev']) {
    for (const source of ["export { createUser } from './operation.ts'\n", "export const load = () => import('./operation.ts')\n"]) {
      const fixture = createFixture(t)
      writeFileSync(join(fixture.apiRoot, 'operation.ts'), 'export const createUser = () => true\n')
      writeApiSchema(fixture, source)
      writeMain(fixture, `import '${fixture.schemaSpecifier}'\n`)
      if (mode === 'build') await expectBuildBoundaryFailure(fixture, ['schema.ts', 'operation.ts'])
      else await expectDevBoundaryFailure(fixture, ['schema.ts', 'operation.ts'])
    }
  }
})

test('schema accepts Sprindle declarations and validation and rejects model runtime imports', async (t) => {
  for (const mode of ['build', 'dev']) {
    const fixture = createFixture(t)
    writeApiSchema(fixture, "import { isDomainEntity } from '@southneuhof/sprindle/entity'\nexport const value = isDomainEntity\n")
    writeMain(fixture, `import '${fixture.schemaSpecifier}'\n`)
    if (mode === 'build') await build(buildConfig(fixture))
    else
      await withDevServer(fixture, async (server) => {
        assert.ok(await server.transformRequest('/main.ts'))
        assert.ok(await server.transformRequest(`/@fs${fixture.schemaPath}`))
      })

    writeApiSchema(fixture, "export { listQuerySchema as value } from '@southneuhof/sprindle/validation'\n")
    if (mode === 'build') await build(buildConfig(fixture))
    else await withDevServer(fixture, (server) => loadDevGraph(server, '/main.ts'))

    writeApiSchema(fixture, "import '@southneuhof/sprindle/model'\nexport const value = true\n")
    if (mode === 'build') await expectBuildBoundaryFailure(fixture, ['schema.ts', 'model/index.ts'])
    else await expectDevBoundaryFailure(fixture, ['schema.ts', 'model/index.ts'])
  }
})

test('build and dev reject schema chains to Node builtins and PostgreSQL', async (t) => {
  for (const mode of ['build', 'dev']) {
    for (const [source, target] of [
      ["import { randomUUID } from 'node:crypto'\nexport const value = randomUUID\n", 'node:crypto'],
      ["import { Pool } from 'pg'\nexport const value = Pool\n", 'pg'],
    ]) {
      const fixture = createFixture(t)
      writeApiSchema(fixture, source)
      writeMain(fixture, `import { value } from '${fixture.schemaSpecifier}'\nexport { value }\n`)
      if (mode === 'build') await expectBuildBoundaryFailure(fixture, ['schema.ts', target])
      else if (target === 'pg') {
        writeIndexHtml(fixture)
        await expectDevBoundaryFailure(fixture, ['schema.ts', 'pg'], ['pg'])
      } else await expectDevBoundaryFailure(fixture, ['schema.ts', target])
    }
  }
})

test('build and dev reject server dependencies reached through an API table', async (t) => {
  for (const mode of ['build', 'dev']) {
    const fixture = createFixture(t)
    writeFileSync(join(fixture.apiRoot, 'unsafe.table.ts'), "import { Pool } from 'pg'\nexport const database = Pool\n")
    writeApiSchema(fixture, "import { database } from './unsafe.table.ts'\nexport const value = database\n")
    writeMain(fixture, `import '${fixture.schemaSpecifier}'\n`)
    if (mode === 'build') await expectBuildBoundaryFailure(fixture, ['schema.ts', 'unsafe.table.ts', 'pg'])
    else {
      writeIndexHtml(fixture)
      await expectDevBoundaryFailure(fixture, ['schema.ts', 'unsafe.table.ts', 'pg'], ['pg'])
    }
  }
})

test('dev detects a server dependency inside a prebundled shared module', async (t) => {
  const fixture = createFixture(t)
  const packageDirectory = mkdtempSync(join(apiDirectory, 'node_modules/schema-boundary-facade-'))
  t.after(() => rmSync(packageDirectory, { recursive: true, force: true }))
  const packageName = basename(packageDirectory)
  const packageEntry = join(packageDirectory, 'index.js')
  mkdirSync(join(fixture.webRoot, 'node_modules'), { recursive: true })
  symlinkSync(packageDirectory, join(fixture.webRoot, 'node_modules', packageName), 'dir')
  writeFileSync(join(packageDirectory, 'package.json'), JSON.stringify({ name: packageName, type: 'module', exports: './index.js' }))
  writeFileSync(packageEntry, "export { Pool } from 'pg'\n")
  writeApiSchema(fixture, `import { Pool } from '${packageName}'\nexport const value = Pool\n`)
  writeMain(fixture, `import '${fixture.schemaSpecifier}'\n`)
  writeIndexHtml(fixture)
  const server = await createServer(serverConfig(fixture, [packageName]))
  try {
    await server.listen()
    const optimizer = server.environments.client.depsOptimizer
    if (optimizer?.scanProcessing) await optimizer.scanProcessing
    const dependency = optimizer?.metadata?.optimized?.[packageName] ?? optimizer?.metadata?.discovered?.[packageName]
    assert.ok(dependency)
    await dependency.processing
    assert.ok(optimizer.metadata.optimized[packageName])
    await server.transformRequest('/main.ts')
    await assert.rejects(
      async () => {
        await server.transformRequest(`/@fs${fixture.schemaPath}`)
      },
      (error) => {
        assertBoundaryFailure(error, ['schema.ts', 'pg'])
        return true
      }
    )
  } finally {
    await server.close()
  }
})

test('dev removes stale graph edges after a schema changes from safe to unsafe and back', async (t) => {
  const fixture = createFixture(t)
  const operationPath = join(fixture.apiRoot, 'operation.ts')
  writeFileSync(operationPath, 'export const operation = true\n')
  writeApiSchema(fixture, 'export const value = true\n')
  writeMain(fixture, `import { value } from '${fixture.schemaSpecifier}'\nexport { value }\n`)
  const observer = hotUpdateObserver(fixture.schemaPath)
  const server = await createServer(serverConfig(fixture, [], [observer.plugin]))
  try {
    await server.listen()
    const schemaUrl = `/@fs${fixture.schemaPath}`
    await server.watcher.add(fixture.schemaPath)
    assert.ok(await server.transformRequest('/main.ts'))
    assert.ok(await server.transformRequest(schemaUrl))
    const unsafeUpdate = observer.next()
    await writeFile(fixture.schemaPath, "export { operation } from './operation.ts'\n")
    await unsafeUpdate
    await assert.rejects(server.transformRequest(schemaUrl), (error) => {
      assertBoundaryFailure(error, ['schema.ts', 'operation.ts'])
      return true
    })
    const safeUpdate = observer.next()
    await writeFile(fixture.schemaPath, 'export const value = false\n')
    await safeUpdate
    const safe = await server.transformRequest(schemaUrl)
    assert.ok(safe)
    assert.match(safe.code, /value = false/)
  } finally {
    await server.close()
  }
})

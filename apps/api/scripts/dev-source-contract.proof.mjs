import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { isDeepStrictEqual } from 'node:util'
import { access, cp, copyFile, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const apiSource = join(repositoryRoot, 'apps/api')
const sprindleSource = join(repositoryRoot, 'packages/sprindle')
const webRoot = join(repositoryRoot, 'apps/web')
const typescriptCompiler = createRequire(join(webRoot, 'package.json')).resolve('typescript/bin/tsc')
const timeoutMs = 240_000

async function availablePort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Cannot reserve a local API port.')
  const closed = once(server, 'close')
  server.close()
  await closed
  return address.port
}

async function linkDirectory(source, target) {
  await mkdir(dirname(target), { recursive: true })
  await symlink(await realpath(source), target, process.platform === 'win32' ? 'junction' : 'dir')
}

async function put(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
}

async function replaceFile(path, contents) {
  const temporary = `${path}.${process.pid}.tmp`
  await put(temporary, contents)
  await rename(temporary, path)
}

async function createFixture(root, port) {
  const apiRoot = join(root, 'apps/api')
  const packageRoot = join(root, 'packages/sprindle')
  const sdkRoot = join(root, 'packages/sdk')
  const typeRoot = join(root, 'packages/shared-types')
  const extensionRoot = join(root, '.vscode/extensions')
  const scripts = join(apiRoot, 'scripts')
  const apiNodeModules = join(apiRoot, 'node_modules')

  await Promise.all([
    mkdir(scripts, { recursive: true }),
    mkdir(apiNodeModules, { recursive: true }),
    mkdir(join(root, 'apps/web'), { recursive: true }),
    mkdir(join(packageRoot, 'editor'), { recursive: true }),
    mkdir(join(sdkRoot, 'src'), { recursive: true }),
    mkdir(join(typeRoot, 'src'), { recursive: true }),
    mkdir(join(extensionRoot), { recursive: true }),
  ])

  await Promise.all([
    cp(join(sprindleSource, 'src'), join(packageRoot, 'src'), { recursive: true }),
    cp(join(sprindleSource, 'tooling'), join(packageRoot, 'tooling'), { recursive: true }),
    ...['build.mjs', 'extension.cjs', 'package.json', 'state.mjs'].map((name) => copyFile(join(sprindleSource, 'editor', name), join(packageRoot, 'editor', name))),
    copyFile(join(sprindleSource, 'package.json'), join(packageRoot, 'package.json')),
    copyFile(join(sprindleSource, 'tsconfig.json'), join(packageRoot, 'tsconfig.json')),
    linkDirectory(join(sprindleSource, 'node_modules'), join(packageRoot, 'node_modules')),
    copyFile(join(apiSource, 'package.json'), join(apiRoot, 'package.json')),
    copyFile(join(apiSource, 'tsconfig.json'), join(apiRoot, 'tsconfig.json')),
    ...['dev-launcher.mjs', 'dev.ts', 'ensure-tooling.mjs', 'watch-runtime.ts'].map((name) => copyFile(join(apiSource, 'scripts', name), join(scripts, name))),
    copyFile(join(repositoryRoot, 'tsconfig.base.json'), join(root, 'tsconfig.base.json')),
    ...['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', '.npmrc'].map((name) => copyFile(join(repositoryRoot, name), join(root, name))),
    copyFile(join(repositoryRoot, 'packages/sdk/package.json'), join(sdkRoot, 'package.json')),
    copyFile(join(repositoryRoot, 'packages/sdk/src/client.ts'), join(sdkRoot, 'src/client.ts')),
    copyFile(join(webRoot, 'package.json'), join(root, 'apps/web/package.json')),
    linkDirectory(join(webRoot, 'node_modules/@types'), join(root, 'apps/web/node_modules/@types')),
  ])

  await put(
    join(typeRoot, 'package.json'),
    JSON.stringify({
      name: '@fixture/shared-types',
      type: 'module',
      exports: { '.': './src/index.ts' },
    })
  )
  await put(join(typeRoot, 'src/index.ts'), `export type Release = 'one'\n`)

  for (const [name, source] of [
    ['tsx', join(apiSource, 'node_modules/tsx')],
    ['chokidar', join(apiSource, 'node_modules/chokidar')],
    ['hono', join(apiSource, 'node_modules/hono')],
    ['zod', join(apiSource, 'node_modules/zod')],
    ['@hono/node-server', join(apiSource, 'node_modules/@hono/node-server')],
    ['@southneuhof/sprindle', packageRoot],
    ['@fixture/shared-types', typeRoot],
  ])
    await linkDirectory(source, join(apiNodeModules, name))

  const workspaceModules = join(root, 'node_modules')
  await mkdir(workspaceModules, { recursive: true })
  await copyFile(join(repositoryRoot, 'node_modules/.modules.yaml'), join(workspaceModules, '.modules.yaml'))
  await linkDirectory(join(repositoryRoot, 'node_modules/.pnpm'), join(workspaceModules, '.pnpm'))
  const workspaceState = JSON.parse(await readFile(join(repositoryRoot, 'node_modules/.pnpm-workspace-state-v1.json'), 'utf8'))
  workspaceState.projects = Object.fromEntries(
    Object.entries(workspaceState.projects).map(([path, project]) => [
      path === repositoryRoot || path.startsWith(`${repositoryRoot}${sep}`) ? resolve(root, relative(repositoryRoot, path)) : path,
      project,
    ])
  )
  await writeFile(join(workspaceModules, '.pnpm-workspace-state-v1.json'), JSON.stringify(workspaceState))
  await mkdir(join(workspaceModules, '@southneuhof'), { recursive: true })
  await mkdir(join(workspaceModules, '@fixture'), { recursive: true })
  await Promise.all([
    linkDirectory(apiRoot, join(workspaceModules, '@southneuhof/api')),
    linkDirectory(sdkRoot, join(workspaceModules, '@southneuhof/sdk')),
    linkDirectory(packageRoot, join(workspaceModules, '@southneuhof/sprindle')),
    linkDirectory(typeRoot, join(workspaceModules, '@fixture/shared-types')),
    linkDirectory(join(apiSource, 'node_modules/hono'), join(workspaceModules, 'hono')),
    linkDirectory(join(apiSource, 'node_modules/zod'), join(workspaceModules, 'zod')),
  ])

  const routeRoot = join(apiRoot, 'src/routes')
  await Promise.all([mkdir(join(routeRoot, 'status'), { recursive: true }), mkdir(scripts, { recursive: true })])
  await put(join(apiRoot, '.env'), `API_PORT=${port}\nPROOF_BOOT_DELAY_MS=0\n`)
  await put(join(apiRoot, 'src/runtime-value.ts'), `export const runtimeValue = 'runtime-one'\n`)
  await put(join(apiRoot, 'src/create-app.ts'), createAppSource())
  await put(join(apiRoot, 'src/server.ts'), serverSource())
  await put(join(routeRoot, '+scope.ts'), scopeSource('alpha'))
  await put(join(routeRoot, 'status/+server.ts'), routeSource(['blue', 'green']))

  const consumerPath = join(root, 'apps/web/src/consumer.ts')
  const consumerConfig = join(root, 'apps/web/consumer.tsconfig.json')
  await put(
    consumerConfig,
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
        types: ['node'],
        typeRoots: [join(root, 'apps/web/node_modules/@types')],
      },
      files: [consumerPath],
    })
  )

  return {
    apiRoot,
    consumerConfig,
    consumerPath,
    extensionRoot,
    manifest: join(apiRoot, '.sprindle-dev/routes.mjs'),
    routeRoot,
    scopeFile: join(routeRoot, '+scope.ts'),
    sourceManifest: join(apiRoot, '.sprindle/routes.ts'),
    runtimeFile: join(apiRoot, 'src/runtime-value.ts'),
    typeFile: join(typeRoot, 'src/index.ts'),
  }
}

function createAppSource() {
  return `import { Hono } from 'hono'\nimport { installSprindle, loadRouteManifest } from '@southneuhof/sprindle/hono'\nimport { runtimeValue } from './runtime-value'\nexport async function createApp() {\n  const manifest = await loadRouteManifest(process.cwd(), '.sprindle-dev/routes.mjs')\n  const app = installSprindle(new Hono(), manifest)\n  const instance = Math.random().toString(36).slice(2)\n  app.get('/runtime', (context) => context.json({ instance, value: runtimeValue }))\n  return app\n}\n`
}

function serverSource() {
  return `import { serve } from '@hono/node-server'\nimport { createApp } from './create-app'\nconst port = Number(process.env.API_PORT)\nif (!port) throw new Error('API_PORT is not set')\nconst app = await createApp()\nconsole.log('fixture server booting')\nconst bootDelay = Number(process.env.PROOF_BOOT_DELAY_MS ?? 0)\nif (bootDelay > 0) await new Promise((resolve) => setTimeout(resolve, bootDelay))\nserve({ fetch: app.fetch, port })\n`
}

function scopeSource(tenant) {
  return `import { defineScope } from '@southneuhof/sprindle'\nexport default defineScope({ context: () => ({ tenant: { code: ${JSON.stringify(tenant)} as const } }) })\n`
}

function routeSource(modes, recovered = false) {
  const enumValues = modes.map((mode) => JSON.stringify(mode)).join(', ')
  const recoveredField = recovered ? ', recovered: true as const' : ''
  return `import { defineRoute } from '@southneuhof/sprindle'\nimport { z } from 'zod'\nimport type { Release } from '@fixture/shared-types'\nconst release = (): Release => 'one' as string as Release\nexport const GET = defineRoute({ action: ({ context }) => ({ tenant: context.tenant.code, revision: release()${recoveredField} }) })\nexport const POST = defineRoute({ openapi: { requestBody: z.object({ mode: z.enum([${enumValues}]) }) }, action: ({ context }) => ({ tenant: context.tenant.code, revision: release()${recoveredField} }) })\n`
}

function consumerSource({ path = 'status', tenant, revision, mode }) {
  return `import type { InferRequestType, InferResponseType } from 'hono/client'\nimport type { RpcClient } from '@southneuhof/sdk/client'\ntype Request = InferRequestType<RpcClient[${JSON.stringify(path)}]['$post']>\ntype Response = InferResponseType<RpcClient[${JSON.stringify(path)}]['$get'], 200>\ndeclare const response: Response\nconst request: Request = { json: { mode: ${JSON.stringify(mode)} } }\nconst typedTenant: ${JSON.stringify(tenant)} = response.tenant\nconst typedRevision: ${JSON.stringify(revision)} = response.revision\nvoid [request, typedTenant, typedRevision]\n`
}

function invalidInputSource(path = 'status', mode = 'invalid') {
  return `import type { InferRequestType } from 'hono/client'\nimport type { RpcClient } from '@southneuhof/sdk/client'\ntype Request = InferRequestType<RpcClient[${JSON.stringify(path)}]['$post']>\nconst request: Request = { json: { mode: ${JSON.stringify(mode)} } }\nvoid request\n`
}

function routeConsumer(path) {
  return `import type { RpcClient } from '@southneuhof/sdk/client'\ndeclare const client: RpcClient\nvoid client[${JSON.stringify(path)}].$get\n`
}

function outputOf(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

function countMatches(value, expression) {
  return [...value.matchAll(expression)].length
}

async function artifactState(path) {
  const [metadata, contents] = await Promise.all([stat(path, { bigint: true }), readFile(path)])
  return `${metadata.ino}:${metadata.mtimeNs}:${createHash('sha256').update(contents).digest('hex')}`
}

async function eventuallyArtifactChange(path, previousState, timeout = 15_000) {
  const deadline = Date.now() + timeout
  let lastState = previousState
  do {
    try {
      lastState = await artifactState(path)
      if (lastState !== previousState) return
    } catch (error) {
      lastState = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  } while (Date.now() < deadline)
  assert.fail(`The generated artifact did not change at ${path}; last state: ${lastState}`)
}

async function eventuallyJson(base, path, expected, timeout = 15_000) {
  const deadline = Date.now() + timeout
  let last = 'no response'
  do {
    try {
      const response = await fetch(`${base}${path}`)
      const body = await response.text()
      last = `${response.status} ${body}`
      if (response.status === 200) {
        try {
          if (isDeepStrictEqual(JSON.parse(body), expected)) return
        } catch {}
      }
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  } while (Date.now() < deadline)
  assert.fail(`The API did not return the expected response for ${path}; last response: ${last}`)
}

async function eventuallyJsonMatch(base, path, matches, timeout = 15_000) {
  const deadline = Date.now() + timeout
  let last = 'no response'
  do {
    try {
      const response = await fetch(`${base}${path}`)
      const body = await response.text()
      last = `${response.status} ${body}`
      if (response.status === 200) {
        try {
          const value = JSON.parse(body)
          if (matches(value)) return value
        } catch {}
      }
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  } while (Date.now() < deadline)
  assert.fail(`The API did not return the expected response for ${path}; last response: ${last}`)
}

async function eventuallyStatus(base, path, expected, timeout = 15_000) {
  const deadline = Date.now() + timeout
  let last = 'no response'
  do {
    try {
      const response = await fetch(`${base}${path}`)
      last = `${response.status} ${await response.text()}`
      if (response.status === expected) return
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  } while (Date.now() < deadline)
  assert.fail(`Expected status ${expected} from ${path}; last response: ${last}`)
}

async function waitForLog(readOutput, pattern, timeout = 15_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const output = readOutput()
    if (pattern.test(output)) return
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
  }
  assert.fail(`The development process did not log ${pattern}.`)
}

async function waitForCount(readCount, expected, timeout = 15_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (readCount() >= expected) return
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
  }
  assert.fail(`Expected process start count ${expected}; received ${readCount()}`)
}

function compileConsumer(current, source) {
  return async function run(name) {
    await put(current.consumerPath, source(name))
    return spawnSync(process.execPath, [typescriptCompiler, '--pretty', 'false', '-p', current.consumerConfig], { cwd: current.apiRoot, encoding: 'utf8' })
  }
}

function startStandaloneBuild(apiRoot) {
  const source = `import { compileRouteManifest } from '@southneuhof/sprindle/tooling'; await compileRouteManifest(process.cwd(), 'src/routes', '.sprindle-dev/routes.mjs', false)`
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
    cwd: apiRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  child.stderr.on('data', (chunk) => {
    output += chunk
  })
  return { child, output: () => output, close: once(child, 'close') }
}

async function stop(child, close) {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGINT')
  const result = await new Promise((resolveResult, rejectResult) => {
    const timer = setTimeout(() => {
      if (process.platform === 'win32') child.kill('SIGKILL')
      else if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGKILL')
        } catch {}
      }
      rejectResult(new Error('The development launcher did not stop.'))
    }, 10_000)
    close.then(
      (value) => {
        clearTimeout(timer)
        resolveResult(value)
      },
      (error) => {
        clearTimeout(timer)
        rejectResult(error)
      }
    )
  })
  return result[0] ?? 1
}

test('actual development launcher keeps the SDK source contract current', { timeout: timeoutMs }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'carta-api-source-contract-'))
  let child
  let childClose
  let fixture
  let standalone
  let base
  let output = ''
  const starts = () => countMatches(output, /\[api:dev\] Starting API server\.\.\./g)

  try {
    const port = await availablePort()
    fixture = await createFixture(root, port)
    base = `http://127.0.0.1:${port}`
    const environment = {
      ...process.env,
      API_PORT: String(port),
      SPRINDLE_VSCODE_EXTENSIONS_DIR: fixture.extensionRoot,
    }
    child = spawn(process.execPath, ['scripts/dev-launcher.mjs'], {
      cwd: fixture.apiRoot,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })
    childClose = once(child, 'close')
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })
    child.on('error', (error) => {
      output += `${error.stack ?? error.message}\n`
    })

    try {
      await eventuallyJson(base, '/status', { tenant: 'alpha', revision: 'one' })
    } catch (error) {
      throw new Error(`${error.message}\n${output}`)
    }
    await access(fixture.sourceManifest)
    const compileFrontend = compileConsumer(fixture, (name) => consumerSource({ tenant: 'alpha', revision: 'one', mode: 'blue' }))
    const initialTypecheck = await compileFrontend('initial')
    assert.equal(initialTypecheck.status, 0, outputOf(initialTypecheck))
    const initialContract = await artifactState(fixture.sourceManifest)
    const initialRuntime = await artifactState(fixture.manifest)
    const initialInstance = await (await fetch(`${base}/runtime`)).json()

    const badInput = await compileConsumer(fixture, () => invalidInputSource())('invalid-input')
    assert.notEqual(badInput.status, 0, outputOf(badInput))
    assert.match(outputOf(badInput), /error TS2322:/)

    await replaceFile(fixture.typeFile, `export type Release = 'two'\n`)
    const updatedTypecheck = await compileConsumer(fixture, (name) => consumerSource({ tenant: 'alpha', revision: 'two', mode: 'blue' }))('external-type-update')
    assert.equal(updatedTypecheck.status, 0, outputOf(updatedTypecheck))
    const staleRevision = await compileConsumer(fixture, () => consumerSource({ tenant: 'alpha', revision: 'one', mode: 'blue' }))('stale-external-type')
    assert.notEqual(staleRevision.status, 0, outputOf(staleRevision))
    assert.match(outputOf(staleRevision), /error TS2322:/)
    assert.equal(await artifactState(fixture.sourceManifest), initialContract)
    assert.equal(await artifactState(fixture.manifest), initialRuntime)
    assert.deepEqual(await (await fetch(`${base}/runtime`)).json(), initialInstance)

    await replaceFile(fixture.scopeFile, scopeSource('beta'))
    await eventuallyJson(base, '/status', { tenant: 'beta', revision: 'one' })
    const betaTypecheck = await compileConsumer(fixture, (name) => consumerSource({ tenant: 'beta', revision: 'two', mode: 'blue' }))('scope-update')
    assert.equal(betaTypecheck.status, 0, outputOf(betaTypecheck))
    const staleScope = await compileConsumer(fixture, (name) => consumerSource({ tenant: 'alpha', revision: 'two', mode: 'blue' }))('stale-scope')
    assert.notEqual(staleScope.status, 0, outputOf(staleScope))
    assert.match(outputOf(staleScope), /error TS2322:/)

    const previousInputContract = await artifactState(fixture.sourceManifest)
    await replaceFile(join(fixture.routeRoot, 'status/+server.ts'), routeSource(['green', 'yellow']))
    await eventuallyJson(base, '/status', { tenant: 'beta', revision: 'one' })
    await eventuallyArtifactChange(fixture.sourceManifest, previousInputContract)
    const updatedInput = await compileConsumer(fixture, (name) => consumerSource({ tenant: 'beta', revision: 'two', mode: 'yellow' }))('input-update')
    assert.equal(updatedInput.status, 0, outputOf(updatedInput))
    const staleInput = await compileConsumer(fixture, () => invalidInputSource('status', 'blue'))('stale-input')
    assert.notEqual(staleInput.status, 0, outputOf(staleInput))
    assert.match(outputOf(staleInput), /error TS2322:/)
    const postResponse = await fetch(`${base}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'yellow' }),
    })
    assert.equal(postResponse.status, 200)
    assert.deepEqual(await postResponse.json(), { tenant: 'beta', revision: 'one' })

    await replaceFile(fixture.scopeFile, scopeSource('gamma'))
    await replaceFile(fixture.scopeFile, scopeSource('delta'))
    await eventuallyJson(base, '/status', { tenant: 'delta', revision: 'one' })
    const rapidEditTypecheck = await compileConsumer(fixture, (name) => consumerSource({ tenant: 'delta', revision: 'two', mode: 'yellow' }))('rapid-edits')
    assert.equal(rapidEditTypecheck.status, 0, outputOf(rapidEditTypecheck))

    await mkdir(join(fixture.routeRoot, 'health'), { recursive: true })
    await replaceFile(join(fixture.routeRoot, 'health/+server.ts'), `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => ({ ready: true }) })\n`)
    await eventuallyJson(base, '/health', { ready: true })
    const addedRoute = await compileConsumer(fixture, () => routeConsumer('health'))('added-route')
    assert.equal(addedRoute.status, 0, outputOf(addedRoute))
    await rm(join(fixture.routeRoot, 'health'), { recursive: true })
    await eventuallyStatus(base, '/health', 404)
    const deletedRoute = await compileConsumer(fixture, () => routeConsumer('health'))('deleted-route')
    assert.notEqual(deletedRoute.status, 0, outputOf(deletedRoute))
    assert.match(outputOf(deletedRoute), /error TS7053:/)

    await mkdir(join(fixture.routeRoot, 'current'), { recursive: true })
    await rename(join(fixture.routeRoot, 'status/+server.ts'), join(fixture.routeRoot, 'current/+server.ts'))
    await rm(join(fixture.routeRoot, 'status'), { recursive: true })
    await eventuallyJson(base, '/current', { tenant: 'delta', revision: 'one' })
    await eventuallyStatus(base, '/status', 404)
    const movedRoute = await compileConsumer(fixture, () => routeConsumer('current'))('moved-route')
    assert.equal(movedRoute.status, 0, outputOf(movedRoute))
    const staleRoute = await compileConsumer(fixture, () => routeConsumer('status'))('stale-route')
    assert.notEqual(staleRoute.status, 0, outputOf(staleRoute))
    assert.match(outputOf(staleRoute), /error TS7053:/)

    const currentRoutePath = join(fixture.routeRoot, 'current/+server.ts')
    const lastGoodRoute = await readFile(currentRoutePath, 'utf8')
    const startsBeforeFailure = starts()
    await replaceFile(currentRoutePath, `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => ({ revision: ) })\n`)
    await waitForLog(() => output, /SyntaxError|Unexpected token|UnexpectedToken/)
    await eventuallyJson(base, '/current', { tenant: 'delta', revision: 'one' })
    assert.equal(starts(), startsBeforeFailure)
    const retainedTypecheck = await compileConsumer(fixture, (name) => consumerSource({ path: 'current', tenant: 'delta', revision: 'two', mode: 'yellow' }))('syntax-failure')
    assert.equal(retainedTypecheck.status, 0, outputOf(retainedTypecheck))
    await replaceFile(currentRoutePath, routeSource(['green', 'yellow'], true))
    await eventuallyJson(base, '/current', { tenant: 'delta', revision: 'one', recovered: true })
    const recoveredTypecheck = await compileConsumer(fixture, (name) => consumerSource({ path: 'current', tenant: 'delta', revision: 'two', mode: 'yellow' }))('syntax-recovery')
    assert.equal(recoveredTypecheck.status, 0, outputOf(recoveredTypecheck))
    const recoveryOutput = await readFile(currentRoutePath, 'utf8')
    assert.notEqual(recoveryOutput, lastGoodRoute)

    standalone = startStandaloneBuild(fixture.apiRoot)
    await mkdir(join(fixture.routeRoot, 'extra'), { recursive: true })
    await replaceFile(join(fixture.routeRoot, 'extra/+server.ts'), `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => ({ concurrent: true }) })\n`)
    const standaloneResult = await standalone.close
    assert.equal(standaloneResult[0], 0, standalone.output())
    await eventuallyJson(base, '/extra', { concurrent: true })
    const concurrentRoute = await compileConsumer(fixture, () => routeConsumer('extra'))('concurrent-generator')
    assert.equal(concurrentRoute.status, 0, outputOf(concurrentRoute))
    assert.ok(starts() > startsBeforeFailure)

    const beforeRuntimeEdit = await (await fetch(`${base}/runtime`)).json()
    await replaceFile(fixture.runtimeFile, `export const runtimeValue = 'runtime-two'\n`)
    await eventuallyJsonMatch(base, '/runtime', (value) => value.value === 'runtime-two' && value.instance !== beforeRuntimeEdit.instance, 20_000)
    assert.notEqual((await (await fetch(`${base}/runtime`)).json()).instance, initialInstance.instance)

    const exitCode = await stop(child, childClose)
    assert.equal(exitCode, 130)
    await assert.rejects(fetch(`${base}/runtime`))
  } catch (error) {
    if (child) error.message = `${error.message}\n${output}`
    throw error
  } finally {
    if (standalone) {
      if (standalone.child.exitCode === null && standalone.child.signalCode === null) standalone.child.kill('SIGTERM')
      await standalone.close.catch(() => {})
    }
    if (child) await stop(child, childClose).catch(() => {})
    await rm(root, { recursive: true, force: true })
  }
})

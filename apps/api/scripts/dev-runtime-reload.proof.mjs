import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { isDeepStrictEqual } from 'node:util'
import { cp, copyFile, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const apiSource = join(repositoryRoot, 'apps/api')
const sprindleSource = join(repositoryRoot, 'packages/sprindle')
const timeoutMs = 120_000

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

async function createFixture(root, port) {
  const apiRoot = join(root, 'apps/api')
  const packageRoot = join(root, 'packages/sprindle')
  const extensionRoot = join(root, '.vscode/extensions')
  const packageNodeModules = join(packageRoot, 'node_modules')
  const apiNodeModules = join(apiRoot, 'node_modules')
  const scripts = join(apiRoot, 'scripts')
  const routes = join(apiRoot, 'src/routes/health')
  await Promise.all([mkdir(scripts, { recursive: true }), mkdir(routes, { recursive: true }), mkdir(apiNodeModules, { recursive: true }), mkdir(packageRoot, { recursive: true })])
  await mkdir(join(packageRoot, 'editor'), { recursive: true })
  await Promise.all([
    cp(join(sprindleSource, 'src'), join(packageRoot, 'src'), { recursive: true }),
    cp(join(sprindleSource, 'tooling'), join(packageRoot, 'tooling'), { recursive: true }),
    ...['build.mjs', 'extension.cjs', 'package.json', 'state.mjs'].map((name) => copyFile(join(sprindleSource, 'editor', name), join(packageRoot, 'editor', name))),
    copyFile(join(sprindleSource, 'package.json'), join(packageRoot, 'package.json')),
    copyFile(join(sprindleSource, 'tsconfig.json'), join(packageRoot, 'tsconfig.json')),
    linkDirectory(join(sprindleSource, 'node_modules'), packageNodeModules),
    copyFile(join(apiSource, 'package.json'), join(apiRoot, 'package.json')),
    copyFile(join(apiSource, 'tsconfig.json'), join(apiRoot, 'tsconfig.json')),
    copyFile(join(repositoryRoot, 'tsconfig.base.json'), join(root, 'tsconfig.base.json')),
    ...['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', '.npmrc'].map((name) => copyFile(join(repositoryRoot, name), join(root, name))),
    ...['dev-launcher.mjs', 'dev.ts', 'ensure-tooling.mjs', 'watch-runtime.ts'].map((name) => copyFile(join(apiSource, 'scripts', name), join(scripts, name))),
  ])
  for (const [name, source] of [
    ['tsx', join(apiSource, 'node_modules/tsx')],
    ['chokidar', join(apiSource, 'node_modules/chokidar')],
    ['hono', join(apiSource, 'node_modules/hono')],
    ['@hono/node-server', join(apiSource, 'node_modules/@hono/node-server')],
    ['@southneuhof/sprindle', packageRoot],
  ]) await linkDirectory(source, join(apiNodeModules, name))
  await writeFile(join(apiRoot, '.env'), `API_PORT=${port}\nPROOF_ENV_VALUE=env-one\nPROOF_BOOT_DELAY_MS=0\n`)
  await writeFile(join(apiRoot, 'src/startup.ts'), `export const moduleValue = 'module-one'\n`)
  await writeFile(join(apiRoot, 'src/create-app.ts'), createAppSource())
  await writeFile(join(apiRoot, 'src/server.ts'), serverSource())
  await writeFile(join(routes, '+server.ts'), `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => ({ version: 1 }) })\n`)
  return { apiRoot, extensionRoot, manifest: join(apiRoot, '.sprindle-dev/routes.mjs'), envFile: join(apiRoot, '.env'), routeFile: join(routes, '+server.ts'), startupFile: join(apiRoot, 'src/startup.ts'), createAppFile: join(apiRoot, 'src/create-app.ts'), serverFile: join(apiRoot, 'src/server.ts') }
}

function createAppSource(moduleSpecifier = './startup', appValue = 'app-one') {
  return `import { Hono } from 'hono'\nimport { installSprindle, loadRouteManifest } from '@southneuhof/sprindle/hono'\nimport { moduleValue } from ${JSON.stringify(moduleSpecifier)}\nexport async function createApp() {\n  const manifest = await loadRouteManifest(process.cwd(), '.sprindle-dev/routes.mjs')\n  const app = installSprindle(new Hono(), manifest)\n  app.get('/startup', (context) => context.json({ moduleValue, appValue: ${JSON.stringify(appValue)}, envValue: process.env.PROOF_ENV_VALUE ?? 'unset' }))\n  return app\n}\n`
}

function serverSource(serverValue = 'server-one') {
  return `import { serve } from '@hono/node-server'\nimport { createApp } from './create-app'\nconst port = Number(process.env.API_PORT)\nif (!port) throw new Error('API_PORT is not set')\nconst app = await createApp()\napp.get('/server', (context) => context.text(${JSON.stringify(serverValue)}))\nconsole.log('fixture server booting')\nconst bootDelay = Number(process.env.PROOF_BOOT_DELAY_MS ?? 0)\nif (bootDelay > 0) await new Promise((resolve) => setTimeout(resolve, bootDelay))\nserve({ fetch: app.fetch, port })\n`
}

async function replaceFile(path, contents) {
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, contents)
  await rename(temporary, path)
}

async function eventuallyJson(base, path, expected, timeout = 12_000) {
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

async function eventuallyText(base, path, expected, timeout = 12_000) {
  const deadline = Date.now() + timeout
  let last = 'no response'
  do {
    try {
      const response = await fetch(`${base}${path}`)
      const body = await response.text()
      last = `${response.status} ${body}`
      if (response.status === 200 && body === expected) return
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  } while (Date.now() < deadline)
  assert.fail(`The API did not return the expected response for ${path}; last response: ${last}`)
}

async function artifactState(path) {
  const [metadata, contents] = await Promise.all([stat(path, { bigint: true }), readFile(path)])
  return `${metadata.ino}:${metadata.mtimeNs}:${createHash('sha256').update(contents).digest('hex')}`
}

function countMatches(value, expression) {
  return [...value.matchAll(expression)].length
}

async function waitForCount(readCount, expected, timeout = 12_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (readCount() >= expected) return
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
  }
  assert.fail(`Expected count ${expected}; received ${readCount()}`)
}

async function waitForUnavailable(base, duration = 500) {
  const deadline = Date.now() + duration
  do {
    try {
      const response = await fetch(`${base}/startup`)
      assert.fail(`The API returned ${response.status} while startup source was invalid.`)
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
  } while (Date.now() < deadline)
}

async function stop(child, close) {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGINT')
  const result = await new Promise((resolveResult, rejectResult) => {
    const timer = setTimeout(() => {
      if (process.platform === 'win32') child.kill('SIGKILL')
      else if (child.pid) {
        try { process.kill(-child.pid, 'SIGKILL') } catch {}
      }
      rejectResult(new Error('The development launcher did not stop.'))
    }, 10_000)
    close.then((value) => {
      clearTimeout(timer)
      resolveResult(value)
    }, (error) => {
      clearTimeout(timer)
      rejectResult(error)
    })
  })
  return result[0] ?? 1
}

test('development runtime edits restart the API without compiling routes', { timeout: timeoutMs }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'carta-api-runtime-'))
  let child
  let childClose
  let fixture
  let base
  let output = ''
  const starts = () => countMatches(output, /\[api:dev\] Starting API server\.\.\./g)
  const boots = () => countMatches(output, /fixture server booting/g)

  try {
    const port = await availablePort()
    fixture = await createFixture(root, port)
    base = `http://127.0.0.1:${port}`
    const environment = { ...process.env, API_PORT: String(port), SPRINDLE_VSCODE_EXTENSIONS_DIR: fixture.extensionRoot }
    delete environment.PROOF_ENV_VALUE
    delete environment.PROOF_BOOT_DELAY_MS
    child = spawn(process.execPath, ['scripts/dev-launcher.mjs'], { cwd: fixture.apiRoot, env: environment, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' })
    childClose = once(child, 'close')
    child.stdout.on('data', (chunk) => { output += chunk })
    child.stderr.on('data', (chunk) => { output += chunk })
    child.on('error', (error) => { output += `${error.stack ?? error.message}\n` })

    try {
      await eventuallyJson(base, '/startup', { moduleValue: 'module-one', appValue: 'app-one', envValue: 'env-one' })
    } catch (error) {
      throw new Error(`${error.message}\n${output}`)
    }
    await eventuallyText(base, '/server', 'server-one')
    const initialArtifact = await artifactState(fixture.manifest)
    assert.deepEqual((await (await fetch(`${base}/health`)).json()), { version: 1 })

    await replaceFile(fixture.startupFile, `export const moduleValue = 'module-two'\n`)
    await eventuallyJson(base, '/startup', { moduleValue: 'module-two', appValue: 'app-one', envValue: 'env-one' })
    assert.equal(await artifactState(fixture.manifest), initialArtifact)

    const createdModule = join(fixture.apiRoot, 'src/created.ts')
    const movedModule = join(fixture.apiRoot, 'src/moved.ts')
    await replaceFile(createdModule, `export const moduleValue = 'module-created'\n`)
    await replaceFile(fixture.createAppFile, createAppSource('./created'))
    await eventuallyJson(base, '/startup', { moduleValue: 'module-created', appValue: 'app-one', envValue: 'env-one' })
    await rename(createdModule, movedModule)
    await replaceFile(fixture.createAppFile, createAppSource('./moved'))
    await eventuallyJson(base, '/startup', { moduleValue: 'module-created', appValue: 'app-one', envValue: 'env-one' })
    const startsBeforeDelete = starts()
    await rm(fixture.startupFile)
    await waitForCount(starts, startsBeforeDelete + 1)
    await eventuallyJson(base, '/startup', { moduleValue: 'module-created', appValue: 'app-one', envValue: 'env-one' })
    const startsBeforeRecreate = starts()
    await replaceFile(fixture.startupFile, `export const moduleValue = 'module-unused'\n`)
    await waitForCount(starts, startsBeforeRecreate + 1)
    await eventuallyJson(base, '/startup', { moduleValue: 'module-created', appValue: 'app-one', envValue: 'env-one' })
    await replaceFile(fixture.createAppFile, createAppSource('./moved', 'app-two'))
    await eventuallyJson(base, '/startup', { moduleValue: 'module-created', appValue: 'app-two', envValue: 'env-one' })
    assert.equal(await artifactState(fixture.manifest), initialArtifact)

    await replaceFile(fixture.serverFile, serverSource('server-two'))
    await eventuallyText(base, '/server', 'server-two')
    assert.equal(await artifactState(fixture.manifest), initialArtifact)

    const ignoredStartCount = starts()
    await Promise.all([
      mkdir(join(fixture.apiRoot, 'src/__tests__'), { recursive: true }),
      mkdir(join(fixture.apiRoot, 'src/dist'), { recursive: true }),
      mkdir(join(fixture.apiRoot, 'src/.sprindle-contract-generated'), { recursive: true }),
      mkdir(join(fixture.apiRoot, 'src/node_modules/ignored'), { recursive: true }),
    ])
    await Promise.all([
      writeFile(join(fixture.apiRoot, 'src/__tests__/ignored.ts'), 'export const ignored = 1'),
      writeFile(join(fixture.apiRoot, 'src/ignored.test.ts'), 'export const ignored = 1'),
      writeFile(join(fixture.apiRoot, 'src/ignored.d.ts'), 'export declare const ignored: number'),
      writeFile(join(fixture.apiRoot, 'src/dist/generated.ts'), 'export const ignored = 1'),
      writeFile(join(fixture.apiRoot, 'src/.sprindle-contract-generated/generated.ts'), 'export const ignored = 1'),
      writeFile(join(fixture.apiRoot, 'src/node_modules/ignored/index.ts'), 'export const ignored = 1'),
    ])
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500))
    assert.equal(starts(), ignoredStartCount)
    assert.equal(await artifactState(fixture.manifest), initialArtifact)

    await replaceFile(fixture.envFile, `API_PORT=${port}\nPROOF_ENV_VALUE=env-two\nPROOF_BOOT_DELAY_MS=700\n`)
    await eventuallyJson(base, '/startup', { moduleValue: 'module-created', appValue: 'app-two', envValue: 'env-two' })
    const beforePendingEdit = boots()
    await replaceFile(fixture.createAppFile, createAppSource('./moved', 'app-pending'))
    await waitForCount(boots, beforePendingEdit + 1)
    await replaceFile(movedModule, `export const moduleValue = 'module-pending'\n`)
    await eventuallyJson(base, '/startup', { moduleValue: 'module-pending', appValue: 'app-pending', envValue: 'env-two' })
    await waitForCount(boots, beforePendingEdit + 2)
    assert.equal(await artifactState(fixture.manifest), initialArtifact)

    await replaceFile(fixture.envFile, `API_PORT=${port}\nPROOF_ENV_VALUE=env-three\nPROOF_BOOT_DELAY_MS=0\n`)
    await eventuallyJson(base, '/startup', { moduleValue: 'module-pending', appValue: 'app-pending', envValue: 'env-three' })
    await rm(fixture.envFile)
    await eventuallyJson(base, '/startup', { moduleValue: 'module-pending', appValue: 'app-pending', envValue: 'unset' })
    await replaceFile(fixture.envFile, `API_PORT=${port}\nPROOF_ENV_VALUE=env-four\nPROOF_BOOT_DELAY_MS=0\n`)
    await eventuallyJson(base, '/startup', { moduleValue: 'module-pending', appValue: 'app-pending', envValue: 'env-four' })
    assert.equal(await artifactState(fixture.manifest), initialArtifact)

    const startsBeforeRoute = starts()
    await writeFile(fixture.routeFile, `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => ({ version: 2 }) })\n`)
    const routeDeadline = Date.now() + 12_000
    while (Date.now() < routeDeadline) {
      const response = await fetch(`${base}/health`).catch(() => undefined)
      if (response?.status === 200 && JSON.stringify(await response.json()) === JSON.stringify({ version: 2 })) break
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
    }
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { version: 2 })
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 400))
    assert.equal(starts(), startsBeforeRoute + 1)
    assert.notEqual(await artifactState(fixture.manifest), initialArtifact)

    const startsBeforeInvalid = starts()
    await replaceFile(fixture.createAppFile, `export async function createApp() { return new Hono( }\n`)
    await waitForCount(starts, startsBeforeInvalid + 1)
    await waitForUnavailable(base)
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 400))
    assert.equal(starts(), startsBeforeInvalid + 1)
    assert.equal(child.exitCode, null)
    await replaceFile(fixture.createAppFile, createAppSource('./moved', 'app-recovered'))
    await eventuallyJson(base, '/startup', { moduleValue: 'module-pending', appValue: 'app-recovered', envValue: 'env-four' })
    assert.notEqual(await artifactState(fixture.manifest), initialArtifact)

    const exitCode = await stop(child, childClose)
    assert.equal(exitCode, 130)
    await waitForUnavailable(base, 300)
  } finally {
    if (child) await stop(child, childClose).catch(() => {})
    await rm(root, { recursive: true, force: true })
  }
})

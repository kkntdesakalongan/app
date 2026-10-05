import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { cpSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(webRoot, '../..')
const typescriptCompiler = createRequire(join(webRoot, 'package.json')).resolve('typescript/bin/tsc')
const temporaryRoots = []

function put(path, content) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'ensure-routes-contract-')))
  temporaryRoots.push(root)
  for (const file of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json', '.npmrc']) {
    const source = join(repoRoot, file)
    if (existsSync(source)) copyFileSync(source, join(root, file))
  }

  const sprindleSource = join(repoRoot, 'packages/sprindle')
  const sprindleRoot = join(root, 'packages/sprindle')
  cpSync(sprindleSource, sprindleRoot, {
    recursive: true,
    filter: (source) =>
      !relative(sprindleSource, source)
        .split(sep)
        .some((part) => ['node_modules', '.git', '.sprindle-package'].includes(part)),
  })
  symlinkSync(join(sprindleSource, 'node_modules'), join(sprindleRoot, 'node_modules'), 'dir')

  const apiRoot = join(root, 'apps/api')
  mkdirSync(apiRoot, { recursive: true })
  copyFileSync(join(repoRoot, 'apps/api/package.json'), join(apiRoot, 'package.json'))
  copyFileSync(join(repoRoot, 'apps/api/tsconfig.json'), join(apiRoot, 'tsconfig.json'))
  mkdirSync(join(apiRoot, 'scripts'), { recursive: true })
  copyFileSync(join(repoRoot, 'apps/api/scripts/ensure-tooling.mjs'), join(apiRoot, 'scripts/ensure-tooling.mjs'))
  symlinkSync(join(repoRoot, 'apps/api/node_modules'), join(apiRoot, 'node_modules'), 'dir')

  for (const name of ['web']) {
    const packageRoot = join(root, 'apps', name)
    mkdirSync(packageRoot, { recursive: true })
    copyFileSync(join(repoRoot, 'apps', name, 'package.json'), join(packageRoot, 'package.json'))
    symlinkSync(join(repoRoot, 'apps', name, 'node_modules'), join(packageRoot, 'node_modules'), 'dir')
  }
  for (const name of ['loom', 'sdk', 'utilities']) {
    const packageRoot = join(root, 'packages', name)
    mkdirSync(packageRoot, { recursive: true })
    copyFileSync(join(repoRoot, 'packages', name, 'package.json'), join(packageRoot, 'package.json'))
    if (name !== 'sdk') symlinkSync(join(repoRoot, 'packages', name, 'node_modules'), join(packageRoot, 'node_modules'), 'dir')
  }

  const workspaceModules = join(root, 'node_modules')
  mkdirSync(workspaceModules, { recursive: true })
  copyFileSync(join(repoRoot, 'node_modules/.modules.yaml'), join(workspaceModules, '.modules.yaml'))
  symlinkSync(join(repoRoot, 'node_modules/.pnpm'), join(workspaceModules, '.pnpm'), 'dir')
  const workspaceState = JSON.parse(readFileSync(join(repoRoot, 'node_modules/.pnpm-workspace-state-v1.json'), 'utf8'))
  workspaceState.projects = Object.fromEntries(
    Object.entries(workspaceState.projects).map(([path, project]) => [path === repoRoot || path.startsWith(`${repoRoot}${sep}`) ? resolve(root, relative(repoRoot, path)) : path, project])
  )
  writeFileSync(join(workspaceModules, '.pnpm-workspace-state-v1.json'), JSON.stringify(workspaceState))
  mkdirSync(join(workspaceModules, '@southneuhof'), { recursive: true })
  symlinkSync(apiRoot, join(workspaceModules, '@southneuhof/api'), 'dir')
  symlinkSync(join(root, 'packages/sdk'), join(workspaceModules, '@southneuhof/sdk'), 'dir')
  symlinkSync(sprindleRoot, join(workspaceModules, '@southneuhof/sprindle'), 'dir')
  symlinkSync(join(repoRoot, 'apps/api/node_modules/hono'), join(workspaceModules, 'hono'), 'dir')

  const guardPath = join(root, 'apps/web/scripts/ensure-routes-contract.mjs')
  mkdirSync(dirname(guardPath), { recursive: true })
  copyFileSync(join(webRoot, 'scripts/ensure-routes-contract.mjs'), guardPath)
  const sdkPath = join(root, 'packages/sdk/src/client.ts')
  mkdirSync(dirname(sdkPath), { recursive: true })
  copyFileSync(join(repoRoot, 'packages/sdk/src/client.ts'), sdkPath)
  put(join(apiRoot, 'src/shared/result.ts'), `export type Result = { state: string }\n`)
  put(
    join(apiRoot, 'src/routes/records/+server.ts'),
    `import { defineRoute } from '@southneuhof/sprindle'\nimport type { Result } from '../../shared/result'\nexport const GET = defineRoute({ action: (): Result => ({ state: 'current' }) })\n`
  )

  return { root, apiRoot, guardPath }
}

function runGuard(current) {
  return spawnSync(process.execPath, [current.guardPath], {
    cwd: join(current.root, 'apps/web'),
    encoding: 'utf8',
    env: { ...process.env },
  })
}

function compileConsumer(current, name, source) {
  const path = join(current.root, 'consumers', `${name}.ts`)
  put(path, source)
  const config = join(current.root, 'consumers/tsconfig.json')
  put(
    config,
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
        types: ['node'],
        typeRoots: [join(current.root, 'apps/web/node_modules/@types')],
      },
      files: [path],
    })
  )
  return spawnSync(process.execPath, [typescriptCompiler, '--pretty', 'false', '-p', config], { cwd: current.root, encoding: 'utf8' })
}

function responseConsumer(state, compare = false) {
  const proof = compare ? `if (output.state === ${JSON.stringify(state)}) throw new Error('unexpected response state')` : `const state: ${JSON.stringify(state)} = output.state\nvoid state`
  return `import type { InferResponseType } from 'hono/client'\nimport type { RpcClient } from '@southneuhof/sdk/client'\ntype Output = InferResponseType<RpcClient['records']['$get'], 200>\ndeclare const output: Output\n${proof}\n`
}

function routeConsumer(path) {
  return `import type { RpcClient } from '@southneuhof/sdk/client'\ndeclare const client: RpcClient\nvoid client${path}.$get\n`
}

function outputOf(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

function expectTypeError(result, code) {
  assert.notEqual(result.status, 0, outputOf(result))
  assert.match(outputOf(result), new RegExp(`error TS${code}:`))
}

test('refreshes the real SDK contract and follows live API source types', { timeout: 180_000 }, () => {
  const current = fixture()
  const first = runGuard(current)
  assert.equal(first.status, 0, `${outputOf(first)}\n${first.error?.stack ?? ''}`)
  const initialResponse = compileConsumer(current, 'initial-response', responseConsumer('other', true))
  assert.equal(initialResponse.status, 0, outputOf(initialResponse))

  const contractPath = join(current.apiRoot, '.sprindle/routes.ts')
  const firstSource = readFileSync(contractPath, 'utf8')
  const unchanged = runGuard(current)
  assert.equal(unchanged.status, 0, outputOf(unchanged))
  assert.equal(readFileSync(contractPath, 'utf8'), firstSource)

  put(join(current.apiRoot, 'src/shared/result.ts'), `export type Result = { state: 'current' }\n`)
  assert.equal(compileConsumer(current, 'live-new-response', responseConsumer('current')).status, 0)
  expectTypeError(compileConsumer(current, 'live-old-response', responseConsumer('other', true)), '2367')
  assert.equal(readFileSync(contractPath, 'utf8'), firstSource)

  const refreshed = runGuard(current)
  assert.equal(refreshed.status, 0, outputOf(refreshed))
  const newResponse = compileConsumer(current, 'new-response', responseConsumer('current'))
  assert.equal(newResponse.status, 0, outputOf(newResponse))
  expectTypeError(compileConsumer(current, 'old-response', responseConsumer('other', true)), '2367')

  put(join(current.apiRoot, 'src/routes/added/+server.ts'), `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => ({ added: true }) })\n`)
  const added = runGuard(current)
  assert.equal(added.status, 0, outputOf(added))
  assert.equal(compileConsumer(current, 'added-route', routeConsumer("['added']")).status, 0)

  mkdirSync(join(current.apiRoot, 'src/routes/archive'), { recursive: true })
  renameSync(join(current.apiRoot, 'src/routes/records/+server.ts'), join(current.apiRoot, 'src/routes/archive/+server.ts'))
  rmSync(join(current.apiRoot, 'src/routes/added'), { recursive: true })
  const movedAndDeleted = runGuard(current)
  assert.equal(movedAndDeleted.status, 0, outputOf(movedAndDeleted))
  assert.equal(compileConsumer(current, 'moved-route', routeConsumer("['archive']")).status, 0)
  expectTypeError(compileConsumer(current, 'old-route-path', routeConsumer("['records']")), '7053')
  expectTypeError(compileConsumer(current, 'deleted-route', routeConsumer("['added']")), '7053')

  const routePath = join(current.apiRoot, 'src/routes/archive/+server.ts')
  const routeSource = readFileSync(routePath, 'utf8')
  const sourceBeforeFailure = readFileSync(contractPath, 'utf8')
  put(routePath, `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => {\n`)
  const failedBuild = runGuard(current)
  assert.notEqual(failedBuild.status, 0, outputOf(failedBuild))
  assert.match(outputOf(failedBuild), /routes:build/)
  assert.equal(existsSync(contractPath), true)
  assert.equal(readFileSync(contractPath, 'utf8'), sourceBeforeFailure)
  put(routePath, routeSource)
  const recovered = runGuard(current)
  assert.equal(recovered.status, 0, outputOf(recovered))
  assert.equal(compileConsumer(current, 'recovered-route', routeConsumer("['archive']")).status, 0)
})

after(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true })
})

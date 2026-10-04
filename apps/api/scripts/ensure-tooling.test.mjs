import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const repositoryRoot = resolve(import.meta.dirname, '../../..')

function copy(source, target) {
  cpSync(source, target, { recursive: true, dereference: false })
}

function createWorkspace(t) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'carta-tooling-'))
  const workspaceRoot = realpathSync(temporaryRoot)
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }))

  const packageRoot = join(workspaceRoot, 'packages/sprindle')
  const apiRoot = join(workspaceRoot, 'apps/api')
  const counterPath = join(tmpdir(), `carta-tooling-builds-${process.pid}-${Date.now()}-${Math.random()}.log`)
  const preloadPath = join(workspaceRoot, 'count-builds.mjs')
  t.after(() => rmSync(counterPath, { force: true }))
  mkdirSync(join(workspaceRoot, 'packages'), { recursive: true })
  mkdirSync(join(apiRoot, 'scripts'), { recursive: true })
  for (const file of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json']) {
    copy(join(repositoryRoot, file), join(workspaceRoot, file))
  }
  mkdirSync(packageRoot, { recursive: true })
  for (const item of ['package.json', 'tsconfig.json', 'src', 'tooling']) {
    copy(join(repositoryRoot, 'packages/sprindle', item), join(packageRoot, item))
  }
  copy(join(repositoryRoot, 'apps/api/scripts/ensure-tooling.mjs'), join(apiRoot, 'scripts/ensure-tooling.mjs'))
  writeFileSync(preloadPath, "import { appendFileSync } from 'node:fs';const path=String(process.argv[1]??'').replaceAll('\\\\','/');if(path.endsWith('/typescript/bin/tsc')&&!process.argv.includes('--listFilesOnly')&&process.env.CARTA_TOOLING_BUILD_COUNT)appendFileSync(process.env.CARTA_TOOLING_BUILD_COUNT,'build\\n')\n")
  symlinkSync(join(repositoryRoot, 'packages/sprindle/node_modules'), join(packageRoot, 'node_modules'), 'dir')
  mkdirSync(join(apiRoot, 'node_modules/@southneuhof'), { recursive: true })
  symlinkSync(packageRoot, join(apiRoot, 'node_modules/@southneuhof/sprindle'), 'dir')
  writeFileSync(join(packageRoot, 'src/tooling/index.ts'), "export const fixtureValue = 'before'\n")
  const env = {
    ...process.env,
    CARTA_TOOLING_BUILD_COUNT: counterPath,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${pathToFileURL(preloadPath).href}`].filter(Boolean).join(' '),
  }
  return { workspaceRoot, packageRoot, apiRoot, env, counterPath }
}

function result(command, args, cwd, env = process.env) {
  const value = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 120_000 })
  assert.equal(value.error, undefined, value.error?.message)
  return { status: value.status, output: `${value.stdout}${value.stderr}` }
}

function resultAsync(command, args, cwd, env = process.env) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.setEncoding('utf8').on('data', (value) => output += value)
    child.stderr.setEncoding('utf8').on('data', (value) => output += value)
    child.once('error', reject)
    child.once('close', (status) => resolveResult({ status, output }))
  })
}

function ensureTooling(workspace) {
  return result(process.execPath, ['scripts/ensure-tooling.mjs'], workspace.apiRoot, workspace.env)
}

function ensureToolingAsync(workspace) {
  return resultAsync(process.execPath, ['scripts/ensure-tooling.mjs'], workspace.apiRoot, workspace.env)
}

function readConsumer(workspace) {
  return result(process.execPath, [
    '--input-type=module',
    '-e',
    "import { fixtureValue } from '@southneuhof/sprindle/tooling'; process.stdout.write(fixtureValue)",
  ], workspace.apiRoot)
}

function buildCount(workspace) {
  if (!existsSync(workspace.counterPath)) return 0
  return readFileSync(workspace.counterPath, 'utf8').trim().split('\n').filter(Boolean).length
}

function verifyPublishedPaths(packageRoot) {
  const packageManifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  for (const executable of Object.values(packageManifest.bin)) {
    const file = resolve(packageRoot, executable)
    assert.ok(existsSync(file), `${executable} is missing`)
    if (process.platform !== 'win32') assert.notEqual(statSync(file).mode & 0o111, 0, `${executable} is not executable`)
  }
  const maps = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name)
      if (entry.isDirectory()) visit(file)
      else if (entry.name.endsWith('.js.map')) maps.push(file)
    }
  }
  visit(join(packageRoot, 'dist-tooling'))
  assert.ok(maps.length > 0)
  for (const file of maps) {
    const map = JSON.parse(readFileSync(file, 'utf8'))
    for (const [index, source] of map.sources.entries()) {
      const sourcePath = resolve(dirname(file), map.sourceRoot ?? '', source)
      assert.ok(typeof map.sourcesContent?.[index] === 'string', `${relative(packageRoot, file)} has no embedded source for ${source}`)
      if (/\/src\/tooling\//.test(source)) assert.ok(existsSync(sourcePath), `${relative(packageRoot, file)} points to missing package source ${source}`)
    }
  }
}

function runPublishedCheck(workspace) {
  const apiRoot = workspace.apiRoot
  mkdirSync(join(apiRoot, 'src/routes'), { recursive: true })
  writeFileSync(join(apiRoot, 'src/routes/+server.ts'), 'export const GET = () => ({ ok: true })\n')
  writeFileSync(join(apiRoot, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', skipLibCheck: true }, include: ['src/**/*.ts'] }))
  const packageManifest = JSON.parse(readFileSync(join(workspace.packageRoot, 'package.json'), 'utf8'))
  const executable = resolve(workspace.packageRoot, packageManifest.bin['sprindle-routes-check'])
  return result(process.execPath, [executable, apiRoot, 'src/routes'], apiRoot)
}

test('preparation rebuilds changed source and reuses valid public outputs', (t) => {
  const workspace = createWorkspace(t)
  const initial = ensureTooling(workspace)
  assert.equal(initial.status, 0, initial.output)
  assert.equal(buildCount(workspace), 1)
  assert.equal(readConsumer(workspace).output, 'before')

  const unchanged = ensureTooling(workspace)
  assert.equal(unchanged.status, 0, unchanged.output)
  assert.equal(buildCount(workspace), 1)

  writeFileSync(join(workspace.packageRoot, 'src/tooling/index.ts'), "export const fixtureValue = 'after'\n")
  const refreshed = ensureTooling(workspace)
  assert.equal(refreshed.status, 0, refreshed.output)
  assert.equal(buildCount(workspace), 2)
  assert.equal(readConsumer(workspace).output, 'after')

  const configPath = join(workspace.packageRoot, 'tsconfig.json')
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  config.compilerOptions.pretty = false
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
  const configured = ensureTooling(workspace)
  assert.equal(configured.status, 0, configured.output)
  assert.equal(buildCount(workspace), 3)
  assert.equal(readConsumer(workspace).output, 'after')

  const lockPath = join(workspace.workspaceRoot, 'pnpm-lock.yaml')
  writeFileSync(lockPath, `${readFileSync(lockPath, 'utf8')}# dependency resolution input changed\n`)
  const dependencyGraph = ensureTooling(workspace)
  assert.equal(dependencyGraph.status, 0, dependencyGraph.output)
  assert.equal(buildCount(workspace), 4)
  assert.equal(readConsumer(workspace).output, 'after')

  const check = runPublishedCheck(workspace)
  assert.equal(check.status, 0, check.output)
  verifyPublishedPaths(workspace.packageRoot)
})

test('preparation repairs damaged compiler and declaration outputs', (t) => {
  const workspace = createWorkspace(t)
  const initial = ensureTooling(workspace)
  assert.equal(initial.status, 0, initial.output)
  const declaration = join(workspace.packageRoot, 'dist-types/index.d.ts')
  unlinkSync(declaration)

  const repairedDeclaration = ensureTooling(workspace)
  assert.equal(repairedDeclaration.status, 0, repairedDeclaration.output)
  assert.ok(existsSync(declaration))
  assert.equal(buildCount(workspace), 2)

  writeFileSync(join(workspace.packageRoot, 'dist-tooling/index.js'), 'damaged output')
  const repairedCompiler = ensureTooling(workspace)
  assert.equal(repairedCompiler.status, 0, repairedCompiler.output)
  assert.equal(readConsumer(workspace).output, 'before')
  assert.equal(buildCount(workspace), 3)
  verifyPublishedPaths(workspace.packageRoot)
})

test('a failed package build preserves usable prior outputs and receipt, then recovers', (t) => {
  const workspace = createWorkspace(t)
  const initial = ensureTooling(workspace)
  assert.equal(initial.status, 0, initial.output)
  const receiptPath = join(workspace.packageRoot, 'dist-tooling/package-state.json')
  const receipt = readFileSync(receiptPath)
  const indexPath = join(workspace.packageRoot, 'dist-tooling/index.js')
  const index = readFileSync(indexPath)
  writeFileSync(join(workspace.packageRoot, 'src/tooling/index.ts'), "const fixtureValue: string = 5; export { fixtureValue }\n")

  const failed = ensureTooling(workspace)
  assert.notEqual(failed.status, 0)
  assert.match(failed.output, /error|Error|failed/i)
  assert.deepEqual(readFileSync(receiptPath), receipt)
  assert.deepEqual(readFileSync(indexPath), index)
  assert.equal(readConsumer(workspace).output, 'before')
  assert.equal(buildCount(workspace), 2)

  writeFileSync(join(workspace.packageRoot, 'src/tooling/index.ts'), "export const fixtureValue = 'recovered'\n")
  const recovered = ensureTooling(workspace)
  assert.equal(recovered.status, 0, recovered.output)
  assert.equal(readConsumer(workspace).output, 'recovered')
  assert.equal(buildCount(workspace), 3)
})

test('concurrent preparation recovers an abandoned package lock and builds once', async (t) => {
  const workspace = createWorkspace(t)
  const departed = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' })
  const deadPid = departed.pid
  await once(departed, 'exit')
  const lockDirectory = join(workspace.packageRoot, '.sprindle-package/build-lock')
  mkdirSync(lockDirectory, { recursive: true })
  writeFileSync(join(lockDirectory, 'owner.json'), `${JSON.stringify({ schema: 1, pid: deadPid, root: workspace.packageRoot, token: 'abandoned', startedAt: Date.now() })}\n`)

  const [first, second] = await Promise.all([ensureToolingAsync(workspace), ensureToolingAsync(workspace)])
  assert.equal(first.status, 0, first.output)
  assert.equal(second.status, 0, second.output)
  assert.equal(buildCount(workspace), 1)
  assert.equal(readConsumer(workspace).output, 'before')
  assert.equal(existsSync(lockDirectory), false)
})

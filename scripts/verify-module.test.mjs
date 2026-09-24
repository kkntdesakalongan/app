import { copyCurrentOwners } from './test-support/bounded-fixture.mjs'
import { strict as assert } from 'node:assert'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import { integrate } from './integrate-bounded-module.mjs'
import { expectedGeneratedPaths, scaffold } from './scaffold-bounded-module.mjs'
import { execute, runCommand, verificationCommands, verify } from './verify-module.mjs'

const temporaryDirectories = []

function config() {
  return {
    kind: 'bounded-module',
    slug: 'test-catalog',
    table: 'test_catalog',
    symbol: 'TestCatalog',
    title: 'Test Catalog',
    singular: 'Test Catalog',
    properties: [
      { key: 'label', type: 'text', label: 'Label', required: true },
      { key: 'enabled', type: 'boolean', label: 'Enabled', default: true },
    ],
    actions: {
      list: { permission: 'list-test-catalog' },
      detail: { permission: 'detail-test-catalog' },
      create: { permission: 'create-test-catalog' },
      update: { permission: 'update-test-catalog' },
      delete: { permission: 'delete-test-catalog' },
    },
    surfaces: {
      display: { enabled: { renderer: 'chip', props: { options: { true: { label: 'Enabled' }, false: { label: 'Disabled' } } } } },
      list: { columns: { label: { sortable: true }, enabled: {} } },
      detail: { fields: { label: {}, enabled: {} } },
      create: { inputs: { label: { renderer: 'text' }, enabled: { renderer: 'switch', initialValue: true } } },
      update: { inputs: { label: { renderer: 'text' }, enabled: { renderer: 'switch' } } },
    },
    permissions: Object.fromEntries(['list', 'detail', 'create', 'update', 'delete'].map((action) => [`${action}-test-catalog`, {
      name: `${action} test catalog`,
      description: `${action} test catalog records.`,
    }])),
    navigation: { group: 'settings', after: 'settings-roles', title: 'Test Catalog', icon: 'folder' },
    seed: {
      records: [{ id: 'test-catalog-1', label: 'One', enabled: true }],
      updateFields: ['label', 'enabled'],
    },
    test: {
      record: { label: 'One', enabled: true },
      update: { label: 'Two' },
    },
  }
}

function writeFixtureFile(root, relativePath, contents) {
  const path = join(root, relativePath)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, contents)
}

function ownerFiles(root) {
  writeFixtureFile(root, 'apps/web/src/routes/(authenticated)/settings/index.route.vue', `<script setup lang="ts">
const entries = [
  ['number-configs', 'Number Configurations'],
] as const
</script>
`)
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'verify-module-'))
  temporaryDirectories.push(root)
  const value = config()
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(value, null, 2))
  scaffold(value, { root })
  ownerFiles(root)
  copyCurrentOwners(root)
  integrate(value, { root, apply: true })
  return { root, value }
}

test.afterEach(() => {
  while (temporaryDirectories.length) rmSync(temporaryDirectories.pop(), { recursive: true, force: true })
})

test('check-only verifies the generated module without changing files', () => {
  const setup = fixture()
  const paths = [
    ...expectedGeneratedPaths(setup.value, { root: setup.root }),
    join(setup.root, 'apps/api/src/domains.ts'),
    join(setup.root, 'apps/api/src/authorization/catalog.ts'),
    join(setup.root, 'apps/api/scripts/seed.ts'),
    join(setup.root, 'apps/web/src/manifest/navigation.ts'),
    join(setup.root, 'apps/web/src/routes/(authenticated)/settings/index.route.vue'),
  ]
  const before = new Map(paths.map((path) => [path, readFileSync(path, 'utf8')]))

  const result = verify(setup.value, { root: setup.root })
  assert.equal(result.status, 'PASS')
  assert.ok(result.static.checks.length > 10)
  assert.deepEqual(result.commands, [])
  const cliResult = JSON.parse(execute(['--manifest', 'manifest.json', '--check-only', '--json'], {
    root: setup.root,
    cwd: setup.root,
  }))
  assert.equal(cliResult.status, 'PASS')

  for (const [path, contents] of before) assert.equal(readFileSync(path, 'utf8'), contents)
})

test('verification evidence captures the active resource contract and UI guidance', () => {
  const setup = fixture()
  writeFixtureFile(setup.root, 'docs/resource_system_overhaul/ARCHITECTURE.md', 'resource contract\n')
  writeFixtureFile(setup.root, '.agents/skills/web-ui-surfaces/SKILL.md', 'surface guidance\n')
  writeFixtureFile(setup.root, '.github/workflows/web-validation.yml', 'browser gate\n')
  const result = verify(setup.value, { root: setup.root, reports: join(setup.root, 'reports', 'verification') })

  assert.equal(result.status, 'PASS')
  assert.equal(result.before.entries['docs/resource_system_overhaul/ARCHITECTURE.md'].kind, 'file')
  assert.equal(result.before.entries['.agents/skills/web-ui-surfaces/SKILL.md'].kind, 'file')
  assert.equal(result.before.entries['.github/workflows/web-validation.yml'].kind, 'file')
})

test('fails when a generated file is missing', () => {
  const setup = fixture()
  const missing = expectedGeneratedPaths(setup.value, { root: setup.root }).find((path) => path.endsWith('.routes.spec.ts'))
  rmSync(missing)
  const result = verify(setup.value, { root: setup.root })
  assert.equal(result.status, 'FAIL')
  assert.ok(result.static.failed.some((check) => check.name === 'generated files'))
  assert.deepEqual(result.commands, [])
})

test('fails on duplicate integration metadata and invalid manifests', () => {
  const setup = fixture()
  const navigationPath = join(setup.root, 'apps/web/src/manifest/navigation.ts')
  const navigation = readFileSync(navigationPath, 'utf8')
  const routeLine = navigation.split('\n').find((line) => line.includes("settings-test-catalog"))
  writeFileSync(navigationPath, navigation.replace(routeLine, `${routeLine}\n${routeLine}`))
  const duplicateResult = verify(setup.value, { root: setup.root })
  assert.equal(duplicateResult.status, 'FAIL')
  assert.ok(duplicateResult.static.failed.some((check) => check.name === 'navigation route'))

  assert.throws(() => verify({ ...setup.value, kind: 'other' }, { root: setup.root }), /kind must be bounded-module/)
})

test('prepares the test database before seeded verification', () => {
  const commands = verificationCommands(config(), { withSeed: true }).map(([command, args]) => [command, ...args].join(' '))
  assert.equal(commands[0], 'pnpm --filter @southneuhof/api db:seed:test')
  assert.equal(commands.filter((command) => command === 'pnpm --filter @southneuhof/api db:seed:test').length, 1)
  assert.equal(commands.some((command) => command === 'pnpm --filter @southneuhof/api db:migrate'), false)
})

test('verification commands include the generated API and browser proof specs', () => {
  const specs = verificationCommands(config(), { withSeed: false }).map(([command, args]) => [command, ...args].join(' '))
  assert.ok(specs.some((command) => command === 'pnpm --filter @southneuhof/api test:focused -- src/routes/(authenticated)/test-catalog/test-catalog.routes.spec.ts'), specs.join('\n'))
  assert.ok(specs.some((command) => command === 'pnpm --filter @southneuhof/framework-web test:e2e -- test-catalog.spec.ts'), specs.join('\n'))
  const apiLint = specs.find((command) => command.startsWith('pnpm --filter @southneuhof/api lint:focused'))
  assert.ok(apiLint.includes('src/routes/(authenticated)/test-catalog/test-catalog.routes.spec.ts'), apiLint)
  const webLint = specs.find((command) => command.startsWith('pnpm --filter @southneuhof/framework-web lint:focused'))
  assert.ok(webLint.includes('src/routes/(authenticated)/settings/test-catalog/test-catalog.resource.ts'), webLint)
  assert.ok(!webLint.includes('.integration.spec.ts'), webLint)
})

test('verification e2e command is absent when no browser file is generated', () => {
  const full = config()
  const value = {
    ...full,
    actions: { delete: full.actions.delete },
    permissions: { 'delete-test-catalog': full.permissions['delete-test-catalog'] },
    test: { record: full.test.record },
  }
  delete value.navigation
  delete value.surfaces
  const specs = verificationCommands(value, { withSeed: false }).map(([command, args]) => [command, ...args].join(' '))
  assert.equal(specs.some((command) => command.startsWith('pnpm --filter @southneuhof/framework-web test:e2e')), false)
})

test('accepts the pnpm lone separator before flags', () => {
  assert.throws(
    () => execute(['--', '--manifest', join('no-such-dir', 'missing.json'), '--check-only'], { root: tmpdir(), cwd: tmpdir() }),
    (error) => {
      assert.match(error.message, /ENOENT/)
      assert.doesNotMatch(error.message, /Unknown argument/)
      return true
    },
  )
})

test('reports command duration and timeout state', () => {
  const passed = runCommand(process.execPath, ['-e', ''], { cwd: process.cwd(), timeoutMs: 1000 })
  assert.equal(passed.status, 'PASS')
  assert.equal(passed.timedOut, false)
  assert.equal(typeof passed.durationMs, 'number')

  const timedOut = runCommand(process.execPath, ['-e', 'setTimeout(() => {}, 1000)'], { cwd: process.cwd(), timeoutMs: 100 })
  assert.equal(timedOut.status, 'FAIL')
  assert.equal(timedOut.timedOut, true)
})

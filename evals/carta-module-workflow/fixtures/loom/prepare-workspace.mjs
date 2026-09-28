import { copyFile, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtureRoot = dirname(fileURLToPath(import.meta.url))
const [workspaceValue, caseId, mode] = process.argv.slice(2)
const cases = {
  'loom-dependent-selection': {
    module: 'loom-dependent-selection.module.ts',
    service: 'loom-dependent-selection.services.ts',
    test: 'loom-dependent-selection.spec.ts',
  },
  'loom-transformed-update': {
    module: 'loom-transformed-update.module.ts',
    service: 'loom-transformed-update.services.ts',
    extra: 'loom-transformed-update-invalid-resource.ts',
    test: 'loom-transformed-update.spec.ts',
    routes: [
      ['routes/loom-eval-amounts/index.route.vue', 'apps/web/src/routes/(authenticated)/loom-eval-amounts/index.route.vue'],
      ['routes/loom-eval-amounts/edit/[amountId].route.vue', 'apps/web/src/routes/(authenticated)/loom-eval-amounts/edit/[amountId].route.vue'],
    ],
  },
  'loom-row-command': {
    module: 'loom-row-command.module.ts',
    service: 'loom-row-command.services.ts',
    test: 'loom-row-command.spec.ts',
  },
  'loom-create-only': {
    module: 'loom-create-only.module.ts',
    service: 'loom-create-only.services.ts',
    route: ['cases/loom-create-only.route.vue', 'apps/web/src/routes/(authenticated)/loom-eval-create-only/create.route.vue'],
    test: 'loom-create-only.spec.ts',
  },
  'loom-relation-source-freshness': {
    module: 'loom-relation-source-freshness.module.ts',
    service: 'loom-relation-source-freshness.services.ts',
    test: 'loom-relation-source-freshness.spec.ts',
  },
}

function usage() {
  throw new Error('Usage: node prepare-workspace.mjs <workspace> <case-id> <worker|reference|seeded-fail|grade>')
}

if (!workspaceValue || !caseId || !mode || !(caseId in cases) || !['worker', 'reference', 'seeded-fail', 'grade'].includes(mode)) usage()

const workspace = resolve(workspaceValue)
const fixture = cases[caseId]
const targetRoot = join(workspace, 'apps/web/src/framework/__eval/plan066')
const testRoot = join(workspace, 'apps/web/src/framework/__tests__')
const routesRoot = join(workspace, 'apps/web/src/routes/(authenticated)')

async function copy(sourceValue, targetValue) {
  const source = join(fixtureRoot, sourceValue)
  const target = join(workspace, targetValue)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
}

if (mode === 'grade') {
  await copy(`evaluator-only/${fixture.test}`, 'apps/web/src/framework/__tests__/loom-agent-eval.spec.ts')
  await copy('evaluator-only/harness.ts', 'apps/web/src/framework/__tests__/loom-agent-eval-harness.ts')
} else {
  await rm(targetRoot, { recursive: true, force: true })
  await rm(join(testRoot, 'loom-agent-eval.spec.ts'), { force: true })
  await rm(join(testRoot, 'loom-agent-eval-harness.ts'), { force: true })
  await rm(join(routesRoot, 'loom-eval-amounts'), { recursive: true, force: true })
  await rm(join(routesRoot, 'loom-eval-create-only'), { recursive: true, force: true })

  const fixtureSet = mode === 'worker' ? 'cases' : mode
  await copy(`${fixtureSet}/${fixture.module}`, `apps/web/src/framework/__eval/plan066/${fixture.module}`)
  await copy(`cases/${fixture.service}`, `apps/web/src/framework/__eval/plan066/${fixture.service}`)
  if (fixture.extra) await copy(`${fixtureSet}/${fixture.extra}`, `apps/web/src/framework/__eval/plan066/${fixture.extra}`)
  if (fixture.route) await copy(`${fixtureSet}/${fixture.route[0].split('/').at(-1)}`, fixture.route[1])
  if (fixture.routes) {
    for (const [source, target] of fixture.routes) await copy(source, target)
  }
}

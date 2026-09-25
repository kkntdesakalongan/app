import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync(new URL('../.github/workflows/web-validation.yml', import.meta.url), 'utf8')

function triggerSection(name) {
  const start = workflow.indexOf(`  ${name}:`)
  if (start < 0) throw new Error(`Missing ${name} trigger.`)
  const nextRoot = name === 'pull_request' ? '\n  push:' : '\npermissions:'
  const end = workflow.indexOf(nextRoot, start + 3)
  return workflow.slice(start, end < 0 ? workflow.length : end)
}

test('web validation triggers on frontend, tooling, and active contract changes', () => {
  for (const trigger of ['pull_request', 'push']) {
    const section = triggerSection(trigger)
    for (const path of [
      'apps/web/**',
      'packages/loom/**',
      'scripts/**',
      '.agents/skills/**',
      'README.md',
      'AGENTS.md',
      'DESIGN.md',
      'docs/ui/**',
      'docs/architecture/**',
      'docs/resource_system_overhaul/ARCHITECTURE.md',
      'pnpm-lock.yaml',
    ]) {
      assert.ok(section.includes(`- '${path}'`), `${trigger} must include ${path}`)
    }
  }
})

test('web validation runs both framework suites, tooling, browser, and type checks', () => {
  for (const command of [
    'pnpm test:surface-architecture',
    'pnpm --filter @southneuhof/loom type-check',
    'pnpm --filter @southneuhof/framework-web type-check',
    'pnpm --filter @southneuhof/loom test',
    'pnpm --filter @southneuhof/framework-web test',
    'pnpm test:module-tooling',
    'pnpm --filter @southneuhof/loom test:browser',
  ]) {
    assert.ok(workflow.includes(`run: ${command}`), `workflow must run ${command}`)
  }
  assert.ok(!workflow.includes('--filter=@southneuhof/framework-web --output-logs=errors-only'))
})

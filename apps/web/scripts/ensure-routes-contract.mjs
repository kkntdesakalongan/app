#!/usr/bin/env node
// Ensure the API route contract exists before web type-check runs.
// A missing contract makes rpc unknown and hides wrong keys until runtime.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(scriptDir, '..')
const repoRoot = resolve(webRoot, '..', '..')
const contractPath = resolve(repoRoot, 'apps/api/.sprindle/routes.d.ts')

// Return true only when the file exists, is not empty, and holds the marker.
export function isValid(path) {
  try {
    const content = readFileSync(path, 'utf8')
    return content.length > 0 && content.includes('RouteContract')
  } catch {
    return false
  }
}

function main() {
  if (isValid(contractPath)) {
    process.stdout.write('routes-contract: ok\n')
    return 0
  }
  const build = spawnSync('pnpm', ['--filter', '@southneuhof/api', 'routes:build'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (build.status !== 0) {
    process.stderr.write('routes-contract missing: run pnpm --filter @southneuhof/api routes:build\n')
    return build.status ?? 1
  }
  if (isValid(contractPath)) {
    process.stdout.write('routes-contract: ok\n')
    return 0
  }
  process.stderr.write('routes-contract missing: run pnpm --filter @southneuhof/api routes:build\n')
  return 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main())
}

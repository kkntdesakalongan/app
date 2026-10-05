#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(scriptDir, '..')
const repoRoot = resolve(webRoot, '..', '..')
const contractPath = resolve(repoRoot, 'apps/api/.sprindle/routes.ts')
const buildArguments = ['--filter', '@southneuhof/api', 'routes:build']
const buildCommand = `pnpm ${buildArguments.join(' ')}`

function main() {
  const build = spawnSync('pnpm', buildArguments, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (build.error || build.status !== 0) {
    process.stderr.write(`routes-contract: command failed: ${buildCommand}\n`)
    return build.status ?? 1
  }

  if (!existsSync(contractPath)) {
    process.stderr.write(`routes-contract: command did not create apps/api/.sprindle/routes.ts: ${buildCommand}\n`)
    return 1
  }

  process.stdout.write('routes-contract: ok\n')
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main())
}

#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(scriptDir, '..')
const repoRoot = resolve(webRoot, '..', '..')
const contractPath = resolve(repoRoot, 'apps/api/.sprindle/routes.ts')
const buildArguments = ['--filter', '@southneuhof/api', 'routes:build']
const buildCommand = `pnpm ${buildArguments.join(' ')}`

async function main() {
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

  try {
    const apiRequire = createRequire(resolve(repoRoot, 'apps/api/package.json'))
    const toolingEntry = apiRequire.resolve('@southneuhof/sprindle/tooling')
    const { verifyRouteImportAgreement } = await import(pathToFileURL(toolingEntry).href)
    await verifyRouteImportAgreement({
      producerRoot: resolve(repoRoot, 'apps/api'),
      consumerRoot: webRoot,
      consumerConfig: resolve(webRoot, 'tsconfig.vitest.json'),
    })
  } catch (error) {
    process.stderr.write(`routes-contract: ${error instanceof Error ? error.message : String(error)}\n`)
    return 1
  }

  process.stdout.write('routes-contract: ok\n')
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then(
    (status) => process.exit(status),
    (error) => {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
      process.exit(1)
    }
  )
}

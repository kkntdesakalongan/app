#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sprindleRoot = resolve(apiRoot, '../../packages/sprindle')

try {
  const stateModule = await import(pathToFileURL(resolve(sprindleRoot, 'tooling/package-state.mjs')).href)
  const inputs = stateModule.packageInputState(sprindleRoot)
  if (stateModule.packageIsCurrent(sprindleRoot, inputs)) process.exitCode = 0
  else {
    const tooling = spawnSync(process.execPath, ['tooling/package.mjs'], { cwd: sprindleRoot, stdio: 'inherit' })
    if (tooling.error) throw new Error('Sprindle tooling build could not start.', { cause: tooling.error })
    if (tooling.status !== 0) process.exitCode = tooling.status ?? 1
    else {
      const updatedInputs = stateModule.packageInputState(sprindleRoot)
      if (!stateModule.packageIsCurrent(sprindleRoot, updatedInputs)) throw new Error('Sprindle tooling preparation finished without current outputs.')
      process.exitCode = 0
    }
  }
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`)
  process.exitCode = 1
}

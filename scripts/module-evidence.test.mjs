import { strict as assert } from 'node:assert'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, afterEach } from 'node:test'

const roots = []
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'carta-evidence-')); roots.push(root)
  mkdirSync(join(root, 'src')); writeFileSync(join(root, 'src/a.txt'), 'before')
  return root
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

test('fingerprints detect edits to the same path, new files and deletions without Git', async () => {
  const { captureInputs, checkFreshness } = await import('./module-evidence.mjs')
  const root = fixture(), snapshot = captureInputs({ root, inputs: ['src'] })
  assert.equal(checkFreshness(snapshot).fresh, true)
  writeFileSync(join(root, 'src/a.txt'), 'after')
  assert.equal(checkFreshness(snapshot).fresh, false)
  writeFileSync(join(root, 'src/a.txt'), 'before')
  writeFileSync(join(root, 'src/new.txt'), 'new')
  assert.equal(checkFreshness(snapshot).fresh, false)
  rmSync(join(root, 'src/new.txt')); rmSync(join(root, 'src/a.txt'))
  assert.equal(checkFreshness(snapshot).fresh, false)
})

test('planned missing inputs become stale when generated, unrelated paths do not invalidate', async () => {
  const { captureInputs, checkFreshness } = await import('./module-evidence.mjs')
  const root = fixture(), snapshot = captureInputs({ root, inputs: ['src', 'new-model.ts'] })
  writeFileSync(join(root, 'unrelated.txt'), 'irrelevant')
  assert.equal(checkFreshness(snapshot).fresh, true)
  writeFileSync(join(root, 'new-model.ts'), 'new')
  assert.equal(checkFreshness(snapshot).fresh, false)
})

test('empty input sets, traversal and symlinks fail closed', async () => {
  const { captureInputs } = await import('./module-evidence.mjs')
  const root = fixture()
  assert.throws(() => captureInputs({ root, inputs: [] }), /input/i)
  assert.throws(() => captureInputs({ root, inputs: ['../outside'] }), /outside|within/i)
  symlinkSync('/tmp', join(root, 'src/link'))
  assert.throws(() => captureInputs({ root, inputs: ['src'] }), /symlink/i)
})

test('recording preserves failed output and refuses to overwrite evidence', async () => {
  const { recordCommand, checkFreshness } = await import('./module-evidence.mjs')
  const root = fixture(), output = join(root, 'reports/fail.json')
  const report = recordCommand(process.execPath, ['-e', 'console.error("failure detail"); process.exit(4)'], { root, inputs: ['src'], output, environment: 'local-fixture' })
  assert.equal(report.status, 'FAIL'); assert.equal(report.result.exitCode, 4)
  assert.match(readFileSync(`${output}.stderr.log`, 'utf8'), /failure detail/)
  assert.equal(checkFreshness(report).fresh, true)
  assert.throws(() => recordCommand(process.execPath, ['-e', ''], { root, inputs: ['src'], output, environment: 'local-fixture' }), /exist|overwrite/i)
})

test('command evidence retains full output and its working directory', async () => {
  const { runCommand } = await import('./module-evidence.mjs')
  const root = fixture()
  const result = runCommand(process.execPath, ['-e', 'process.stdout.write("x".repeat(5000))'], { cwd: root })
  assert.equal(result.output.length, 5000)
  assert.equal(result.cwd, root)
})

test('a passing command that changes its inputs is invalidated', async () => {
  const { recordCommand, checkFreshness } = await import('./module-evidence.mjs')
  const root = fixture()
  const report = recordCommand(process.execPath, ['-e', 'require("node:fs").writeFileSync("src/a.txt", "changed")'], { root, inputs: ['src'], output: join(root, 'reports/change.json'), environment: 'local-fixture' })
  assert.equal(report.result.status, 'PASS')
  assert.equal(report.status, 'INVALIDATED')
  assert.equal(checkFreshness(report).fresh, false)
})

test('output under a tracked input is rejected before the command executes', async () => {
  const { recordCommand } = await import('./module-evidence.mjs')
  const root = fixture()
  assert.throws(() => recordCommand(process.execPath, ['-e', 'throw Error("must not execute")'], { root, inputs: ['src'], output: join(root, 'src/report.json'), environment: 'local-fixture' }), /output|overlap/i)
})

test('log output cannot overlap a selected missing input', async () => {
  const { recordCommand } = await import('./module-evidence.mjs')
  const root = fixture(), output = join(root, 'reports/result.json')
  assert.throws(() => recordCommand(process.execPath, ['-e', ''], {
    root, inputs: ['src', 'reports/result.json.stdout.log'], output, environment: 'local-fixture',
  }), /output|overlap/i)
})

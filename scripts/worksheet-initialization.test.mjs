import { strict as assert } from 'node:assert'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test, afterEach } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const directories = []
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

test('worksheet initialization preserves existing work and rejects traversal', () => {
  const directory = mkdtempSync(join(tmpdir(), 'carta-worksheet-'))
  directories.push(directory)
  const tool = join(root, '.agents/skills/carta-module-development/scripts/init_worksheet.py')
  const target = join(directory, 'worksheet.md')
  const first = spawnSync('python3', [tool, 'inventory', '--path', target], { cwd: directory, encoding: 'utf8' })
  assert.equal(first.status, 0, first.stderr)
  assert.match(readFileSync(target, 'utf8'), /# inventory worksheet/)
  writeFileSync(target, 'ongoing work')
  const second = spawnSync('python3', [tool, 'inventory', '--path', target], { encoding: 'utf8' })
  assert.equal(second.status, 0)
  assert.equal(readFileSync(target, 'utf8'), 'ongoing work')
  const unsafe = spawnSync('python3', [tool, '../outside'], { cwd: directory, encoding: 'utf8' })
  assert.notEqual(unsafe.status, 0)
})

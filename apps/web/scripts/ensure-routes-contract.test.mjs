import { strict as assert } from 'node:assert'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { isValid } from './ensure-routes-contract.mjs'

const temporaryFiles = []

function fixture(name, content) {
  const directory = mkdtempSync(join(tmpdir(), 'ensure-routes-contract-'))
  const path = join(directory, name)
  if (content !== null) writeFileSync(path, content)
  temporaryFiles.push(directory)
  return path
}

test('missing contract file is invalid', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ensure-routes-contract-'))
  temporaryFiles.push(directory)
  assert.equal(isValid(join(directory, 'routes.d.ts')), false)
})

test('empty contract file is invalid', () => {
  const path = fixture('routes.d.ts', '')
  assert.equal(isValid(path), false)
})

test('contract file without marker is invalid', () => {
  const path = fixture('routes.d.ts', 'export type SomethingElse = string\n')
  assert.doesNotMatch('export type SomethingElse = string\n', /RouteContract/)
  assert.equal(isValid(path), false)
})

test('contract file with marker is valid', () => {
  const path = fixture('routes.d.ts', 'export type RouteContract = { path: "/api/health" }\n')
  assert.match('export type RouteContract = { path: "/api/health" }\n', /RouteContract/)
  assert.equal(isValid(path), true)
})

test.after(() => {
  for (const directory of temporaryFiles) rmSync(directory, { recursive: true, force: true })
})

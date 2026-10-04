import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

const repositoryRoot = resolve(import.meta.dirname, '..')
const extensionName = 'southneuhof.sprindle-language-0.0.0'
const executableModeTestSkip = process.platform === 'win32'
  ? 'Windows does not use POSIX executable permission bits.'
  : process.getuid?.() === 0
    ? 'A root process can bypass POSIX executable permission checks.'
    : false

function copy(source, target) {
  cpSync(source, target, { recursive: true, dereference: false })
}

function createWorkspace(t) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'carta-check-editor-'))
  const workspaceRoot = realpathSync(temporaryRoot)
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }))
  const packageRoot = join(workspaceRoot, 'packages/sprindle')
  const editorRoot = join(packageRoot, 'editor')
  const extensionRoot = join(workspaceRoot, '.vscode/extensions')
  mkdirSync(join(workspaceRoot, 'scripts'), { recursive: true })
  for (const name of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json', '.npmrc']) {
    const source = join(repositoryRoot, name)
    if (existsSync(source)) copy(source, join(workspaceRoot, name))
  }
  for (const name of ['package.json', 'tsconfig.json', 'src', 'tooling']) copy(join(repositoryRoot, 'packages/sprindle', name), join(packageRoot, name))
  for (const name of ['build.mjs', 'extension.cjs', 'install.mjs', 'package.json', 'state.mjs']) copy(join(repositoryRoot, 'packages/sprindle/editor', name), join(editorRoot, name))
  copy(join(repositoryRoot, 'scripts/check-editor.mjs'), join(workspaceRoot, 'scripts/check-editor.mjs'))
  symlinkSync(join(repositoryRoot, 'packages/sprindle/node_modules'), join(packageRoot, 'node_modules'), 'dir')
  mkdirSync(join(workspaceRoot, 'node_modules'), { recursive: true })
  symlinkSync(join(repositoryRoot, 'node_modules/.pnpm'), join(workspaceRoot, 'node_modules/.pnpm'), 'dir')
  return { workspaceRoot, packageRoot, editorRoot, extensionRoot, installed: join(extensionRoot, extensionName) }
}

function runInstaller(workspace) {
  const result = spawnSync(process.execPath, ['editor/install.mjs'], {
    cwd: workspace.packageRoot,
    env: { ...process.env, SPRINDLE_VSCODE_EXTENSIONS_DIR: workspace.extensionRoot },
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'The actual editor installer failed.')
}

function runCheck(workspace) {
  return spawnSync(process.execPath, ['scripts/check-editor.mjs'], {
    cwd: workspace.workspaceRoot,
    env: { ...process.env, SPRINDLE_VSCODE_EXTENSIONS_DIR: workspace.extensionRoot },
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
}

function fileState(root) {
  if (!existsSync(root)) return undefined
  const files = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
      const path = join(directory, entry.name)
      const relative = path.slice(root.length + 1).replaceAll('\\', '/')
      if (entry.isSymbolicLink()) files.push({ path: relative, target: readlinkSync(path) })
      else if (entry.isDirectory()) visit(path)
      else if (entry.isFile()) files.push({ path: relative, sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), mode: statSync(path).mode & 0o777 })
    }
  }
  visit(root)
  return files
}

function assertReadOnly(workspace, expectedMessage) {
  const before = fileState(workspace.installed)
  const result = runCheck(workspace)
  assert.equal(result.status, 0, result.stderr)
  const output = `${result.stdout}${result.stderr}`
  if (expectedMessage === undefined) assert.equal(output, '')
  else {
    assert.match(output, /pnpm setup:editor/)
    assert.match(output, expectedMessage)
  }
  assert.deepEqual(fileState(workspace.installed), before)
}

test('the read-only editor check accepts current files and advises on stale or incomplete installs', { timeout: 180_000 }, (t) => {
  const workspace = createWorkspace(t)
  runInstaller(workspace)
  const receiptPath = join(workspace.installed, 'dist/editor-state.json')
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
  assert.equal(receipt.schema, 2)
  assert.ok(receipt.inputs.fingerprint)
  assert.ok(receipt.payloads.some((payload) => payload.path === 'dist/language-server.mjs'))
  assert.ok(receipt.payloads.some((payload) => payload.path === 'extension.cjs'))
  assert.ok(receipt.payloads.some((payload) => payload.path === 'routes/definition.ts'))
  assert.ok(receipt.payloads.some((payload) => payload.path === 'dist-types/index.d.ts'))
  assertReadOnly(workspace)

  const sourcePath = join(workspace.packageRoot, 'src/tooling/index.ts')
  writeFileSync(sourcePath, `${readFileSync(sourcePath, 'utf8')}\nexport const editorFixtureChange = true\n`)
  assertReadOnly(workspace, /out of date or incomplete/)

  runInstaller(workspace)
  const currentReceipt = readFileSync(receiptPath)
  const serverPath = join(workspace.installed, 'dist/language-server.mjs')
  const currentServer = readFileSync(serverPath)
  const extensionPath = join(workspace.installed, 'extension.cjs')
  const currentExtension = readFileSync(extensionPath)
  rmSync(receiptPath)
  assertReadOnly(workspace, /out of date or incomplete/)
  writeFileSync(receiptPath, currentReceipt)

  rmSync(serverPath)
  assertReadOnly(workspace, /out of date or incomplete/)
  writeFileSync(serverPath, currentServer)

  writeFileSync(extensionPath, `${currentExtension.toString()}\n`)
  assertReadOnly(workspace, /out of date or incomplete/)
  writeFileSync(extensionPath, currentExtension)

  writeFileSync(receiptPath, '{')
  assertReadOnly(workspace, /setup:editor/)
  writeFileSync(receiptPath, currentReceipt)

  rmSync(receiptPath)
  mkdirSync(receiptPath)
  assertReadOnly(workspace, /setup:editor/)
  rmSync(receiptPath, { recursive: true })
  writeFileSync(receiptPath, currentReceipt)
})

test('the read-only editor check detects lost native compiler execute permissions', { skip: executableModeTestSkip, timeout: 180_000 }, (t) => {
  const workspace = createWorkspace(t)
  runInstaller(workspace)
  const platformCompiler = join(workspace.installed, 'node_modules/@typescript', `typescript-${process.platform}-${process.arch}`, 'lib/tsc')
  const originalMode = statSync(platformCompiler).mode & 0o777
  assert.notEqual(originalMode & 0o111, 0, 'The installed native compiler must start with execute permissions.')
  chmodSync(platformCompiler, originalMode & ~0o111)
  try {
    assertReadOnly(workspace, /out of date or incomplete/)
  } finally {
    chmodSync(platformCompiler, originalMode)
  }
})

test('an absent extension stays absent and does not create its override directory', { timeout: 30_000 }, (t) => {
  const workspace = createWorkspace(t)
  assert.equal(existsSync(workspace.extensionRoot), false)
  const result = runCheck(workspace)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, '')
  assert.equal(existsSync(workspace.extensionRoot), false)
})

test('a denied installed receipt read gives a bounded repair notice', { skip: process.platform === 'win32' || process.getuid?.() === 0, timeout: 180_000 }, (t) => {
  const workspace = createWorkspace(t)
  runInstaller(workspace)
  const before = fileState(workspace.installed)
  const targetInfo = lstatSync(workspace.installed)
  assert.ok(targetInfo.isDirectory())
  chmodSync(workspace.installed, 0)
  let result
  try {
    result = runCheck(workspace)
  } finally {
    chmodSync(workspace.installed, 0o755)
  }
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Could not verify the installed Sprindle VS Code extension \(EACCES\)/)
  assert.match(result.stdout, /pnpm setup:editor/)
  assert.deepEqual(fileState(workspace.installed), before)
})

import chokidar, { type FSWatcher } from 'chokidar'
import { lstatSync } from 'node:fs'
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path'

const runtimeExtensions = new Set(['.cjs', '.cts', '.js', '.json', '.jsx', '.mjs', '.mts', '.ts', '.tsx'])
const generatedDirectories = new Set(['.cache', '.git', '.sprindle', '.sprindle-dev', '.turbo', '.vite', '__generated__', 'build', 'coverage', 'dist', 'dist-tooling', 'dist-types', 'generated', 'node_modules'])
const testDirectories = new Set(['__mocks__', '__tests__', 'test', 'tests'])

function inside(root: string, file: string) {
  const path = relative(root, file)
  return path === '' || !isAbsolute(path) && !path.split(sep).includes('..')
}

function ignoredSourcePath(sourceRoot: string, file: string) {
  if (!inside(sourceRoot, file)) return true
  const path = relative(sourceRoot, file)
  if (!path) return false
  const parts = path.split(sep)
  if (parts.some((part) => part.startsWith('.sprindle') || generatedDirectories.has(part) || testDirectories.has(part))) return true
  const name = basename(file)
  if (/\.d\.(?:ts|mts|cts)$/i.test(name) || /(?:^|\.)(?:test|spec)(?:\.|$)/i.test(name)) return true
  let directory = false
  try { directory = lstatSync(file).isDirectory() } catch { directory = false }
  if (directory) return false
  return !runtimeExtensions.has(extname(name).toLowerCase())
}

export type RuntimeWatcher = {
  ready: Promise<void>
  close: () => Promise<void>
}

export function watchRuntime(projectRoot: string, onChange: (file: string) => void, onError: (error: Error) => void): RuntimeWatcher {
  const project = resolve(projectRoot)
  const sourceRoot = resolve(project, 'src')
  const envFile = resolve(project, '.env')
  let closed = false
  let ready = false
  let resolveReady: (() => void) | undefined
  let rejectReady: ((error: Error) => void) | undefined
  const readiness = new Promise<void>((resolvePromise, rejectPromise) => {
    resolveReady = resolvePromise
    rejectReady = rejectPromise
  })
  const watcher: FSWatcher = chokidar.watch(project, {
    atomic: true,
    followSymlinks: false,
    ignoreInitial: true,
    ignored: (path) => {
      const file = resolve(path)
      if (file === project || file === envFile) return false
      if (!inside(project, file)) return true
      const pathFromRoot = relative(project, file)
      if (pathFromRoot.split(sep)[0] !== 'src') return true
      return ignoredSourcePath(sourceRoot, file)
    },
    persistent: true,
  })
  watcher.once('ready', () => {
    ready = true
    resolveReady?.()
    resolveReady = undefined
    rejectReady = undefined
  })
  watcher.on('error', (error: Error) => {
    if (!ready && !closed) {
      rejectReady?.(error)
      resolveReady = undefined
      rejectReady = undefined
      return
    }
    if (!closed) onError(error)
  })
  watcher.on('all', (event, path) => {
    if (closed || !ready || !['add', 'change', 'unlink'].includes(event)) return
    const file = resolve(path)
    if (file !== envFile && ignoredSourcePath(sourceRoot, file)) return
    onChange(file)
  })

  return {
    ready: readiness,
    close: async () => {
      if (closed) return
      closed = true
      resolveReady?.()
      resolveReady = undefined
      rejectReady = undefined
      await watcher.close()
    },
  }
}

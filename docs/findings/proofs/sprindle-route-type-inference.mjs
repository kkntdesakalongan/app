import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, relative, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const repo = resolve(import.meta.dirname, '../../..')
const { routeLanguageOverlay } = await import(pathToFileURL(join(repo, 'packages/sprindle/src/tooling/language.ts')).href)
const { readRouteDirectory } = await import(pathToFileURL(join(repo, 'packages/sprindle/src/tooling/route-files.ts')).href)
const project = mkdtempSync(join(tmpdir(), 'carta-route-inference-'))
const compiler = join(dirname(createRequire(join(repo, 'package.json')).resolve('typescript/package.json')), 'bin/tsc')
const framework = join(repo, 'packages/sprindle')
const generatedFiles = []
const results = []
const put = (file, source) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, source) }
const file = (path) => join(project, path)
const sdkSource = readFileSync(join(repo, 'packages/sdk/src/client.ts'), 'utf8')

function config(name, files) {
  const path = file(`${name}.json`)
  put(path, JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', allowImportingTsExtensions: true, types: ['node'] }, files: files.map(file) }))
  return path
}

function check(name, files, expected, pattern) {
  const run = spawnSync(process.execPath, [compiler, '-p', config(name, files), '--pretty', 'false', '--singleThreaded'], { encoding: 'utf8', cwd: project })
  const diagnostics = `${run.stdout}${run.stderr}`
  assert.equal(Boolean(run.status), Boolean(expected), `${name}: ${diagnostics}`)
  if (pattern) assert.match(diagnostics, pattern)
  results.push({ name, exit: run.status, diagnostics: diagnostics.trim() })
}

function consumer(path, source) {
  put(file(path), `import { createRpcClient } from './sdk.ts'\nconst client = createRpcClient('http://localhost')\n${source}\n`)
}

async function manifest(root, destination, sdkDestination) {
  const model = await readRouteDirectory(root)
  const imports = model.routes.map((route, index) => `import * as route${index} from ${JSON.stringify(route.sourcePath)}`).concat(model.scopes.map((scope, index) => `import scope${index} from ${JSON.stringify(scope)}`))
  const entries = model.routes.map((route, index) => `{sourcePath:${JSON.stringify(relative(root, route.sourcePath))},httpPath:${JSON.stringify(route.httpPath)} as const,parameters:${JSON.stringify(route.parameters)},methods:${JSON.stringify(route.methods)},scopes:[${route.scopes.map((scope) => `scope${model.scopes.indexOf(scope)}`).join(',')}],handlers:route${index}}`)
  put(destination, `${imports.join('\n')}\nimport type { FileRouteManifest } from '@southneuhof/sprindle/hono'\nconst manifest = [${entries.join(',')}] satisfies FileRouteManifest\ntype Entry<T> = T extends { httpPath: infer P extends string; handlers: infer H } ? { [M in keyof H & ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS')]: { path: P; method: Lowercase<M>; definition: H[M] } }[keyof H & ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS')] : never\nexport type RouteContract = Entry<(typeof manifest)[number]>\nexport default manifest\n`)
  const specifier = './' + relative(dirname(sdkDestination), destination).split(sep).join('/')
  put(sdkDestination, sdkSource.replace('@southneuhof/api/routes-contract', specifier))
}

function projectRoutes(base = project, routes = 'routes', output = file('generated/routes')) {
  const root = resolve(base, routes)
  const overlay = routeLanguageOverlay(base, routes, new Map(), join(framework, 'src/routes/definition.ts'), join(framework, 'dist-types/index.d.ts'))
  const mapped = (path) => path.startsWith(root + sep) ? join(output, relative(root, path)).replace(/\.([rs])\.d\.ts$/, '.$1.ts') : path
  for (const [path, text] of overlay) {
    if (!path.startsWith(root + sep)) continue
    let source = text.replace(/(from\s*|import\()(["'])([^"']+)\2/g, (whole, prefix, quote, specifier) => {
      if (!specifier.startsWith('.')) return whole
      const target = mapped(resolve(dirname(path), specifier))
      return `${prefix}${JSON.stringify(target)}`
    })
    if (/\.[rs]\.d\.ts$/.test(path)) {
      source = source.replace(/^export \* from .*$/m, `export * from '@southneuhof/sprindle'\nimport * as runtime from '@southneuhof/sprindle'`)
      source = source.replace(/export declare const (\w+): ([^\n]+)/g, 'export const $1 = runtime.$1 as $2')
    }
    const destination = mapped(path)
    put(destination, source)
    generatedFiles.push(destination)
  }
  return output
}

try {
  mkdirSync(file('node_modules'), { recursive: true })
  for (const name of ['hono', 'zod']) symlinkSync(join(framework, 'node_modules', name), file(`node_modules/${name}`), 'dir')
  symlinkSync(join(framework, 'node_modules/@types'), file('node_modules/@types'), 'dir')
  mkdirSync(file('node_modules/@southneuhof'), { recursive: true })
  symlinkSync(framework, file('node_modules/@southneuhof/sprindle'), 'dir')
  put(file('package.json'), '{"type":"module"}')
  put(file('tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler' }, include: ['routes/**/*.ts'] }))
  put(file('version.ts'), 'export type Version = number\n')
  put(file('schema.ts'), `import { z } from 'zod'\nimport type { Version } from './version'\nexport const select = z.object({ id: z.string(), age: z.string(), version: z.custom<Version>() })\nexport const createInput = z.object({ name: z.string(), age: z.number().transform(String) })\nexport const publicSelect = select.extend({ label: z.string() })\n`)
  put(file('simple/+server.ts'), `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => ({ name: 'Ada' }) })\n`)
  await manifest(file('simple'), file('simple-manifest.ts'), file('simple-sdk.ts'))
  put(file('simple-valid.ts'), `import { createRpcClient } from './simple-sdk.ts'\nconst client = createRpcClient('http://localhost')\nconst response = await client.index.$get()\nif (response.status === 200) { const name: string = (await response.json()).name; void name }\n`)
  put(file('simple-invalid.ts'), readFileSync(file('simple-valid.ts'), 'utf8').replace('name: string', 'name: number'))
  check('simple-inference-valid', ['simple-valid.ts'], 0)
  check('simple-inference-invalid', ['simple-invalid.ts'], 1, /TS2322/)
  put(file('routes/+scope.ts'), `import { defineScope } from '@southneuhof/sprindle'\nimport { select, createInput } from '../schema'\nexport default defineScope({ context: () => ({ owner: 'Ada', replaced: 1 }), entity: { source: { list: async () => ({ data: [], total: 0 }), detail: async () => null, create: async () => ({ id: 'one', age: '21', version: 1 }), update: async () => null, delete: async () => false, materialize: async () => ({ id: 'one', age: '21', version: 1 }) }, schemas: { select, create: createInput, update: createInput.partial() } } })\n`)
  put(file('routes/users/+scope.ts'), `import { defineScope } from '@southneuhof/sprindle'\nimport { publicSelect } from '../../schema'\nexport default defineScope({ context: ({ context }) => ({ owner: context.owner, replaced: 'child' }), enrich: { schema: publicSelect, run: record => ({ ...record, label: record.id }) } })\n`)
  put(file('routes/users/+server.ts'), `import { list, create } from '@southneuhof/sprindle'\nexport const GET = list()\nexport const POST = create()\n`)
  put(file('routes/users/[id]/+server.ts'), `import { defineRoute, update, deleteRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: ({ c, context, params }) => c.json({ id: params.id, owner: context.owner, replaced: context.replaced }, 202) })\nexport const PATCH = update({ param: 'id' })\nexport const DELETE = deleteRoute({ param: 'id' })\n`)
  put(file('naive-routes/+server.ts'), readFileSync(file('routes/users/+server.ts'), 'utf8'))
  await manifest(file('naive-routes'), file('naive-manifest.ts'), file('naive/sdk.ts'))
  consumer('naive/invalid-input.ts', `await client.index.$post({ json: { unexpected: true } })`)
  check('naive-crud-accepts-invalid-input', ['naive/invalid-input.ts'], 0)
  await manifest(file('routes'), file('naive-manifest.ts'), file('naive/sdk.ts'))
  consumer('naive/context.ts', `await client.users[':id'].$get({ param: { id: 'one' } })`)
  check('naive-scope-context-fails', ['naive/context.ts'], 1, /TS18046|TS2339/)
  const output = projectRoutes()
  await manifest(output, file('generated/manifest.ts'), file('generated/sdk.ts'))
  generatedFiles.push(file('generated/manifest.ts'))
  consumer('generated/valid.ts', `await client.users.$post({ json: { name: 'Ada', age: 21 } })\nawait client.users[':id'].$patch({ json: { age: 22 }, param: { id: 'one' } })\nawait client.users[':id'].$delete({ param: { id: 'one' } })\nconst listResponse = await client.users.$get({ query: {} })\nif (listResponse.status === 200) { const row = (await listResponse.json()).data[0]; const label: string = row.label; const age: string = row.age; const version: number = row.version; void [label, age, version] }\nconst response = await client.users[':id'].$get({ param: { id: 'one' } })\nif (response.status === 202) { const row = await response.json(); const owner: string = row.owner; const replaced: string = row.replaced; const id: string = row.id; void [owner, replaced, id] }`)
  check('projected-sdk-valid', ['generated/valid.ts'], 0)
  const negatives = {
    'wrong-create-input': `await client.users.$post({ json: { name: 'Ada', age: '21' } })`,
    'missing-param': `await client.users[':id'].$get({ param: {} })`,
    'unknown-endpoint': `await client.missing.$get()`,
    'wrong-output': `const response = await client.users.$get({ query: {} }); if (response.status === 200) { const label: number = (await response.json()).data[0].label; void label }`,
  }
  for (const [name, source] of Object.entries(negatives)) { consumer(`generated/${name}.ts`, source); check(name, [`generated/${name}.ts`], 1, /TS2322|TS2339|TS2741/) }
  const identity = () => createHash('sha256').update(generatedFiles.map(path => readFileSync(path)).join('\n')).digest('hex')
  const before = identity()
  put(file('version.ts'), 'export type Version = number | string\n')
  check('type-only-edit-invalidates-old-consumer', ['generated/valid.ts'], 1, /TS2322.*Type 'Version' is not assignable to type 'number'/)
  consumer('generated/changed.ts', `const response = await client.users.$get({ query: {} }); if (response.status === 200) { const version: number | string = (await response.json()).data[0].version; void version }`)
  check('type-only-edit-current-consumer', ['generated/changed.ts'], 0)
  assert.equal(identity(), before)
  results.push({ name: 'generated-server-files-unchanged-after-type-only-edit', hash: before })
  const esbuild = createRequire(join(framework, 'package.json'))('esbuild')
  const bundled = await esbuild.build({ entryPoints: [file('generated/changed.ts')], bundle: true, platform: 'browser', format: 'esm', write: false, metafile: true, logLevel: 'silent' })
  const inputs = Object.keys(bundled.metafile.inputs)
  assert.ok(inputs.every(path => !path.endsWith('+server.ts') && !path.endsWith('+scope.ts') && !path.endsWith('manifest.ts') && !path.endsWith('schema.ts')))
  results.push({ name: 'browser-bundle-excludes-server-runtime', inputs })
  const { Hono } = createRequire(join(framework, 'package.json'))('hono')
  const { installSprindle } = await import(pathToFileURL(join(framework, 'src/hono/index.ts')).href)
  const generatedManifest = (await import(pathToFileURL(file('generated/manifest.ts')).href)).default
  const app = installSprindle(new Hono(), generatedManifest)
  const http = await app.request('/users/one')
  assert.equal(http.status, 202)
  assert.deepEqual(await http.json(), { id: 'one', owner: 'Ada', replaced: 'child' })
  results.push({ name: 'same-generated-manifest-handles-http-request', status: http.status })
  const actualRoot = projectRoutes(join(repo, 'apps/api'), 'src/routes', file('actual/routes'))
  symlinkSync(join(repo, 'apps/api/node_modules'), file('actual/node_modules'), 'dir')
  await manifest(actualRoot, file('actual/manifest.ts'), file('actual/sdk.ts'))
  consumer('actual/consumer.ts', `const response = await client.users.list.$get({ query: {} }); if (response.status === 200) { const name: string = (await response.json()).data[0].name; void name }`)
  put(file('actual-check.json'), JSON.stringify({ extends: join(repo, 'apps/web/tsconfig.app.json'), compilerOptions: { incremental: false, composite: false, noEmit: true }, include: [], exclude: [], files: [file('actual/consumer.ts')] }))
  const actualRun = spawnSync(process.execPath, [compiler, '-p', file('actual-check.json'), '--pretty', 'false', '--singleThreaded', '--extendedDiagnostics'], { encoding: 'utf8', cwd: project, maxBuffer: 4 * 1024 * 1024 })
  assert.equal(actualRun.status, 0, `${actualRun.stdout}${actualRun.stderr}`)
  results.push({ name: 'actual-api-under-web-compiler-options', routes: (await readRouteDirectory(actualRoot)).routes.length, exit: actualRun.status, diagnostics: `${actualRun.stdout}${actualRun.stderr}`.trim() })
  const actualInvalid = readFileSync(file('actual/consumer.ts'), 'utf8').replace('name: string', 'name: number')
  put(file('actual/invalid.ts'), actualInvalid)
  put(file('actual-invalid.json'), JSON.stringify({ extends: file('actual-check.json'), files: [file('actual/invalid.ts')] }))
  const invalidRun = spawnSync(process.execPath, [compiler, '-p', file('actual-invalid.json'), '--pretty', 'false', '--singleThreaded'], { encoding: 'utf8', cwd: project })
  assert.notEqual(invalidRun.status, 0)
  assert.match(invalidRun.stdout, /TS2322/)
  results.push({ name: 'actual-api-rejects-wrong-response-type', exit: invalidRun.status, diagnostics: invalidRun.stdout.trim() })
  put(file('baseline.ts'), `import { createRpcClient } from ${JSON.stringify(join(repo, 'packages/sdk/src/client.ts'))}\nconst client = createRpcClient('http://localhost')\nconst response = await client.users.list.$get({ query: {} }); if (response.status === 200) { const name: string = (await response.json()).data[0].name; void name }\n`)
  put(file('baseline-check.json'), JSON.stringify({ extends: file('actual-check.json'), compilerOptions: { types: ['node'] }, files: [file('baseline.ts')] }))
  const baselineRun = spawnSync(process.execPath, [compiler, '-p', file('baseline-check.json'), '--pretty', 'false', '--singleThreaded', '--extendedDiagnostics'], { encoding: 'utf8', cwd: project, maxBuffer: 4 * 1024 * 1024 })
  assert.equal(baselineRun.status, 0, `${baselineRun.stdout}${baselineRun.stderr}`)
  results.push({ name: 'current-declaration-consumer-comparison', exit: baselineRun.status, diagnostics: `${baselineRun.stdout}${baselineRun.stderr}`.trim() })
  put(file('source-comparison.json'), JSON.stringify({ extends: file('baseline-check.json'), files: [file('actual/consumer.ts')] }))
  const sourceRun = spawnSync(process.execPath, [compiler, '-p', file('source-comparison.json'), '--pretty', 'false', '--singleThreaded', '--extendedDiagnostics'], { encoding: 'utf8', cwd: project, maxBuffer: 4 * 1024 * 1024 })
  assert.equal(sourceRun.status, 0, `${sourceRun.stdout}${sourceRun.stderr}`)
  results.push({ name: 'projected-source-consumer-comparison', exit: sourceRun.status, diagnostics: `${sourceRun.stdout}${sourceRun.stderr}`.trim() })
  console.log(JSON.stringify({ node: process.version, compiler: createRequire(join(repo, 'package.json'))('typescript/package.json').version, results }, null, 2))
} finally {
  rmSync(project, { recursive: true, force: true })
}

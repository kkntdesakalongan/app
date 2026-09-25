import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { checkUiContract, checkResourceDisplay, checkResourceRowOps } from './module-ui-check.mjs'

const contract = { surfaces: [{ file: 'page.vue', kind: 'detail', components: [{ name: 'DetailView', from: '@southneuhof/loom' }] }] }
const page = '<script setup lang="ts">import { DetailView as RecordView, Button } from "@southneuhof/loom"</script><template><RecordView><template #controls><Button>Close</Button></template></RecordView></template>'
const check = (source, selected = contract) => checkUiContract(selected, { read: () => source })

test('requires rendered framework imports and resolves capitalized native names', () => {
  assert.deepEqual(check(page).errors, [])
  assert.deepEqual(check(page).review, [])
  for (const source of [
    page.replace(', Button', ''),
    page.replaceAll('<RecordView>', '<section>').replaceAll('</RecordView>', '</section>'),
    page.replace('@southneuhof/loom', './local-copy'),
    page.replace('import {', 'import type {'),
  ]) assert.ok(check(source).errors.length, source)
  assert.deepEqual(check(page.replace('<Button>Close</Button>', '<button>Close</button>')).errors, [])
  assert.deepEqual(check(page.replaceAll('RecordView>', 'record-view>')).errors, [])
})

test('source CLI checks nested pages without a contract and detects missing imports', t => {
  const root = mkdtempSync(join(tmpdir(), 'carta-ui-sources-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'detail'))
  writeFileSync(join(root, 'detail.route.vue'), page)
  const child = join(root, 'detail', 'index.route.vue')
  const run = (...paths) => spawnSync(process.execPath,
    [fileURLToPath(new URL('./module-ui-check.mjs', import.meta.url)), '--sources', ...paths], { encoding: 'utf8' })
  writeFileSync(child, page)
  assert.equal(run(root).status, 0)
  writeFileSync(child, page.replace(', Button', ''))
  const broken = run(root)
  assert.equal(broken.status, 1)
  assert.match(broken.stderr, /detail\/index\.route\.vue:1: unresolved component <Button>/)
  writeFileSync(child, page.replace('<Button>Close</Button>', '<input type="file">'))
  const raw = run(root)
  assert.equal(raw.status, 2)
  assert.match(raw.stdout, /native <input>/)
  assert.equal(run(child).status, 2)
  assert.equal(run().status, 1)
  assert.equal(run(join(root, 'missing.vue')).status, 1)
})

test('native interactive controls need source review with file and line', () => {
  const raw = {
    button: page.replace('<Button>Close</Button>', '<button>Close</button>'),
    input: page.replace('<Button>Close</Button>', '<input type="text" value="Close">'),
    select: page.replace('<Button>Close</Button>', '<select><option>Close</option></select>'),
    textarea: page.replace('<Button>Close</Button>', '<textarea>Close</textarea>'),
  }
  for (const [tag, source] of Object.entries(raw)) {
    const result = check(source)
    assert.deepEqual(result.errors, [], tag)
    assert.equal(result.review.length, 1, tag)
    assert.match(result.review[0], new RegExp(`^page\\.vue:1: native <${tag}> needs source review`))
  }
  // A gap explains the requirement but the reviewer still resolves the item.
  const selected = structuredClone(contract)
  selected.surfaces[0].gap = 'A requirement for review'
  const gapped = check(raw.button, selected)
  assert.deepEqual(gapped.errors, [])
  assert.equal(gapped.review.length, 2)
  assert.ok(gapped.review.some(item => item.includes('native <button> needs source review')))
})

test('hidden inputs and layout elements stay silent', () => {
  const silent = [
    page,
    page.replace('<Button>Close</Button>', '<input type="hidden" value="token">'),
    page.replace('<Button>Close</Button>', '<INPUT TYPE="HIDDEN" value="token">'),
    page.replace('<Button>Close</Button>', '<section><div><span>Close</span></div></section>'),
  ]
  for (const source of silent) assert.deepEqual(check(source).review, [], source)
  const needsReview = [
    page.replace('<Button>Close</Button>', '<input value="Close">'),
    page.replace('<Button>Close</Button>', '<input :type="kind" value="Close">'),
    page.replace('<Button>Close</Button>', '<input v-bind="fields" value="Close">'),
  ]
  for (const source of needsReview) {
    const result = check(source)
    assert.deepEqual(result.errors, [], source)
    assert.equal(result.review.length, 1, source)
    assert.match(result.review[0], /^page\.vue:1: native <input> needs source review/)
  }
})

test('requires a concrete Create override and rejects unused exceptions', () => {
  const source = page.replace('#controls', '#create-action')
  assert.ok(check(source).errors.some(error => error.includes('Create override')))
  const selected = structuredClone(contract)
  selected.surfaces[0].extensions = [{ slot: 'create-action', reason: 'Requested split Create menu' }]
  assert.deepEqual(check(source, selected).errors, [])
  assert.equal(check(source, selected).review.length, 1)
  assert.ok(check(page, selected).errors.length)
})

test('global declarations require source registration, not a type or stub', () => {
  const selected = { ...contract, globals: [{ tag: 'SharedWidget', registration: 'main.ts' }] }
  const source = page.replace('<Button>', '<SharedWidget>').replace('</Button>', '</SharedWidget>')
  for (const registration of ['app.component("SharedWidget", Widget)', 'interface GlobalComponents { SharedWidget: Widget }']) {
    const result = checkUiContract(selected, { read: file => file === 'main.ts' ? registration : source })
    assert.equal(result.errors.length === 0, registration.startsWith('app.component'))
  }
})


test('resource display checks follow aliases, spreads, raw schemas, and independent surface maps', t => {
  const root = mkdtempSync(join(tmpdir(), 'carta-ui-display-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'apps/web/src/configs'), { recursive: true })
  mkdirSync(join(root, 'items'))
  writeFileSync(join(root, 'items', 'items.schema.ts'), [
    "import { z } from 'zod/v4'",
    'export const itemRecordSchema = z.object({',
    '  id: z.string(),',
    '  name: z.string(),',
    '  createdAt: z.date(),',
    '  metadata: z.object({ caption: z.string() }),',
    '  roles: z.array(z.object({ id: z.string() })),',
    '  payload: z.object({ parts: z.array(z.string()) }),',
    '  relOwner: z.object({ name: z.string() }),',
    '})',
    'export const itemCreateSchema = z.object({ name: z.string() })',
    '',
  ].join('\n'))
  writeFileSync(join(root, 'apps/web/src/configs/display.ts'), [
    'export const displayPresets = {',
    "  createdAt: { format: 'date' },",
    '  metadata: { read: record => record.metadata.caption },',
    "  roles: { renderer: 'table' },",
    '  ownerName: { read: record => record.relOwner.name },',
    '  brokenOwner: { read: record => record.missingRel.name },',
    '}',
  ].join('\n'))
  writeFileSync(join(root, 'items', 'items.resource.ts'), [
    "import { defineDetail as makeDetail, defineForm as makeForm, defineResource as bindResource, defineTable as makeTable } from '@southneuhof/loom'",
    "import { displayPresets as sharedDisplay } from '@/configs/display'",
    "import { itemCreateSchema, itemRecordSchema } from './items.schema'",
    'const tableColumns = {',
    '  name: {},',
    '  createdAt: {},',
    '  metadata: { ...sharedDisplay.metadata },',
    '  roles: sharedDisplay.roles,',
    '  payload: {},',
    '  ownerName: sharedDisplay.ownerName,',
    '  brokenOwner: sharedDisplay.brokenOwner,',
    '}',
    'const itemTable = makeTable({ schema: itemRecordSchema, columns: { ...tableColumns, createdAt: { ...sharedDisplay.createdAt } } })',
    'const itemDetail = makeDetail({ schema: itemRecordSchema, fields: { ...tableColumns, createdAt: sharedDisplay.createdAt } })',
    "const itemForm = makeForm({ schema: itemCreateSchema, fields: { name: { renderer: 'text' }, missing: { renderer: 'text' } } })",
    'export const items = bindResource({',
    "  key: 'items',",
    '  identity: record => record.id,',
    '  list: { permission: null, table: { ...itemTable, load: async () => [] } },',
    '  detail: { permission: null, detail: ({ id }) => ({ ...itemDetail, load: async () => ({ id }) }) },',
    '  create: { permission: null, form: itemForm },',
    '})',
    '',
  ].join('\n'))
  const result = checkResourceDisplay(['items/items.resource.ts'], { root })
  assert.match(result.review.join('\n'), /items\.resource\.ts:\d+: payload \(object, table\) needs explicit display/)
  assert.match(result.review.join('\n'), /items\.resource\.ts:\d+: payload \(object, detail\) needs explicit display/)
  assert.match(result.errors.join('\n'), /form surface field 'missing' is missing from its schema/)
  assert.match(result.errors.join('\n'), /table read accessor for 'brokenOwner' uses 'missingRel', which is missing from its schema/)
  assert.ok(!result.errors.some(line => line.includes("ownerName' is missing")), 'declared relation accessor is a valid display key')
  assert.ok(!result.review.some(line => line.includes('name (')), 'plain string stays silent')
  assert.ok(!result.review.some(line => line.includes('createdAt (')), 'format fragment satisfies date')
  assert.ok(!result.review.some(line => line.includes('metadata (object, detail)')), 'read accessor satisfies detail')
  assert.ok(!result.review.some(line => line.includes('roles (array, detail)')), 'renderer reference satisfies detail')

  const cliRoot = mkdtempSync(join(tmpdir(), 'carta-ui-display-cli-'))
  t.after(() => rmSync(cliRoot, { recursive: true, force: true }))
  mkdirSync(join(cliRoot, 'items'))
  writeFileSync(join(cliRoot, 'items', 'items.schema.ts'), [
    "import { z } from 'zod/v4'",
    'export const itemRecordSchema = z.object({ payload: z.object({ parts: z.array(z.string()) }) })',
  ].join('\n'))
  writeFileSync(join(cliRoot, 'items', 'items.resource.ts'), [
    "import { defineResource, defineTable } from '@southneuhof/loom'",
    "import { itemRecordSchema } from './items.schema'",
    'const table = defineTable({ schema: itemRecordSchema, columns: { payload: {} } })',
    "export const items = defineResource({ key: 'items', identity: record => record.id, list: { permission: null, table: { ...table, load: async () => ({ data: [] }) } } })",
  ].join('\n'))
  writeFileSync(join(cliRoot, 'index.route.vue'), [
    '<script setup lang="ts">',
    "import { ListView } from '@southneuhof/loom'",
    "import { items } from './items/items.resource'",
    '</script>',
    '<template><ListView v-bind="items.list" /></template>',
  ].join('\n'))
  const cli = spawnSync(process.execPath,
    [fileURLToPath(new URL('./module-ui-check.mjs', import.meta.url)), '--sources', cliRoot], { encoding: 'utf8' })
  assert.equal(cli.status, 2)
  assert.match(cli.stdout, /REVIEW: .*items\/items\.resource\.ts:\d+: payload \(object, table\) needs explicit display/)
})

test('surface kind prevents declaring only the hand-written replacement', () => {
  const source = '<script setup>import { NavigationHeader } from "@southneuhof/loom"</script><template><NavigationHeader/><dl>Fields</dl></template>'
  const selected = { surfaces: [{ file: 'page.vue', kind: 'detail', components: [{ name: 'NavigationHeader', from: '@southneuhof/loom' }] }] }
  assert.ok(check(source, selected).errors.some(error => error.includes('requires DetailView')))
  selected.surfaces[0].gap = 'A requirement for review'
  assert.ok(check(source, selected).errors.some(error => error.includes('still requires Detail')))
  assert.equal(check(source, selected).review.length, 1)
  selected.surfaces[0].components[0].gap = 'A misplaced exception'
  assert.ok(check(source, selected).errors.length)
})


test('CLI keeps an exception separate from a passing check', t => {
  const root = mkdtempSync(join(tmpdir(), 'carta-ui-check-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const manifest = join(root, 'ui-contract.json')
  const selected = structuredClone(contract)
  writeFileSync(join(root, 'page.vue'), page)
  const run = () => {
    writeFileSync(manifest, JSON.stringify(selected))
    return spawnSync(process.execPath, [fileURLToPath(new URL('./module-ui-check.mjs', import.meta.url)), manifest, root], { encoding: 'utf8' })
  }
  assert.equal(run().status, 0)
  selected.surfaces[0].gap = 'A requirement for independent review'
  assert.equal(run().status, 2)
  selected.surfaces[0].components[0].name = 'MissingView'
  assert.equal(run().status, 1)
})

test('CLI reports exit 2 for a raw control and keeps 0/1 meanings', t => {
  const root = mkdtempSync(join(tmpdir(), 'carta-ui-check-cli-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const manifest = join(root, 'ui-contract.json')
  writeFileSync(manifest, JSON.stringify(contract))
  const run = (source) => {
    writeFileSync(join(root, 'page.vue'), source)
    return spawnSync(process.execPath, [fileURLToPath(new URL('./module-ui-check.mjs', import.meta.url)), manifest, root], { encoding: 'utf8' })
  }
  const clean = run(page)
  assert.equal(clean.status, 0)
  assert.match(clean.stdout, /PASS/)
  const raw = run(page.replace('<Button>Close</Button>', '<button>Close</button>'))
  assert.equal(raw.status, 2)
  assert.match(raw.stdout, /REVIEW: page\.vue:1: native <button> needs source review/)
  const broken = run(page.replace(', Button', ''))
  assert.equal(broken.status, 1)
  assert.match(broken.stderr, /FAIL/)
})


test('record routes cannot bypass the View check by declaring a custom kind', () => {
  const selected = structuredClone(contract)
  selected.surfaces[0].file = 'detail.route.vue'
  selected.surfaces[0].kind = 'custom'
  selected.surfaces[0].gap = 'Several record sections'
  assert.ok(check(page, selected).errors.some(error => error.includes('requires kind detail')))
})


test('accepts the public default View import', () => {
  const source = '<script setup>import RecordView from "@southneuhof/loom/components/views/DetailView.vue"</script><template><RecordView/></template>'
  const selected = structuredClone(contract)
  selected.surfaces[0].components = [{ name: 'default', from: '@southneuhof/loom/components/views/DetailView.vue' }]
  assert.deepEqual(check(source, selected).errors, [])
})


test('a justified record layout retains the Detail primitive and requires review', () => {
  const source = '<script setup>import { Detail } from "@southneuhof/loom"</script><template><Detail/></template>'
  const selected = { surfaces: [{ file: 'detail.route.vue', kind: 'detail', gap: 'A requirement for review', components: [{ name: 'Detail', from: '@southneuhof/loom' }] }] }
  const result = check(source, selected)
  assert.deepEqual(result.errors, [])
  assert.equal(result.review.length, 1)
})

test('resource row-op sync warns when a declared route or row control misses the row enum', t => {
  const root = mkdtempSync(join(tmpdir(), 'carta-ui-rowops-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (name, content) => writeFileSync(join(root, name), content)
  // Detail declared with a route, but the row enum omits 'detail'.
  write('detail-missing.entity.ts', "import { z } from 'zod/v4'\nexport const s = z.object({ allowedOperations: z.array(z.enum(['update'])) })\n")
  write('detail-missing.resource.ts', "import { defineResource } from '@southneuhof/loom'\nimport './detail-missing.entity'\nexport const r = defineResource({ key: 'detail-missing', identity: record => record.id, list: { permission: null, route: { name: 'l' }, table: {} }, detail: { permission: 'view', route: { name: 'd' }, detail: () => ({}) } })\n")
  // Update declared with a route, but the row enum omits 'update'.
  write('update-missing.entity.ts', "import { z } from 'zod/v4'\nexport const s = z.object({ allowedOperations: z.array(z.enum(['detail'])) })\n")
  write('update-missing.resource.ts', "import { defineResource } from '@southneuhof/loom'\nimport './update-missing.entity'\nexport const r = defineResource({ key: 'update-missing', identity: record => record.id, list: { permission: null, route: { name: 'l' }, table: {} }, update: { permission: 'edit', route: { name: 'e' }, form: () => ({}) } })\n")
  // Custom pay consumed as a row control, but the row enum omits 'pay'.
  write('pay-row.entity.ts', "import { z } from 'zod/v4'\nexport const s = z.object({ allowedOperations: z.array(z.enum(['detail'])) })\n")
  write('pay-row.resource.ts', "import { defineResource } from '@southneuhof/loom'\nimport './pay-row.entity'\nexport const r = defineResource({ key: 'pay-row', identity: record => record.id, list: { permission: null, route: { name: 'l' }, table: {} }, actions: { pay: { run: async () => ({}), permission: 'pay' } } })\n")
  write('pay-row.vue', "<script>const ok = r.actions.pay.withContext({ record }).can(id, input)</script><template><div>x</div></template>\n")
  // List-only: no detail declaration, so the enum gap passes.
  write('list-only.entity.ts', "import { z } from 'zod/v4'\nexport const s = z.object({ allowedOperations: z.array(z.enum(['update'])) })\n")
  write('list-only.resource.ts', "import { defineResource } from '@southneuhof/loom'\nimport './list-only.entity'\nexport const r = defineResource({ key: 'list-only', identity: record => record.id, list: { permission: null, route: { name: 'l' }, table: {} } })\n")
  // Collection-only: custom action never called with a row, so it passes.
  write('export-collection.entity.ts', "import { z } from 'zod/v4'\nexport const s = z.object({ allowedOperations: z.array(z.enum(['detail'])) })\n")
  write('export-collection.resource.ts', "import { defineResource } from '@southneuhof/loom'\nimport './export-collection.entity'\nexport const r = defineResource({ key: 'export-collection', identity: record => record.id, list: { permission: null, route: { name: 'l' }, table: {} }, actions: { exportAll: { run: async () => ({}), permission: 'export' } } })\n")
  write('export-collection.vue', "<script>const ok = r.actions.exportAll.can({ format: 'csv' })</script><template><div>x</div></template>\n")
  // Permission-only rows carry no enum, so a declared detail route passes.
  write('permission-only.resource.ts', "import { defineResource } from '@southneuhof/loom'\nexport const r = defineResource({ key: 'permission-only', identity: record => record.id, list: { permission: null, route: { name: 'l' }, table: {} }, detail: { permission: 'view', route: { name: 'd' }, detail: () => ({}) } })\n")
  const files = ['detail-missing.resource.ts', 'update-missing.resource.ts', 'pay-row.resource.ts', 'list-only.resource.ts', 'export-collection.resource.ts', 'permission-only.resource.ts']
  const vueContents = [
    "<script>const ok = r.actions.pay.withContext({ record }).can(id, input)</script>",
    "<script>const ok = r.actions.exportAll.can({ format: 'csv' })</script>",
  ]
  const result = checkResourceRowOps(files, { root, vueContents })
  assert.equal(result.length, 3)
  assert.ok(result.some(item => item.includes('detail-missing') && item.includes("cannot carry 'detail'")), result.join('\n'))
  assert.ok(result.some(item => item.includes('update-missing') && item.includes("cannot carry 'update'")), result.join('\n'))
  assert.ok(result.some(item => item.includes('pay-row') && item.includes("cannot carry 'pay'")), result.join('\n'))
  assert.ok(!result.some(item => item.includes('list-only declares')), result.join('\n'))
  assert.ok(!result.some(item => item.includes('export-collection declares')), result.join('\n'))
  assert.ok(!result.some(item => item.includes('permission-only declares')), result.join('\n'))
  assert.ok(result.every(item => /^.+\.resource\.ts:\d+: /.test(item)), result.join('\n'))
  // The sources CLI wires the same rule alongside template checks.
  const run = (...paths) => spawnSync(process.execPath,
    [fileURLToPath(new URL('./module-ui-check.mjs', import.meta.url)), '--sources', ...paths], { encoding: 'utf8' })
  const cli = run(root)
  assert.equal(cli.status, 2)
  assert.match(cli.stdout, /detail-missing.*cannot carry 'detail'/)
  assert.match(cli.stdout, /pay-row.*cannot carry 'pay'/)
})

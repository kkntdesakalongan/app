import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { analyzeSource, checkWorkspace } from './check-surface-architecture.mjs'

function policyWorkspace() {
  const root = mkdtempSync(join(tmpdir(), 'carta-surface-policy-'))
  const write = (file, content) => {
    const target = join(root, file)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
  const writeConfig = (file, config) => write(file, JSON.stringify(config))
  const base = { extends: '../../tsconfig.base.json', compilerOptions: {} }
  writeConfig('tsconfig.base.json', { compilerOptions: { target: 'es2022' } })
  writeConfig('apps/api/tsconfig.json', base)
  writeConfig('apps/web/tsconfig.app.json', {
    ...base,
    vueCompilerOptions: { strictTemplates: true, checkUnknownProps: true },
  })
  writeConfig('apps/web/tsconfig.vitest.json', {
    extends: './tsconfig.app.json',
    compilerOptions: { types: ['node', 'jsdom'] },
  })
  writeConfig('packages/sdk/tsconfig.json', base)
  writeConfig('packages/loom/tsconfig.json', {
    ...base,
    vueCompilerOptions: { strictTemplates: true, checkUnknownProps: true },
  })
  writeConfig('packages/utilities/tsconfig.json', base)
  write('apps/web/vite.config.ts', "export default { resolve: { extensions: ['.mjs', '.js', '.ts'] } }\n")
  return { root, write, writeConfig }
}

test('rejects platform-dependent application resolution', async (context) => {
  const cases = [
    {
      name: 'API compiler suffix preference',
      owner: 'apps/api/tsconfig.json',
      apply: ({ writeConfig }) => writeConfig('apps/api/tsconfig.json', {
        extends: '../../tsconfig.base.json',
        compilerOptions: { moduleSuffixes: ['.server', ''] },
      }),
      expected: /moduleSuffixes.*explicit imports/,
    },
    {
      name: 'web compiler suffix preference',
      owner: 'apps/web/tsconfig.app.json',
      apply: ({ writeConfig }) => writeConfig('apps/web/tsconfig.app.json', {
        extends: '../../tsconfig.base.json',
        compilerOptions: { moduleSuffixes: ['.web', ''] },
        vueCompilerOptions: { strictTemplates: true, checkUnknownProps: true },
      }),
      expected: /moduleSuffixes.*explicit imports/,
    },
    {
      name: 'inherited compiler suffix preference',
      owner: 'apps/api/tsconfig.json',
      apply: ({ writeConfig }) => writeConfig('tsconfig.base.json', {
        compilerOptions: { target: 'es2022', moduleSuffixes: ['.server', ''] },
      }),
      expected: /moduleSuffixes.*explicit imports/,
    },
    {
      name: 'web test compiler suffix preference',
      owner: 'apps/web/tsconfig.vitest.json',
      apply: ({ writeConfig }) => writeConfig('apps/web/tsconfig.vitest.json', {
        extends: './tsconfig.app.json',
        compilerOptions: { moduleSuffixes: ['.test', ''] },
      }),
      expected: /moduleSuffixes.*explicit imports/,
    },
    {
      name: 'SDK compiler suffix preference',
      owner: 'packages/sdk/tsconfig.json',
      apply: ({ writeConfig }) => writeConfig('packages/sdk/tsconfig.json', {
        extends: '../../tsconfig.base.json',
        compilerOptions: { moduleSuffixes: ['.consumer', ''] },
      }),
      expected: /moduleSuffixes.*explicit imports/,
    },
    {
      name: 'Loom compiler suffix preference',
      owner: 'packages/loom/tsconfig.json',
      apply: ({ writeConfig }) => writeConfig('packages/loom/tsconfig.json', {
        extends: '../../tsconfig.base.json',
        compilerOptions: { moduleSuffixes: ['.server', ''] },
        vueCompilerOptions: { strictTemplates: true, checkUnknownProps: true },
      }),
      expected: /moduleSuffixes.*explicit imports/,
    },
    {
      name: 'utilities compiler suffix preference',
      owner: 'packages/utilities/tsconfig.json',
      apply: ({ writeConfig }) => writeConfig('packages/utilities/tsconfig.json', {
        extends: '../../tsconfig.base.json',
        compilerOptions: { moduleSuffixes: ['.web', ''] },
      }),
      expected: /moduleSuffixes.*explicit imports/,
    },
    {
      name: 'Vite web resolution extension',
      owner: 'apps/web/vite.config.ts',
      apply: ({ write }) => write('apps/web/vite.config.ts', "export default { resolve: { extensions: ['.web.ts', '.ts'] } }\n"),
      expected: /Vite.*extensions.*explicit imports/i,
    },
    {
      name: 'Vite server resolution extension',
      owner: 'apps/web/vite.config.ts',
      apply: ({ write }) => write('apps/web/vite.config.ts', "export default { resolve: { extensions: ['.server.ts', '.ts'] } }\n"),
      expected: /Vite.*extensions.*explicit imports/i,
    },
    {
      name: 'API platform source variant',
      owner: 'apps/api/src/order.server.ts',
      apply: ({ write }) => write('apps/api/src/order.server.ts', 'export const order = true\n'),
      expected: /source variants.*rename.*explicitly named adapter/i,
    },
    {
      name: 'web Vue platform source variant',
      owner: 'apps/web/src/Panel.web.vue',
      apply: ({ write }) => write('apps/web/src/Panel.web.vue', '<template><div /></template>\n'),
      expected: /source variants.*rename.*explicitly named adapter/i,
    },
    {
      name: 'SDK declaration platform source variant',
      owner: 'packages/sdk/src/types.server.d.ts',
      apply: ({ write }) => write('packages/sdk/src/types.server.d.ts', 'export interface Types {}\n'),
      expected: /source variants.*rename.*explicitly named adapter/i,
    },
    {
      name: 'Loom platform source variant',
      owner: 'packages/loom/src/index.web.tsx',
      apply: ({ write }) => write('packages/loom/src/index.web.tsx', 'export const index = true\n'),
      expected: /source variants.*rename.*explicitly named adapter/i,
    },
    {
      name: 'utilities alternate platform source variant',
      owner: 'packages/utilities/src/worker.web.mts',
      apply: ({ write }) => write('packages/utilities/src/worker.web.mts', 'export const worker = true\n'),
      expected: /source variants.*rename.*explicitly named adapter/i,
    },
  ]

  for (const policyCase of cases) {
    await context.test(policyCase.name, () => {
      const workspace = policyWorkspace()
      try {
        policyCase.apply(workspace)
        const diagnostics = checkWorkspace(workspace.root)
        const ownerDiagnostics = diagnostics.filter((entry) => entry.startsWith(`${policyCase.owner}:`))
        assert.ok(ownerDiagnostics.length > 0, `checkWorkspace accepted forbidden resolution policy at ${policyCase.owner}`)
        assert.match(ownerDiagnostics.join('\n'), policyCase.expected)
      } finally {
        rmSync(workspace.root, { recursive: true, force: true })
      }
    })
  }
})

test('allows ordinary resolution, explicit adapters, and API route files', () => {
  const workspace = policyWorkspace()
  try {
    workspace.writeConfig('apps/api/tsconfig.json', {
      extends: '../../tsconfig.base.json',
      compilerOptions: { moduleSuffixes: [''] },
    })
    workspace.write('apps/web/vite.config.ts', "export default { // .web.ts is old config text\n resolve: { extensions: ['.ts'] } }\n")
    workspace.write('apps/api/src/+server.ts', 'export const GET = () => undefined\n')
    workspace.write('apps/api/src/database.server-adapter.ts', 'export const databaseAdapter = true\n')
    workspace.write('apps/web/src/browser.web-adapter.ts', 'export const browserAdapter = true\n')

    assert.deepEqual(checkWorkspace(workspace.root), [])
  } finally {
    rmSync(workspace.root, { recursive: true, force: true })
  }
})

test('rejects aliased legacy imports and the removed resource signature', () => {
  const source = `import { defineResource as makeResource, FieldDefinition as OldField } from '@southneuhof/loom'
makeResource({}, {})`
  const diagnostics = analyzeSource(source, 'sample.ts')

  assert.equal(diagnostics.length, 2)
  assert.match(diagnostics.join('\n'), /FieldDefinition/)
  assert.match(diagnostics.join('\n'), /one complete definition object/)
})

test('rejects removed resource factories while allowing unrelated list methods', () => {
  const source = `import { defineResource as bind } from '@southneuhof/loom'
const records = bind({})
records.list()
records['create']()
function readProvider(records) { return records.list() }
const provider = { list: () => [] }
provider.list()`
  const diagnostics = analyzeSource(source, 'sample.ts')

  assert.equal(diagnostics.length, 2)
  assert.match(diagnostics[0], /resource\.list\(\)/)
  assert.match(diagnostics[1], /resource\.create\(\)/)
})

test('rejects static resource imports and aliases while allowing provider lists', () => {
  const source = `import { users } from './users.resource'
import { accounts as records } from '../accounts.resource'
import { providers } from './providers'
users.list()
records.create()
providers.list()`
  const diagnostics = analyzeSource(source, 'sample.ts')

  assert.equal(diagnostics.length, 2)
  assert.match(diagnostics[0], /resource\.list\(\)/)
  assert.match(diagnostics[1], /resource\.create\(\)/)
})

test('rejects field-level form sources through aliases and object spreads', () => {
  const source = `import { defineForm as makeForm } from '@southneuhof/loom'
const relationConfig = { source: { load: roles.list.table.load } }
const relationField = { renderer: 'select', ...relationConfig }
const inputFields = { roleId: relationField }
const formDefinition = { fields: inputFields }
makeForm(formDefinition)`
  const diagnostics = analyzeSource(source, 'sample.ts')

  assert.equal(diagnostics.length, 1)
  assert.match(diagnostics[0], /Form field "roleId" cannot declare the removed source member/)
})

test('rejects field-level sources through assigned defineForm aliases but allows component props', () => {
  const source = `import { defineForm } from '@southneuhof/loom'
const makeForm = defineForm
const sourceConfig = { source: { load: roles.list.table.load } }
const fields = { roleId: { renderer: 'select', ...sourceConfig, props: { source: 'component-owned' } } }
makeForm({ fields })`

  assert.equal(analyzeSource(source, 'sample.ts').length, 1)
  assert.match(analyzeSource(source, 'sample.ts')[0], /Form field "roleId" cannot declare the removed source member/)
})

test('rejects removed Form behavior through aliases and object spreads', () => {
  const source = `import { defineForm } from '@southneuhof/loom'
const makeForm = defineForm
const removedBehavior = { resetWhen: ({ draft }) => draft.divisionId }
const approverField = { renderer: 'select', behavior: removedBehavior }
const fields = { approverId: { ...approverField } }
makeForm({ fields })`

  const diagnostics = analyzeSource(source, 'sample.ts')

  assert.equal(diagnostics.length, 1)
  assert.match(diagnostics[0], /Form field "approverId" cannot declare the removed behavior member/)
})

test('checks component prop bags through script aliases and object spreads', () => {
  const source = `<script setup lang="ts">
import { Form as Editor, FileInput } from '@southneuhof/loom'
const removedFormProps = { form: savedForm }
const editorProps = { ...removedFormProps }
const removedAssetProps = { upload: saveFile }
const assetProps = { ...removedAssetProps }
</script>
<template>
  <Editor v-bind="editorProps" />
  <FileInput v-bind="assetProps" />
</template>`
  const diagnostics = analyzeSource(source, 'sample.vue')

  assert.equal(diagnostics.length, 2)
  assert.match(diagnostics[0], /<Form> cannot receive removed prop "form"/)
  assert.match(diagnostics[1], /<FileInput> cannot receive removed prop "upload"/)
})

test('checks removed props passed through Vue component factories and aliases', () => {
  const source = `import { h } from 'vue'
import { Form as Editor } from '@southneuhof/loom'
const legacyProps = { form: savedForm }
const props = { ...legacyProps }
h(Editor, props)`

  const diagnostics = analyzeSource(source, 'sample.ts')

  assert.equal(diagnostics.length, 1)
  assert.match(diagnostics[0], /<Form> cannot receive removed prop "form"/)
})

test('allows removed type names only on expected negative type imports', () => {
  const file = 'packages/loom/src/__type-tests__/removed-public-api.type-test.ts'
  const validNegative = `// @ts-expect-error This type was removed.\nimport type { InputPropsRegistry } from '../index'`
  const missingDirective = `import type { InputPropsRegistry } from '../index'`

  assert.deepEqual(analyzeSource(validNegative, file), [])
  assert.equal(analyzeSource(missingDirective, file).length, 1)
})

test('allows unrelated source members and component props inside form fields', () => {
  const source = `import { defineForm } from '@southneuhof/loom'
const cache = { source: 'local-cache' }
defineForm({ fields: { name: { renderer: 'text', props: { source: 'component-owned' } } } })
cache.source`

  assert.deepEqual(analyzeSource(source, 'sample.ts'), [])
})

test('does not treat a similarly named member outside Form behavior as a removed API', () => {
  const source = `const resetWhen = () => undefined
const cache = { resetWhen }
cache.resetWhen()`

  assert.deepEqual(analyzeSource(source, 'sample.ts'), [])
})

test('rejects removed component props through imported component aliases', () => {
  const source = `<script setup lang="ts">
import { Form as Editor, DialogForm as Modal, Table as Grid } from '@southneuhof/loom'
</script>
<template>
  <Editor :form="form" />
  <Modal v-bind="{ form }" />
  <Grid :fields="fields" />
  <component :is="Editor" :form="form" />
</template>`
  const diagnostics = analyzeSource(source, 'sample.vue')

  assert.equal(diagnostics.length, 4)
  assert.match(diagnostics.join('\n'), /<Form>.*"form"/)
  assert.match(diagnostics.join('\n'), /<DialogForm>.*"form"/)
  assert.match(diagnostics.join('\n'), /<Table>.*"fields"/)
})

test('uses import provenance when checking component props', () => {
  const localForm = `<script setup lang="ts">
import { Form } from './local-form'
</script>
<template><Form :form="form" /></template>`

  assert.deepEqual(analyzeSource(localForm, 'apps/web/src/components/local-form-wrapper.vue'), [])
})

test('checks Loom component props through canonical relative imports and aliases', () => {
  const source = `<script setup lang="ts">
import FormControl from '../core/Form.vue'
import { Form as Editor } from '../core'
import { DialogForm as Modal } from '../composites'
import { Table as Grid } from '../core'
</script>
<template>
  <FormControl :form="form" />
  <Editor :form="form" />
  <Modal :form="form" />
  <Grid :fields="fields" />
</template>`
  const diagnostics = analyzeSource(source, 'packages/loom/src/components/views/Foo.vue')

  assert.equal(diagnostics.length, 4)
  assert.match(diagnostics.join('\n'), /<Form>.*"form"/)
  assert.match(diagnostics.join('\n'), /<DialogForm>.*"form"/)
  assert.match(diagnostics.join('\n'), /<Table>.*"fields"/)
})

test('allows Vue expected errors for removed props only in type fixtures', () => {
  const source = `<script setup lang="ts">
import Form from '../../core/Form.vue'
import DialogForm from '../DialogForm.vue'
</script>
<template>
  <!-- @vue-expect-error Form does not accept a nested form prop. -->
  <Form :form="form" />
  <!-- @vue-expect-error DialogForm does not accept a nested form prop. -->
  <DialogForm :form="form" />
</template>`
  const file = 'packages/loom/src/components/composites/__type-tests__/flat-form-components.type-test.vue'
  const productionSource = source
    .replace('../../core/Form.vue', '../core/Form.vue')
    .replace('../DialogForm.vue', './DialogForm.vue')

  assert.deepEqual(analyzeSource(source, file), [])
  assert.equal(analyzeSource(source.replaceAll(/  <!-- @vue-expect-error [^>]+ -->\n/g, ''), file).length, 2)
  assert.equal(analyzeSource(productionSource, 'packages/loom/src/components/composites/FlatForm.vue').length, 2)
})

test('rejects resource factories in Vue directive and interpolation expressions', () => {
  const source = `<script setup lang="ts">
import { users } from './users.resource'
import { accounts as records } from '../accounts.resource'
const provider = { list: () => [] }
</script>
<template>
  <ListView v-bind="users.list()" />
  <div :data="records['create']()" />
  <div v-bind="provider.list()" />
  <p>{{ users.create() }}</p>
</template>`
  const diagnostics = analyzeSource(source, 'sample.vue')

  assert.equal(diagnostics.length, 3)
  assert.match(diagnostics[0], /resource\.list\(\)/)
  assert.match(diagnostics[1], /resource\.create\(\)/)
  assert.match(diagnostics[2], /resource\.create\(\)/)
})

test('keeps form and detail fields, command handlers, and provider lists valid', () => {
  const source = `<script setup lang="ts">
import { Button, Detail, Form } from '@southneuhof/loom'
const provider = { list: () => [] }
provider.list()
const command = { run: () => undefined }
</script>
<template>
  <Form :fields="fields" />
  <Detail :fields="fields" />
  <Button @click="command.run()" />
</template>`

  assert.deepEqual(analyzeSource(source, 'sample.vue'), [])
})

test('rejects flat view bags but allows nested primitive bags', () => {
  const source = `<script setup lang="ts">
import { DetailView, FormView, ListView } from '@southneuhof/loom'
</script>
<template>
  <FormView :submit="submit" />
  <ListView :columns="columns" />
  <DetailView :data="record" />
  <FormView :form="form" />
  <ListView :table="table" />
  <DetailView :detail="detail" />
</template>`
  const diagnostics = analyzeSource(source, 'sample.vue')

  assert.equal(diagnostics.length, 3)
  assert.match(diagnostics.join('\n'), /<FormView>.*"submit"/)
  assert.match(diagnostics.join('\n'), /<ListView>.*"columns"/)
  assert.match(diagnostics.join('\n'), /<DetailView>.*"data"/)
})

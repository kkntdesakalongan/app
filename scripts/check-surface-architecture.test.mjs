import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSource, checkGeneratedModule } from './check-surface-architecture.mjs'

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

test('checks the bounded-module generator output', () => {
  assert.deepEqual(checkGeneratedModule(), [])
})

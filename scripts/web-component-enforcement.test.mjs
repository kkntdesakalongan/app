import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repositoryDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const webDirectory = resolve(repositoryDirectory, 'apps/web')
const requireFromWeb = createRequire(resolve(webDirectory, 'package.json'))
const { ESLint } = requireFromWeb('eslint')
const eslint = new ESLint({ cwd: webDirectory })
const fixturePath = resolve(webDirectory, 'src/components/ComponentEnforcementFixture.vue')

async function lint(source) {
  const [result] = await eslint.lintText(source, { filePath: fixturePath })
  return result.messages
}

test('app Vue lint resolves components and reports native controls and replacements', async () => {
  const cleanSource = `<script setup>
import { Button, DetailView } from '@southneuhof/loom'
import { RouterLink } from 'vue-router'
</script>
<template>
  <Button />
  <RouterLink to="/">Home</RouterLink>
  <button>Native</button>
  <input type="hidden" />
  <DetailView><template #controls /></DetailView>
</template>
`
  const cleanMessages = await lint(cleanSource)
  const enforcementRules = new Set([
    'vue/no-undef-components',
    'vue/component-name-in-template-casing',
    'vue/no-restricted-syntax',
  ])
  assert.deepEqual(cleanMessages.filter((message) => enforcementRules.has(message.ruleId) && message.severity === 2), [])
  const cleanWarnings = cleanMessages.filter((message) => message.ruleId === 'vue/no-restricted-syntax')
  assert.equal(cleanWarnings.length, 1)
  const unimportedButtonMessages = await lint('<template>\n  <Button />\n</template>\n')
  const unimportedButtonErrors = unimportedButtonMessages.filter(
    (message) => message.ruleId === 'vue/no-undef-components' && message.severity === 2,
  )
  assert.equal(unimportedButtonErrors.length, 1)
  assert.match(unimportedButtonErrors[0].message, /Button/)

  const reviewSource = `<script setup>
import { Button, Button as ButtonWidget, Form, ListView, DetailView } from '@southneuhof/loom'
const inputType = 'text'
</script>
<template>
  <Button />
  <button-widget />
  <button>Native</button>
  <input type="hidden" />
  <input type="text" />
  <input :type="inputType" />
  <input />
  <select />
  <textarea />
  <MissingWidget />
  <Form><template #actions /></Form>
  <ListView><template #row-actions-view /></ListView>
  <DetailView><template #controls /></DetailView>
</template>
`
  const messages = await lint(reviewSource)
  const componentErrors = messages.filter((message) => message.severity === 2)
  const undefinedComponents = componentErrors.filter((message) => message.ruleId === 'vue/no-undef-components')
  const casingErrors = componentErrors.filter((message) => message.ruleId === 'vue/component-name-in-template-casing')
  const reviewWarnings = messages.filter((message) => message.ruleId === 'vue/no-restricted-syntax')
  const lineOf = (fragment) => reviewSource.split('\n').findIndex((line) => line.includes(fragment)) + 1
  const hiddenInputLine = lineOf('type="hidden"')

  assert.equal(undefinedComponents.length, 1)
  assert.match(undefinedComponents[0].message, /MissingWidget/)
  assert.equal(casingErrors.length, 1)
  assert.match(casingErrors[0].message, /button-widget/)
  assert.equal(reviewWarnings.length, 8)
  assert.equal(reviewWarnings.some((message) => message.line === hiddenInputLine), false)
  assert.equal(reviewWarnings.some((message) => message.line === lineOf('<input type="text"')), true)
  assert.equal(reviewWarnings.some((message) => message.line === lineOf('<input :type="inputType"')), true)
  assert.equal(reviewWarnings.some((message) => message.line === lineOf('<input />')), true)
  assert.equal(reviewWarnings.some((message) => message.line === lineOf('<select')), true)
  assert.equal(reviewWarnings.some((message) => message.line === lineOf('#actions')), true)
  assert.equal(reviewWarnings.some((message) => message.line === lineOf('#row-actions-view')), true)
  assert.equal(reviewWarnings.some((message) => message.line === lineOf('#controls')), false)
})

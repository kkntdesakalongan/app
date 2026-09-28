import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, ref } from 'vue'
import { Form } from '@southneuhof/loom'
import { categoryResource, serviceRequestResource } from '../__eval/plan066/loom-relation-source-freshness.module'
import {
  readCategoryLoads,
  resetRelationFixture,
} from '../__eval/plan066/loom-relation-source-freshness.services'
import { chooseOption, cleanupFramework, mountFramework, openField } from './loom-agent-eval-harness'

afterEach(() => {
  resetRelationFixture()
  cleanupFramework()
})

describe('E relation source freshness', () => {
  it('E-01 refreshes a renamed option and E-02 keeps its selected identity', async () => {
    const formRef = ref<{ draft: { categoryId?: string; summary?: string } } | null>(null)
    mountFramework(() => h(Form, {
      ref: formRef,
      ...serviceRequestResource.create.form,
      initialData: { categoryId: '', summary: 'Replace a filter' },
    }))

    await vi.waitFor(() => expect(readCategoryLoads()).toBe(1))
    openField('Category')
    await chooseOption('Support')
    await vi.waitFor(() => expect(formRef.value?.draft.categoryId).toBe('support'))

    await categoryResource.actions.rename.run({ id: 'support', name: 'Customer support' })
    await vi.waitFor(() => expect(document.body.textContent).toContain('Customer support'))

    expect(formRef.value?.draft.categoryId).toBe('support')
    expect(readCategoryLoads()).toBeGreaterThan(1)
  })
})

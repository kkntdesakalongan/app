import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, ref } from 'vue'
import { Form } from '@southneuhof/loom'
import { amountResource, updateSchema } from '../__eval/plan066/loom-transformed-update.module'
import { invalidResource } from '../__eval/plan066/loom-transformed-update-invalid-resource'
import {
  readAmountLoads,
  readAmountUpdates,
  resetAmountFixture,
} from '../__eval/plan066/loom-transformed-update.services'
import { cleanupFramework, mountFramework } from './loom-agent-eval-harness'

afterEach(() => {
  resetAmountFixture()
  cleanupFramework()
})

describe('B transformed update', () => {
  it('B-01 accepts only bounded decimal text and maps it to minor units', () => {
    expect(updateSchema.parse({ displayName: 'Service fee', amountText: '12.34' })).toEqual({ displayName: 'Service fee', amountMinor: 1234 })
    expect(updateSchema.parse({ displayName: 'Service fee', amountText: '0.1' })).toEqual({ displayName: 'Service fee', amountMinor: 10 })
    expect(updateSchema.parse({ displayName: 'Service fee', amountText: '999999.99' })).toEqual({ displayName: 'Service fee', amountMinor: 99999999 })
    expect(updateSchema.parse({ displayName: 'Service fee', amountText: '00012.34' })).toEqual({ displayName: 'Service fee', amountMinor: 1234 })
    for (const amountText of ['-1', ' 1', '1 ', '', '1e2', '1.', '1.234', '1000000']) {
      expect(updateSchema.safeParse({ displayName: 'Service fee', amountText }).success).toBe(false)
    }
  })

  it('B-02 loads a string draft and B-03 submits one transformed value to the bound id', async () => {
    const page = amountResource.update({ id: 'amount-7' })
    const formRef = ref<{ draft: { displayName?: string; amountText?: string }; submit: () => Promise<void> } | null>(null)
    mountFramework(() => h(Form, { ref: formRef, ...page.form }))

    await vi.waitFor(() => expect(formRef.value?.draft).toEqual({ displayName: 'Service fee', amountText: '12.34' }))
    expect(readAmountLoads()).toEqual(['amount-7'])
    await formRef.value?.submit()

    expect(readAmountUpdates()).toEqual([{ id: 'amount-7', output: { displayName: 'Service fee', amountMinor: 1234 } }])
  })

  it('B-04 sends a successful update to the List route', () => {
    const page = amountResource.update({ id: 'amount-7' })

    expect(page.defaultTo).toEqual({ name: 'loom-eval-amounts' })
  })

  it('B-05 constructs the cleaned declaration without an unsupported member', () => {
    expect(invalidResource.key).toBe('loom-eval-invalid-amount')
  })
})

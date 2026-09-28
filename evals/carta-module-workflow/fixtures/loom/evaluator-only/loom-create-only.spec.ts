import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { serviceRequestResource } from '../__eval/plan066/loom-create-only.module'
import { readCreatedRequests, resetCreateOnlyFixture } from '../__eval/plan066/loom-create-only.services'
import { cleanupFramework, mountFramework } from './loom-agent-eval-harness'

afterEach(() => {
  resetCreateOnlyFixture()
  cleanupFramework()
})

describe('D create-only module', () => {
  it('D-01 sends valid input through the bound create operation and returns its typed id', async () => {
    mountFramework(() => h('div'))

    await expect(serviceRequestResource.create.form.submit({ name: 'Water filter' })).resolves.toEqual({ id: 'request-1', name: 'Water filter' })

    expect(readCreatedRequests()).toEqual([{ id: 'request-1', name: 'Water filter' }])
  })

  it('D-02 exposes create without list or detail operations', () => {
    expect(Object.hasOwn(serviceRequestResource, 'create')).toBe(true)
    expect(Object.hasOwn(serviceRequestResource, 'list')).toBe(false)
    expect(Object.hasOwn(serviceRequestResource, 'detail')).toBe(false)
  })
})

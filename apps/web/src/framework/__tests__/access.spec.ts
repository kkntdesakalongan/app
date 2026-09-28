import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { permissions } from '@/stores/permissions'
import { resourceCan } from '../access'

beforeEach(() => setActivePinia(createPinia()))

describe('resourceCan', () => {
  it('checks the permission declared on the resource', () => {
    const can = resourceCan({ permissions: { create: 'create-x', delete: null } })
    expect(can('list')).toBe(true)
    expect(can('delete')).toBe(true)
  })

  it('follows the identity permission set for declared operations', () => {
    const store = permissions()
    store.build(['create-x'])
    const can = resourceCan({ permissions: { create: 'create-x', update: 'update-x' } })
    expect(can('create')).toBe(true)
    expect(can('update')).toBe(false)
  })
})

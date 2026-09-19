import { beforeEach, describe, expect, it, vi } from 'vitest'

const canPermission = vi.hoisted(() => vi.fn())
vi.mock('@/stores/permissions', () => ({ permissions: () => ({ can: canPermission }) }))

import { accessAdapter, allowsPermission } from './bundle'
import { defineResource } from '@southneuhof/loom'
import type { WebResourceSchema } from '@southneuhof/loom'

type PayRow = { id: string; allowedOperations?: string[] }
type PaySchema = WebResourceSchema<PayRow, Record<string, never>, { id: string }, { id: string }, string>

/** Declares the custom name so the adapter gates it by row. `refund` stays undeclared. */
function declarePayAction() {
  defineResource({ identity: 'id' } as PaySchema, {
    key: 'adapter-custom-fixture',
    actions: {
      pay: { run: async () => ({ id: 'o1' }), permission: 'pay-orders' },
    },
  })
}

describe('web access adapter', () => {
  beforeEach(() => canPermission.mockReset())

  it('uses server operations for project records', () => {
    const record = { id: 'project-1', allowedOperations: ['detail', 'delete'] }

    expect(accessAdapter.allows({ operation: 'detail', permission: 'view-projects', record })).toBe(true)
    expect(accessAdapter.allows({ operation: 'update', permission: 'manage-projects', record })).toBe(false)
    expect(accessAdapter.allows({ operation: 'delete', permission: 'manage-projects', record })).toBe(true)
    expect(canPermission).not.toHaveBeenCalled()
  })

  it('hides View by explicit omission on workflow-shaped rows', () => {
    const workflow = { id: 'order-1', allowedOperations: ['update', 'pay', 'cancel'] }

    expect(accessAdapter.allows({ operation: 'detail', permission: 'view-orders', record: workflow })).toBe(false)
    expect(accessAdapter.allows({ operation: 'update', permission: 'update-orders', record: workflow })).toBe(true)
    expect(accessAdapter.allows({ operation: 'detail', permission: 'view-orders', record: { id: 'order-2', allowedOperations: ['detail'] } })).toBe(true)
    expect(canPermission).not.toHaveBeenCalled()
  })

  it('never gates collection ops by row', () => {
    canPermission.mockImplementation((permission: string) => permission === 'view-orders')

    expect(accessAdapter.allows({ operation: 'list', permission: 'view-orders', record: { allowedOperations: ['update'] } })).toBe(true)
    expect(accessAdapter.allows({ operation: 'create', permission: 'view-orders', record: { allowedOperations: ['update'] } })).toBe(true)
    expect(accessAdapter.allows({ operation: 'list', permission: 'denied-scope', record: { allowedOperations: ['list', 'detail'] } })).toBe(false)
    expect(canPermission).toHaveBeenCalledWith('view-orders')
    expect(canPermission).toHaveBeenCalledWith('denied-scope')
  })
  it('uses exact declared permissions without record operations', () => {
    canPermission.mockImplementation((permission: string) => permission === 'detail-users' || permission === 'view-users')

    expect(accessAdapter.allows({ operation: 'detail', permission: 'detail-users' })).toBe(true)
    expect(accessAdapter.allows({ operation: 'detail', permission: ['users', 'detail'].join('.') })).toBe(false)
    expect(accessAdapter.allows({ operation: 'list', permission: undefined })).toBe(true)
    expect(allowsPermission('view-users')).toBe(true)
    expect(canPermission).toHaveBeenCalledWith('detail-users')
    expect(canPermission).toHaveBeenCalledWith('users.detail')
  })

  it('accepts the effective /me union for targetless checks', () => {
    const effective = new Set(['view-users', 'create-rtm'])
    canPermission.mockImplementation((permission: string) => effective.has(permission))

    expect(allowsPermission('create-rtm')).toBe(true)
    expect(allowsPermission('view-users')).toBe(true)
    expect(allowsPermission('list-divisions')).toBe(false)
  })

  it('gates a declared custom action by row without consulting permission', () => {
    declarePayAction()
    canPermission.mockReturnValue(false)

    expect(accessAdapter.allows({ operation: 'pay', permission: 'pay-orders', record: { id: 'o1', allowedOperations: ['pay'] } })).toBe(true)
    expect(canPermission).not.toHaveBeenCalled()
    canPermission.mockReturnValue(true)
    expect(accessAdapter.allows({ operation: 'pay', permission: 'pay-orders', record: { id: 'o2', allowedOperations: ['detail'] } })).toBe(false)
    expect(canPermission).not.toHaveBeenCalled()
  })

  it('keeps permission-only behavior for an undeclared custom name', () => {
    canPermission.mockImplementation((permission: string) => permission === 'pay-orders')

    expect(accessAdapter.allows({ operation: 'refund', permission: 'pay-orders', record: { id: 'o1', allowedOperations: ['pay'] } })).toBe(true)
    expect(accessAdapter.allows({ operation: 'refund', permission: 'denied-scope', record: { id: 'o1', allowedOperations: ['pay'] } })).toBe(false)
  })

  it('does not infer access from a malformed operations field', () => {
    canPermission.mockReturnValue(false)

    expect(accessAdapter.allows({ operation: 'update', permission: 'manage-projects', record: { allowedOperations: 'update' } })).toBe(false)
    expect(accessAdapter.allows({ operation: 'update', permission: 'manage-projects', record: {} })).toBe(false)
  })
})

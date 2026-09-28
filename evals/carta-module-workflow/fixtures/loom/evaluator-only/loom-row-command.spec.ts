import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { Table } from '@southneuhof/loom'
import { requestResource, verifyRow } from '../__eval/plan066/loom-row-command.module'
import {
  readRequestListLoads,
  readVerifiedRequests,
  resetRequestCommandFixture,
  type RequestRecord,
} from '../__eval/plan066/loom-row-command.services'
import { cleanupFramework, mountFramework } from './loom-agent-eval-harness'

afterEach(() => {
  resetRequestCommandFixture()
  cleanupFramework()
})

describe('C row command', () => {
  it('C-01 checks permission and row policy as separate gates', async () => {
    let permissionAllowed = false
    mountFramework(() => h('div'), (request) => request.permission === null || permissionAllowed)
    const permissionDenied: RequestRecord = { id: 'permission-denied', status: 'open', allowedOperations: ['verify'] }
    const rowDenied: RequestRecord = { id: 'row-denied', status: 'open', allowedOperations: [] }

    await expect(verifyRow(permissionDenied, { id: permissionDenied.id, note: 'checked' })).rejects.toThrow('is not allowed')
    permissionAllowed = true
    await expect(verifyRow(rowDenied, { id: rowDenied.id, note: 'checked' })).rejects.toThrow('is not allowed')

    expect(readVerifiedRequests()).toEqual([])
  })

  it('C-02 preserves the business payload and result for an allowed row', async () => {
    mountFramework(() => h('div'), (request) => request.permission === null || request.permission === 'requests.verify')
    const allowed: RequestRecord = { id: 'request-1', status: 'open', allowedOperations: ['verify'] }
    const input = { id: 'request-1', note: 'Invoice checked' }

    await expect(verifyRow(allowed, input)).resolves.toEqual({ id: 'request-1', status: 'verified', note: 'Invoice checked' })

    expect(readVerifiedRequests()).toEqual([input])
  })

  it('C-03 refreshes the bound request list after a successful command', async () => {
    mountFramework(() => h(Table, { ...requestResource.list.table }))
    const row: RequestRecord = { id: 'request-1', status: 'open', allowedOperations: ['verify'] }

    await vi.waitFor(() => expect(readRequestListLoads()).toBe(1))
    await vi.waitFor(() => expect(document.body.textContent).toContain('open'))
    await verifyRow(row, { id: 'request-1', note: 'Invoice checked' })
    await vi.waitFor(() => expect(document.body.textContent).toContain('verified'))
    expect(readRequestListLoads()).toBeGreaterThan(1)
  })
})

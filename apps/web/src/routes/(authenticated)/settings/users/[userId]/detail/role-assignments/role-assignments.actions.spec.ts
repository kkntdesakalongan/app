import { expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn<(args: { param: { userId: string }; query: Record<string, never> }, options: { init: { signal: AbortSignal } }) => Promise<Response>>(),
}))

vi.mock('@/framework/rpc', () => ({
  rpc: { users: { ':userId': { 'role-assignments': { $get: mocks.get } } } },
}))

import { roleAssignmentsActions } from './role-assignments.actions'

it('aborts the role assignment request when the collection load is cancelled', async () => {
  mocks.get.mockImplementation(
    (_args, { init: { signal } }) =>
      new Promise<Response>((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Request aborted', 'AbortError')), { once: true })
      })
  )

  const controller = new AbortController()
  const request = roleAssignmentsActions.list({ query: {}, searchParameters: { userId: 'u1' }, signal: controller.signal })
  controller.abort()

  await expect(request).rejects.toThrow('Request aborted')
})

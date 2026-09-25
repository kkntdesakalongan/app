import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { FrameworkPlugin, createFrameworkQueryClient, resetResourceRuntimeForTests, resolveFrameworkAdapters } from '@southneuhof/loom'
import { createRouteQueryAdapter } from '@/framework/adapters/query/routeQuery'
import { appDisplayRenderers } from '@/framework/display/renderers'

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  set: vi.fn(),
  can: vi.fn(),
  toastError: vi.fn(),
  rows: [] as any[],
}))

vi.mock('./role-assignments.actions', () => ({
  roleAssignmentsActions: {
    list: ({ searchParameters }: { searchParameters: Record<string, unknown> }) => mocks.load(String(searchParameters.userId ?? ''), searchParameters),
    set: mocks.set,
  },
}))
vi.mock('@/stores/permissions', () => ({ permissions: () => ({ can: mocks.can }) }))
vi.mock('vue-sonner', () => ({ toast: { error: mocks.toastError } }))

const Route = (await import('./index.route.vue')).default

const baseRows = [
  { id: 'r1', roleCode: 'admin', name: 'Admin', description: 'Manage accounts', active: true, assigned: true },
  { id: 'r4', roleCode: 'available', name: 'Available', description: null, active: true, assigned: false },
]

async function flush(times = 8) {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await Promise.resolve()
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

async function mountRoute(path = '/settings/users/u1/detail/role-assignments') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/settings/users/:userId/detail/role-assignments', name: 'settings-users-detail-role-assignments', component: Route }],
  })
  await router.push(path)
  await router.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent(() => () => h(Route)))
  app.use(router)
  app.use(FrameworkPlugin, {
    adapters: resolveFrameworkAdapters({ query: createRouteQueryAdapter(router) }),
    renderers: { display: appDisplayRenderers },
    queryClient: createFrameworkQueryClient({ retry: 0, staleTime: 0 }),
  })
  app.directive('tippy', {})
  app.mount(host)
  await flush()

  return {
    host,
    router,
    switchButton: (id: string) => host.querySelector<HTMLButtonElement>(`[data-role="${id}"] button`)!,
    switchRoot: (id: string) => host.querySelector<HTMLElement>(`[data-role="${id}"]`)!,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
}

beforeEach(() => {
  mocks.load.mockReset()
  mocks.set.mockReset()
  mocks.can.mockReset()
  mocks.toastError.mockReset()
  mocks.can.mockReturnValue(true)
  mocks.rows = baseRows.map((row) => ({ ...row }))
  mocks.load.mockImplementation(async (_userId: string, searchParameters: Record<string, unknown>) => ({
    data: mocks.rows.map((row) => ({ ...row })),
    meta: { total: mocks.rows.length },
    searchParameters,
  }))
  mocks.set.mockImplementation(async (_userId: string, roleId: string, assigned: boolean) => {
    const row = mocks.rows.find((item) => item.id === roleId)
    if (row) row.assigned = assigned
    return mocks.rows.map((row) => ({ ...row }))
  })
})

afterEach(() => resetResourceRuntimeForTests())

describe('role assignment screen', () => {
  it('lists roles and toggles assignment without scope filters', async () => {
    const view = await mountRoute()

    expect(view.host.textContent).toContain('Admin')
    expect(view.host.textContent).toContain('Available')
    expect(mocks.load.mock.calls.at(-1)?.[1]).toMatchObject({ userId: 'u1' })

    view.switchButton('r4').click()
    await flush()
    expect(mocks.set).toHaveBeenCalledWith('u1', 'r4', true)

    view.switchButton('r1').click()
    await flush()
    expect(mocks.set).toHaveBeenCalledWith('u1', 'r1', false)
    view.unmount()
  })
})

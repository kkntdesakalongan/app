import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { FrameworkPlugin, createFrameworkQueryClient, resetResourceRuntimeForTests, resolveFrameworkAdapters } from '@southneuhof/loom'
import { createRouteQueryAdapter } from '@/framework/adapters/query/routeQuery'
import { appDisplayRenderers } from '@/framework/display/renderers'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('./users.actions', () => ({
  usersActions: { list: mocks.list, detail: mocks.detail, create: mocks.create, update: mocks.update },
}))

const Route = (await import('./index.route.vue')).default

async function mountRoute() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings/users', name: 'settings-users', component: Route },
      { path: '/settings/users/create', name: 'settings-users-create', component: Route },
      { path: '/settings/users/:userId/detail', name: 'settings-users-detail', component: Route },
      { path: '/settings/users/:userId/edit', name: 'settings-users-edit', component: Route },
    ],
  })
  await router.push('/settings/users')
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

  return {
    host,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
}

beforeEach(() => {
  mocks.list.mockReset()
  mocks.detail.mockReset()
  mocks.create.mockReset()
  mocks.update.mockReset()
  mocks.list.mockResolvedValue({
    data: [{ id: 'u1', name: 'Ada Lovelace', email: 'ada@example.test', statusCode: 'active', createdAt: '2025-01-01T00:00:00.000Z' }],
    meta: { total: 1, page: 1, pageSize: 10, totalPage: 1 },
  })
})

afterEach(() => resetResourceRuntimeForTests())

describe('users route', () => {
  it('loads the real resource after compiling its form definitions', async () => {
    const view = await mountRoute()

    try {
      await vi.waitFor(() => expect(view.host.textContent).toContain('Ada Lovelace'))
      expect(mocks.list).toHaveBeenCalled()
    } finally {
      view.unmount()
    }
  })
})

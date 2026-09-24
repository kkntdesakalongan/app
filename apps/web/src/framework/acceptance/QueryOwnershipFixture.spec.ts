import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { FrameworkPlugin, createFrameworkQueryClient, resetResourceRuntimeForTests } from '@southneuhof/loom'
import Fixture from './QueryOwnershipFixture.vue'
import { createRouteQueryAdapter } from '../adapters/query/routeQuery'

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

async function flush(times = 8) {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await Promise.resolve()
    await nextTick()
  }
  await settle()
}

async function mountFixture() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/fixture', component: defineComponent(() => () => h('div')) }],
  })
  await router.push('/fixture?tab=summary')
  await router.isReady()

  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent(() => () => h(Fixture)))
  app.use(router)
  app.use(FrameworkPlugin, {
    adapters: { query: createRouteQueryAdapter(router) },
    queryClient: createFrameworkQueryClient({ retry: 0, staleTime: 0 }),
  })
  app.mount(host)
  await flush()

  const section = (name: string) => host.querySelector<HTMLElement>(`#fixture-${name}`)!
  const nextPage = async (element: HTMLElement, tableIndex: number) => {
    const navs = element.querySelectorAll('nav')
    navs[tableIndex].querySelectorAll('button')[1].dispatchEvent(new MouseEvent('click'))
    await flush()
  }

  return {
    host,
    router,
    section,
    nextPage,
    query: () => router.currentRoute.value.query,
    unmount: () => {
      app.unmount()
      host.remove()
      resetResourceRuntimeForTests()
    },
  }
}

describe('query ownership acceptance fixture', () => {
  it('gives two different resources independent namespaces with no explicit binding', async () => {
    const view = await mountFixture()

    await view.nextPage(view.section('two-resources'), 0)
    expect(view.query()['alpha.page']).toBe('2')
    expect(view.query()['beta.page']).toBeUndefined()

    await view.nextPage(view.section('two-resources'), 1)
    expect(view.query()['beta.page']).toBe('2')
    expect(view.query()['alpha.page']).toBe('2')
    view.unmount()
  })

  it('separates a duplicated resource through an explicit namespace on the second instance only', async () => {
    const view = await mountFixture()

    await view.nextPage(view.section('duplicate-resource'), 1)

    expect(view.query()['archived.page']).toBe('2')
    expect(view.query()['alpha.page']).toBeUndefined()
    view.unmount()
  })

  it('preserves unrelated query parameters and restores table state on back navigation', async () => {
    const view = await mountFixture()

    await view.nextPage(view.section('two-resources'), 0)
    expect(view.query().tab).toBe('summary')
    expect(view.query()['alpha.page']).toBe('2')

    // Paging replaces rather than pushes, so back returns to the previous
    // screen and forward restores the table state from the URL itself.
    await view.router.push('/fixture?tab=detail')
    await flush()
    expect(view.query()['alpha.page']).toBeUndefined()

    view.router.back()
    await flush()
    expect(view.query()['alpha.page']).toBe('2')
    expect(view.query().tab).toBe('summary')
    view.unmount()
  })

  it('renders a synchronous offline loader exactly like an asynchronous one', async () => {
    const view = await mountFixture()

    const offlineRows = view.section('offline').querySelectorAll('tbody tr')
    const asyncRows = view.section('two-resources').querySelectorAll('tbody tr')

    expect(offlineRows).toHaveLength(2)
    expect(asyncRows.length / 2).toBe(2)
    view.unmount()
  })

  it('keeps a locally controlled query out of the URL', async () => {
    const view = await mountFixture()

    await view.nextPage(view.section('local-query'), 0)

    expect(Object.keys(view.query()).some((key) => key.startsWith('undefined'))).toBe(false)
    expect(view.query()['local.page']).toBeUndefined()
    expect(view.section('local-query').textContent).toContain('2 / 4')
    view.unmount()
  })

  it('renders an exceptional read field beside ordinary fields', async () => {
    const view = await mountFixture()

    expect(view.section('offline').textContent).toContain('Budi')
    expect(view.section('offline').textContent).toContain('Pertama')
    view.unmount()
  })

  it('shows a behavior-driven field only when its dependency says so', async () => {
    const view = await mountFixture()
    const draft = view.section('draft')

    expect(draft.querySelectorAll('input')).toHaveLength(1)

    const kind = draft.querySelector('input')!
    kind.value = 'lain'
    kind.dispatchEvent(new Event('input'))
    await flush()

    expect(draft.querySelectorAll('input')).toHaveLength(2)
    view.unmount()
  })
})

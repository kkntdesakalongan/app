import { createMemoryHistory, createRouter } from 'vue-router'
import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/navigations/sidebar/rail/Sidebar.vue', () => ({ default: { name: 'Sidebar' } }))
vi.mock('@/components/navigations/sidebar/drawer/NavigationDrawer.vue', () => ({ default: { name: 'NavigationDrawer' } }))
vi.mock('@/components/routing/AppRouterView.vue', () => ({ default: { name: 'AppRouterView' } }))
vi.mock('@/components/navigations/GlobalToolbar.vue', () => ({ default: { name: 'GlobalToolbar' } }))
vi.mock('@/assets/corporate/common/Logo.vue', () => ({ default: { name: 'Logo' } }))

import AuthenticatedLayout from './authenticated.layout.vue'

describe('authenticated layout', () => {
  it('uses one desktop toolbar height for the grid and branding', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', name: 'dashboard', component: AuthenticatedLayout }] })
    await router.push('/')
    const wrapper = shallowMount(AuthenticatedLayout, { global: { plugins: [router] } })
    const shell = wrapper.get('div')
    const branding = shell.get('div')

    expect(shell.classes()).toContain('lg:grid-rows-[var(--app-toolbar-height)_minmax(0,1fr)]')
    expect(branding.classes()).toContain('h-full')
    wrapper.unmount()
  })
})

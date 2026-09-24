import { createRendererRegistries } from '@southneuhof/loom'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { statusCatalog } from '@/configs/statuses'
import { appDisplayRenderers } from './renderers'

describe('app display renderers', () => {
  it('registers app renderers in the shared display registry', () => {
    const registries = createRendererRegistries({ display: appDisplayRenderers })

    for (const key of ['chip', 'html', 'image', 'file', 'array-clauses']) {
      expect(registries.display.has(key)).toBe(true)
    }
    expect(registries.form.has('chip')).toBe(false)
  })

  it('renders status labels and colours from the shared status catalog', () => {
    const renderer = createRendererRegistries({ display: appDisplayRenderers }).display.require('chip')
    const view = mount(renderer, { props: { value: 'active', options: statusCatalog } })

    expect(view.text()).toBe('Aktif')
    expect(view.classes()).toContain('bg-success')
    view.unmount()
  })

  it('renders text-only content for the HTML display key', () => {
    const renderer = createRendererRegistries({ display: appDisplayRenderers }).display.require('html')
    const view = mount(renderer, { props: { value: '<strong>Plain text</strong>' } })

    expect(view.text()).toBe('<strong>Plain text</strong>')
    expect(view.find('strong').exists()).toBe(false)
    view.unmount()
  })

  it('renders stored image assets through the image preview', () => {
    const renderer = createRendererRegistries({ display: appDisplayRenderers }).display.require('image')
    const view = mount(renderer, {
      props: {
        value: { kind: 'file', id: 'uploads/cover.png', url: 'https://files.test/cover.png', name: 'cover.png' },
      },
    })

    expect(view.find('img').attributes('src')).toBe('https://files.test/cover.png')
    view.unmount()
  })
})

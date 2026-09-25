import { createRendererRegistries } from '@southneuhof/loom'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { FrameworkPlugin, type AssetAdapter, type AssetValue } from '@southneuhof/loom'
import { statusCatalog } from '@/configs/statuses'
import { appDisplayRenderers } from './renderers'

const displayAssets: AssetAdapter = {
  read(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const asset = value as Record<string, unknown>
    return asset.kind === 'file' && typeof asset.id === 'string' && typeof asset.url === 'string' && typeof asset.name === 'string' ? (value as AssetValue) : null
  },
  preview(asset) {
    return { imageURL: `/display${asset.url}`, thumbnailURL: `/display${asset.url}` }
  },
  async upload() {
    throw new Error('Display tests do not upload assets.')
  },
}

function mountAssetRenderer(renderer: typeof appDisplayRenderers.image | typeof appDisplayRenderers.file, value: unknown) {
  return mount(renderer, {
    props: { value },
    global: { plugins: [[FrameworkPlugin, { adapters: { assets: displayAssets } }]] },
  })
}

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
    const view = mountAssetRenderer(renderer as typeof appDisplayRenderers.image, {
      kind: 'file',
      id: 'uploads/cover.png',
      url: 'https://files.test/cover.png',
      name: 'cover.png',
    })

    expect(view.find('img').attributes('src')).toBe('/displayhttps://files.test/cover.png')
    view.unmount()
  })

  it('renders file links through the same asset preview service', () => {
    const renderer = createRendererRegistries({ display: appDisplayRenderers }).display.require('file')
    const view = mountAssetRenderer(renderer as typeof appDisplayRenderers.file, {
      kind: 'file',
      id: 'uploads/report.pdf',
      url: 'https://files.test/report.pdf',
      name: 'report.pdf',
    })

    expect(view.find('a').attributes('href')).toBe('/displayhttps://files.test/report.pdf')
    expect(view.text()).toContain('report.pdf')
    view.unmount()
  })
})

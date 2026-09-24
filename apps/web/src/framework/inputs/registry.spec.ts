import { describe, expect, it, vi } from 'vitest'
import { appInputProps } from './registry'

const list = vi.fn(async () => ({ data: [] }))
const detail = vi.fn(async () => ({ id: 'x' }))
const asset = { kind: 'file' as const, id: 'uploads/a.png', url: 'https://api.test/files/object?key=uploads%2Fa.png', name: 'a.png', mimeType: 'image/png' }

describe('app input props registry', () => {
  it('forwards explicit lookup loaders and keeps field props', async () => {
    const resolved = appInputProps.resolve('lookup', {
      source: { load: list, loadDetail: detail, namespace: 'sections' },
      props: { searchParameters: { private: true } },
    })

    expect(resolved).toMatchObject({ load: list, loadDetail: detail, namespace: 'sections', searchParameters: { private: true } })
    const loadDetail = resolved.loadDetail as (context: { id: string }) => Promise<unknown>
    await expect(loadDetail({ id: 'x' })).resolves.toEqual({ id: 'x' })
    expect(detail).toHaveBeenCalledWith({ id: 'x' })
  })

  it('requires lookup identity hydration to have an explicit loader', () => {
    expect(() => appInputProps.resolve('lookup', { source: { load: list } })).toThrow('Lookup input source needs a loadDetail function.')
  })

  it('forwards explicit option loaders without deriving a namespace', () => {
    expect(appInputProps.resolve('select', { source: { load: list } })).toEqual({ load: list })
  })

  it('shares file and image upload defaults', () => {
    expect(appInputProps.resolve('file', {}).upload).toBe(appInputProps.resolve('image', {}).upload)
  })

  it('resolves image preview URLs from stored assets', () => {
    const resolve = appInputProps.resolve('image', {}).imageURLResolver as (payload: unknown) => { imageURL: string; thumbnailURL: string }
    expect(resolve(asset)).toEqual({
      imageURL: 'https://api.test/files/object?key=uploads%2Fa.png',
      thumbnailURL: 'https://api.test/files/object?key=uploads%2Fa.png',
    })
    expect(resolve('uploads/a.png')).toEqual({ imageURL: '', thumbnailURL: '' })
  })

  it('hydrates asset values for Form', () => {
    expect(appInputProps.hydrate('image', asset)).toMatchObject({ id: 'uploads/a.png', name: 'a.png' })
  })
})

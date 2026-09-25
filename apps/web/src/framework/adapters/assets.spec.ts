import { describe, expect, it, vi } from 'vitest'

const { uploadFile } = vi.hoisted(() => ({ uploadFile: vi.fn() }))
vi.mock('./storage', () => ({ uploadFile }))

const { assetAdapter } = await import('./assets')

const asset = {
  kind: 'file' as const,
  id: 'uploads/a.txt',
  url: 'https://api.test/files/object?key=uploads%2Fa.txt',
  name: 'a.txt',
  size: 1,
  mimeType: 'text/plain',
}

describe('application asset adapter', () => {
  it('accepts the exact API asset object without replacing it', () => {
    expect(assetAdapter.read(asset)).toBe(asset)
  })

  it('rejects raw keys, URLs, aliases, partial objects, and envelopes', () => {
    expect(assetAdapter.read('uploads/a.txt')).toBeNull()
    expect(assetAdapter.read('https://cdn.test/a.txt')).toBeNull()
    expect(assetAdapter.read({ key: asset.id, url: asset.url, name: asset.name })).toBeNull()
    expect(assetAdapter.read({ ...asset, url: '/files/a.txt' })).toBeNull()
    expect(assetAdapter.read({ data: asset })).toBeNull()
    expect(assetAdapter.read([asset])).toBeNull()
  })

  it('uses the exact URL for previews', () => {
    expect(assetAdapter.preview(asset)).toEqual({ imageURL: asset.url, thumbnailURL: asset.url })
  })

  it('returns the canonical upload result and forwards upload progress', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    const signal = new AbortController().signal
    const progress = vi.fn()
    uploadFile.mockResolvedValue(asset)

    const result = await assetAdapter.upload(file, { destination: 'documents', signal, onProgress: progress })

    expect(uploadFile).toHaveBeenCalledWith(file, { signal, onProgress: progress })
    expect(result).toEqual(asset)
  })

  it('rejects malformed upload results', async () => {
    uploadFile.mockResolvedValue({ key: asset.id, url: asset.url, file: new File(['x'], 'a.txt') })
    await expect(assetAdapter.upload(new File(['x'], 'a.txt'), {})).rejects.toThrow('ASSET_ADAPTER_INVALID_RESULT')
  })
})

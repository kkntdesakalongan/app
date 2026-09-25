import type { AssetAdapter, AssetPreview, AssetValue } from '@southneuhof/loom'
import { storedAssetSchema, type StoredAsset } from '@southneuhof/api/schema'
import { uploadFile } from './storage'

function readAsset(value: unknown): AssetValue | null {
  const parsed = storedAssetSchema.safeParse(value)
  return parsed.success ? (value as AssetValue) : null
}

function preview(value: AssetValue): AssetPreview {
  const url = value.url
  return { imageURL: url, thumbnailURL: url }
}

export const assetAdapter: AssetAdapter = {
  read: readAsset,
  preview,
  async upload(blob, { signal, onProgress }) {
    if (!(blob instanceof File)) throw new Error('Input upload requires a File.')
    const asset: StoredAsset = await uploadFile(blob, { signal, onProgress })
    const value = readAsset(asset)
    if (!value) throw new Error('[loom] ASSET_ADAPTER_INVALID_RESULT')
    return value
  },
}

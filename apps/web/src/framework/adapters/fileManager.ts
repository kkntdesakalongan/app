import type { FileManagerPluginOptions, ManagedAsset } from '@southneuhof/loom/file-manager'
import { storedAssetSchema, type StoredAsset } from '@southneuhof/api/src/schema.ts'
import { deleteFile, listFiles, uploadFile, type StoredFolder } from './storage'

function isFolder(input: unknown): input is StoredFolder {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const folder = input as Record<string, unknown>
  return folder.kind === 'folder' && typeof folder.id === 'string' && typeof folder.parentId === 'string' && typeof folder.name === 'string'
}

export function canonicalAsset(input: StoredAsset | StoredFolder, parentId: string | null = null): ManagedAsset {
  const folder = isFolder(input) ? input : undefined
  if (folder) return folder

  const asset = storedAssetSchema.parse(input)
  return {
    ...asset,
    parentId,
    previewUrl: asset.url,
  }
}

export const fileManagerOptions: FileManagerPluginOptions = {
  root: 'uploads/',
  operations: {
    async list({ parentId, sort, signal }) {
      void sort
      const data = (await listFiles(parentId ?? 'uploads/', signal)).map((asset) => canonicalAsset(asset, parentId))
      return { data, meta: { total: data.length, totalPage: 1 } }
    },
    async upload(file, { parentId, onProgress, signal }) {
      const asset = await uploadFile(file, { signal, onProgress })
      return canonicalAsset(asset, parentId)
    },
    async remove({ id, signal }) {
      await deleteFile(id, signal)
    },
  },
  values: {
    async fromModel(value) {
      if (!value) return undefined
      return canonicalAsset(storedAssetSchema.parse(value))
    },
    async toModel(asset) {
      if (asset.kind !== 'file') throw new Error('Folders cannot be persisted as input asset values.')
      const value = storedAssetSchema.parse({
        kind: 'file',
        id: asset.id,
        url: asset.previewUrl,
        name: asset.name,
        ...(asset.mimeType === undefined ? {} : { mimeType: asset.mimeType }),
        ...(asset.size === undefined ? {} : { size: asset.size }),
        ...(asset.updatedAt === undefined ? {} : { updatedAt: asset.updatedAt }),
        ...(asset.metadata === undefined ? {} : { metadata: asset.metadata }),
      })
      return value
    },
  },
}

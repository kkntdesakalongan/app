import type { UploadContext, UploadProgress } from '@southneuhof/loom'
import { storedAssetSchema, type StoredAsset } from '@southneuhof/api/src/schema.ts'
import { rpc } from '../rpc'

type SignedUpload = {
  asset: StoredAsset
  uploadUrl: string
  method: 'PUT'
  headers: Record<string, string>
}

export type StoredFolder = {
  id: string
  parentId: string | null
  kind: 'folder'
  name: string
}

export type StoredFile = StoredAsset | StoredFolder

function responseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const record = payload as Record<string, unknown>
  const message = typeof record.message === 'string' ? record.message : typeof record.error === 'string' ? record.error : undefined
  return message ? message.slice(0, 200) : fallback
}

function parseSignedUpload(data: unknown): SignedUpload | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const signed = data as Record<string, unknown>
  const asset = storedAssetSchema.safeParse(signed.asset)
  if (
    !asset.success ||
    typeof signed.uploadUrl !== 'string' ||
    !signed.uploadUrl ||
    signed.method !== 'PUT' ||
    !signed.headers ||
    typeof signed.headers !== 'object' ||
    Array.isArray(signed.headers) ||
    !Object.values(signed.headers).every((value) => typeof value === 'string')
  )
    return null
  return {
    asset: asset.data,
    uploadUrl: signed.uploadUrl,
    method: 'PUT',
    headers: signed.headers as Record<string, string>,
  }
}

async function presign(file: File, signal?: AbortSignal): Promise<SignedUpload> {
  const response = await rpc.files['presigned-url'].$post(
    {
      json: {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      },
    },
    { init: { signal } }
  )
  const payload = await response.json().catch(() => undefined)
  if (!response.ok) throw new Error(responseMessage(payload, 'File upload could not be prepared.'))

  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : undefined
  const signed = parseSignedUpload(data)
  if (!signed) throw new Error('File upload configuration is invalid.')
  return signed
}

function uploadWithFetch(file: File, signed: SignedUpload, signal?: AbortSignal) {
  return fetch(signed.uploadUrl, {
    method: signed.method,
    headers: signed.headers,
    body: file,
    signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Direct file upload failed (status ${response.status}).`)
    })
    .catch((error) => {
      if (error instanceof Error && (error.message.startsWith('Direct file upload failed') || error.name === 'AbortError')) throw error
      throw new Error('Direct file upload failed due to a network error.')
    })
}

function uploadWithProgress(file: File, signed: SignedUpload, signal: AbortSignal | undefined, onProgress: (progress: UploadProgress) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let settled = false
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    const succeed = () => {
      if (settled) return
      settled = true
      cleanup()
      onProgress({ loaded: file.size, total: file.size })
      resolve()
    }
    const abort = () => xhr.abort()

    if (signal?.aborted) {
      fail(new Error('Direct file upload was aborted.'))
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    xhr.upload.addEventListener('progress', (event) => {
      const total = event.lengthComputable && event.total > 0 ? event.total : file.size
      onProgress({ loaded: Math.min(event.loaded, total), total })
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) succeed()
      else fail(new Error(`Direct file upload failed (status ${xhr.status}).`))
    })
    xhr.addEventListener('error', () => fail(new Error('Direct file upload failed due to a network error.')))
    xhr.addEventListener('abort', () => fail(new Error('Direct file upload was aborted.')))
    xhr.addEventListener('timeout', () => fail(new Error('Direct file upload timed out.')))

    try {
      xhr.open(signed.method, signed.uploadUrl)
      for (const [name, value] of Object.entries(signed.headers)) xhr.setRequestHeader(name, value)
      xhr.send(file)
    } catch {
      fail(new Error('Direct file upload could not be started.'))
    }
  })
}

export async function uploadFile(file: File, context: UploadContext = {}): Promise<StoredAsset> {
  const signed = await presign(file, context.signal)
  if (context.onProgress) await uploadWithProgress(file, signed, context.signal, context.onProgress)
  else await uploadWithFetch(file, signed, context.signal)
  return signed.asset
}

export async function listFiles(prefix: string, signal?: AbortSignal): Promise<StoredFile[]> {
  const response = await rpc.files.$get({ query: { prefix } }, { init: { signal } })
  const payload = await response.json().catch(() => undefined)
  if (!response.ok) throw new Error(responseMessage(payload, 'Files could not be loaded.'))
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : undefined
  if (!Array.isArray(data)) throw new Error('File list response is invalid.')
  return data.flatMap((entry): StoredFile[] => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && (entry as Record<string, unknown>).kind === 'folder') {
      const folder = entry as Record<string, unknown>
      if (typeof folder.id === 'string' && typeof folder.parentId === 'string' && typeof folder.name === 'string') {
        return [{ id: folder.id, parentId: folder.parentId, kind: 'folder' as const, name: folder.name }]
      }
      return []
    }
    const asset = storedAssetSchema.safeParse(entry)
    return asset.success ? [asset.data] : []
  })
}

export async function deleteFile(key: string, signal?: AbortSignal) {
  const response = await rpc.files.object.$delete({ json: { key } }, { init: { signal } })
  const payload = await response.json().catch(() => undefined)
  if (!response.ok) throw new Error(responseMessage(payload, 'File could not be deleted.'))
}

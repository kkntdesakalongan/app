import router from '../router'
import { storage } from '@southneuhof/utilities/storage'
import { clearIdentity } from '@/framework/identity'
import { toast } from 'vue-sonner'
import { apiUrl, rpc } from '@/framework/rpc'

type ServiceRequestOptions = {
  bypassErrorToast?: boolean
  responseType?: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text' | 'raw'
  init?: RequestInit
}

function extractErrorMessage(error: any): string {
  return String(error?.message?.message || error?.message || error?.error || error?.statusText || 'Terjadi kesalahan')
}

function parseURL(url: string, prefix: string = '', suffix: string = '') {
  if (url.endsWith('?custom')) return url.slice(0, -7)
  return `${prefix}${url}${suffix}`
}

function buildURL(path: string, query?: Record<string, any>) {
  const url = new URL(path.replace(/^\//, ''), new URL(apiUrl, window.location.origin))
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, String(item)))
    else url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function parseResponse(response: Response, responseType?: ServiceRequestOptions['responseType']) {
  if (responseType === 'raw') return response
  const type = responseType || (response.headers.get('Content-Type')?.includes('application/json') ? 'json' : 'text')
  return response[type === 'json' ? 'json' : type]()
}

async function notifyLogoutToServer() {
  try {
    await rpc.auth['sign-out'].$post({ json: {} })
  } catch (_) {
    // Best effort only: the local logout flow must continue if notification fails.
  }
}

class AppServices {
  // ponytail: local bridge for legacy endpoints; delete as routes move to Hono RPC.
  private async request(method: string, path: string, body?: unknown, query?: Record<string, any>, options?: ServiceRequestOptions) {
    const headers = new Headers({
      Accept: 'application/json, text/plain, */*',
      ...(options?.init?.headers as Record<string, string> | undefined),
    })
    const isObjectBody = body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)
    if (isObjectBody) headers.set('Content-Type', 'application/json')

    const response = await fetch(buildURL(path, query), {
      ...options?.init,
      method,
      headers,
      credentials: 'include',
      body: body == null ? undefined : isObjectBody ? JSON.stringify(body) : (body as BodyInit),
    })

    if (!response.ok) {
      const error = await parseResponse(response).catch(() => ({ status: response.status, statusText: response.statusText }))
      if (response.status === 401) this.signOut(false)
      if (!options?.bypassErrorToast) toast.error(extractErrorMessage(error))
      throw error
    }

    return parseResponse(response, options?.responseType)
  }

  get(path: string, query?: Record<string, any>, options?: ServiceRequestOptions) {
    return this.request('GET', path, undefined, query, options)
  }

  post(path: string, data?: any, options?: ServiceRequestOptions) {
    return this.request('POST', path, data, undefined, options)
  }

  put(path: string, data?: any, options?: ServiceRequestOptions) {
    return this.request('PUT', path, data, undefined, options)
  }

  patch(path: string, data?: any, options?: ServiceRequestOptions) {
    return this.request('PATCH', path, data, undefined, options)
  }

  del(path: string, data?: any, options?: ServiceRequestOptions) {
    return this.request('DELETE', path, data, undefined, options)
  }

  raw(path: string, query?: Record<string, any>, options?: ServiceRequestOptions): Promise<Response> {
    return this.get(path, query, { ...options, responseType: 'raw' }) as Promise<Response>
  }

  list(path: string, query?: Record<string, any>, options?: ServiceRequestOptions) {
    return this.get(parseURL(path, '', '/list'), query, options)
  }

  detail(path: string, identity?: string | number | Array<string | number>, query?: Record<string, any>, options?: ServiceRequestOptions) {
    const segments = identity == null ? [] : Array.isArray(identity) ? identity : [identity]
    const identityPath = segments.map((segment) => encodeURIComponent(String(segment))).join('/')
    return this.get(parseURL(path, '', `${identityPath ? `/${identityPath}` : ''}/show`), query, options)
  }

  create(path: string, data?: any, query?: Record<string, any>, options?: ServiceRequestOptions) {
    return this.request('POST', parseURL(path, '', '/create'), data, query, options)
  }

  update(path: string, data?: any, query?: Record<string, any>, options?: ServiceRequestOptions) {
    return this.request('PUT', parseURL(path, '', '/update'), data, query, options)
  }

  delete(path: string, data?: any, options?: ServiceRequestOptions) {
    return this.del(parseURL(path, '', '/delete'), data, options)
  }

  remove(path: string, data?: any, options?: ServiceRequestOptions) {
    return this.delete(path, data, options)
  }

  dataset(path: string, query?: Record<string, any>, options?: ServiceRequestOptions) {
    return this.get(parseURL(path, '', '/dataset'), query, options)
  }

  async exportExcel(path: string, fallbackFilename: string, query?: Record<string, any>, options?: ServiceRequestOptions) {
    return this.downloadResponse(await this.raw(parseURL(path, '', '/export-excel'), query, options), fallbackFilename)
  }

  async downloadFile(path: string, filename: string, query?: Record<string, any>, options?: ServiceRequestOptions) {
    return this.downloadResponse(await this.raw(path, query, options), filename)
  }

  fileUploadNoAuth(file: Blob, _onUploadProgress?: (progress: { loaded: number; total: number }) => void, options?: ServiceRequestOptions) {
    const formData = new FormData()
    formData.append('file', file)
    return this.post('no-auth/upload', formData, options)
  }

  progress(method: string, path: string, payload: Record<string, any>, onUploadProgress?: (progress: { loaded: number; total: number }) => void, options?: ServiceRequestOptions) {
    void onUploadProgress
    return this.request(method.toUpperCase(), path, payload, undefined, options)
  }

  signOut(notifyServer: boolean = true) {
    if (notifyServer) void notifyLogoutToServer()

    clearIdentity()
    storage.cookie.clear()
    router.push({ name: 'auth-login', force: true })
  }

  private async downloadResponse(response: Response, fallbackFilename: string) {
    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition')
    const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] || fallbackFilename
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}

const services = new AppServices()

export default services

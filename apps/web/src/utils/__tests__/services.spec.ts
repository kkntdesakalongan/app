import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.test/')
})

const mocks = vi.hoisted(() => {
  const state = new Map<string, unknown>()
  const storage = {
    localStorage: {
      get: vi.fn((key: string) => state.get(key)),
      set: vi.fn((key: string, value: unknown) => state.set(key, value)),
      clear: vi.fn(() => state.clear()),
    },
    cookie: {
      clear: vi.fn(),
    },
  }

  return {
    state,
    storage,
    router: { push: vi.fn() },
    clearIdentity: vi.fn(),
    signOut: vi.fn(),
    toastError: vi.fn(),
  }
})

vi.mock('@/router', () => ({ default: mocks.router }))
vi.mock('@southneuhof/utilities/storage', () => ({ storage: mocks.storage }))
vi.mock('@/framework/identity', () => ({ clearIdentity: mocks.clearIdentity }))
vi.mock('vue-sonner', () => ({ toast: { error: mocks.toastError } }))
vi.mock('@/framework/rpc', () => ({
  apiUrl: 'http://api.test/api/',
  rpc: { auth: { 'sign-out': { $post: mocks.signOut } } },
}))

import services from '../services'

const originalFetch = globalThis.fetch
const fetchMock = vi.fn()

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Bad Request',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
  }
}

describe('legacy app services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockReset()
    mocks.state.clear()
    mocks.state.set('colorPreference', 'dark')
    window.location.hash = ''
    globalThis.fetch = fetchMock as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  function createFile() {
    return new File(['file contents'], 'report.txt', { type: 'text/plain' })
  }

  it('encodes GET queries, repeats array keys, and omits nullish values', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }))

    await services.get('users', { status: ['active', 'pending'], page: 2, empty: null, missing: undefined })

    const requestUrl = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(requestUrl.pathname).toBe('/api/users')
    expect(requestUrl.searchParams.getAll('status')).toEqual(['active', 'pending'])
    expect(requestUrl.searchParams.get('page')).toBe('2')
    expect(requestUrl.searchParams.has('empty')).toBe(false)
    expect(requestUrl.searchParams.has('missing')).toBe(false)
  })

  it('serializes JSON requests and includes credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await services.post('users', { name: 'Alice' })

    const [, init] = fetchMock.mock.calls[0]!
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', body: JSON.stringify({ name: 'Alice' }) })
    expect((init as RequestInit).headers).toBeInstanceOf(Headers)
    expect((init as RequestInit).headers).toHaveProperty('get')
    expect(((init as RequestInit).headers as Headers).get('Content-Type')).toBe('application/json')
  })

  it('throws non-OK JSON errors and displays the extracted message', async () => {
    const error = { message: 'Validation failed' }
    fetchMock.mockResolvedValue(jsonResponse(error, 422))

    await expect(services.get('users')).rejects.toEqual(error)
    expect(mocks.toastError).toHaveBeenCalledWith('Validation failed')
  })

  it('clears browser state and routes to login after a 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Session expired' }, 401))

    await expect(services.get('users')).rejects.toEqual({ message: 'Session expired' })

    expect(mocks.clearIdentity).toHaveBeenCalledOnce()
    expect(mocks.storage.localStorage.clear).not.toHaveBeenCalled()
    expect(mocks.storage.cookie.clear).toHaveBeenCalledOnce()
    expect(mocks.state.get('colorPreference')).toBe('dark')
    expect(mocks.router.push).toHaveBeenCalledExactlyOnceWith({ name: 'auth-login', force: true })
  })

  it('notifies the server and leaves non-auth local storage on sign-out', () => {
    services.signOut()

    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.clearIdentity).toHaveBeenCalledOnce()
    expect(mocks.storage.localStorage.clear).not.toHaveBeenCalled()
    expect(mocks.state.get('colorPreference')).toBe('dark')
    expect(mocks.storage.cookie.clear).toHaveBeenCalledOnce()
    expect(mocks.router.push).toHaveBeenCalledExactlyOnceWith({ name: 'auth-login', force: true })
  })

  it('URI-encodes detail identity segments', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'user-1' }))

    await services.detail('users', 'team/member?active=true')

    const requestUrl = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(requestUrl.pathname).toBe('/api/users/team%2Fmember%3Factive%3Dtrue/show')
  })

  it('downloads a raw response and revokes one object URL', async () => {
    const blob = new Blob(['report'])
    const response = {
      ok: true,
      headers: new Headers({ 'Content-Disposition': 'attachment; filename="report.csv"' }),
      blob: vi.fn().mockResolvedValue(blob),
    }
    fetchMock.mockResolvedValue(response)
    const objectUrl = 'blob:report'
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl)
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await services.downloadFile('exports/report', 'fallback.csv')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith(objectUrl)
  })

  it('keeps fileUploadNoAuth as a multipart request', async () => {
    const file = createFile()
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: 'uploads/report.txt' }))

    await services.fileUploadNoAuth(file)

    const [, init] = fetchMock.mock.calls[0]!
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).body).toBeInstanceOf(FormData)
    expect(((init as RequestInit).body as FormData).get('file')).toBe(file)
  })
})

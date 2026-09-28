import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineDetail, defineForm, defineResource, resetResourceActionRegistry } from '@southneuhof/loom'
import type { RecordLoadContext } from '@southneuhof/loom'
import { z } from 'zod/v4'
import { createMemoryHistory, createRouter } from 'vue-router'

const authState = { identity: null as null | { userId: string } }
const loadIdentitySpy = vi.hoisted(() => vi.fn())
const saveRedirectSpy = vi.fn()
const getDefaultRouteSpy = vi.fn(() => ({ name: 'dashboard' }))

const rowSchema = z.object({ id: z.string() })
const detailSurface = defineDetail({ schema: rowSchema, fields: {} })
const createForm = defineForm({
  schema: z.object({ name: z.string() }),
  fields: { name: { renderer: 'text' } },
  submit: async ({ name }) => ({ id: 'created', name }),
})
const updateForm = defineForm({ schema: z.object({ name: z.string().optional() }), fields: { name: { renderer: 'text' } } })
const loadRoleDetail = async ({ id }: RecordLoadContext) => ({ id: String(id) })

function createResource(key: string, permission: string, route: 'settings-users-create' | 'settings-roles-create') {
  return defineResource({
    key,
    identity: (record: { id: string }) => record.id,
    create: { permission, route: { name: route }, form: createForm },
  })
}

function updateResource(key: string, permission: string) {
  return defineResource({
    key,
    identity: (record: { id: string }) => record.id,
    update: {
      permission,
      route: { name: 'settings-users-edit', params: (id) => ({ userId: String(id) }) },
      form: ({ id }) => ({
        ...updateForm,
        load: async () => ({ name: 'One' }),
        submit: async (input: (typeof updateForm.schema)['_output']) => ({ id, name: input.name ?? 'One' }),
      }),
    },
  })
}

function detailResource(key: string) {
  return defineResource({
    key,
    identity: (record: { id: string }) => record.id,
    detail: {
      permission: 'view-roles',
      route: { name: 'settings-roles-detail', params: (id) => ({ roleId: String(id) }) },
      detail: () => ({ ...detailSurface, load: loadRoleDetail }),
    },
  })
}

vi.mock('@/framework/identity', () => ({ loadIdentity: loadIdentitySpy }))

vi.mock('@/utils/post-login-redirect', () => ({
  savePostLoginRedirect: (path: string) => saveRedirectSpy(path),
}))

vi.mock('../navigation', () => ({
  getDefaultAuthenticatedRouteLocation: () => getDefaultRouteSpy(),
}))

import { createAuthGuard, createPermissionGuard } from '../guards'

const next = (() => {}) as any

afterEach(() => resetResourceActionRegistry())

describe('createAuthGuard', () => {
  beforeEach(() => {
    authState.identity = null
    loadIdentitySpy.mockReset()
    loadIdentitySpy.mockResolvedValue(null)
    saveRedirectSpy.mockReset()
    getDefaultRouteSpy.mockClear()
    getDefaultRouteSpy.mockReturnValue({ name: 'dashboard' })
  })

  it('allows public login route without a profile', async () => {
    const guard = createAuthGuard()
    const result = await guard({ name: 'auth-login', fullPath: '/auth/login', path: '/auth/login', meta: { requiresAuth: false }, matched: [{}] } as any, {} as any, next)

    expect(result).toBe(true)
  })

  it('does not redirect authenticated login to itself without an accessible destination', async () => {
    authState.identity = { userId: 'user-1' }
    loadIdentitySpy.mockResolvedValue(authState.identity)
    getDefaultRouteSpy.mockReturnValue(null as any)
    const guard = createAuthGuard()
    const result = await guard({ name: 'auth-login', fullPath: '/auth/login', path: '/auth/login', meta: { requiresAuth: false }, matched: [{}] } as any, {} as any, next)

    expect(result).toBe(true)
  })

  it('redirects protected route without a profile and saves redirect', async () => {
    const guard = createAuthGuard()
    const result = await guard({ name: 'users', fullPath: '/settings/users?tab=roles', path: '/settings/users', meta: { requiresAuth: true }, matched: [{}] } as any, {} as any, next)

    expect(saveRedirectSpy).toHaveBeenCalledWith('/settings/users?tab=roles')
    expect(result).toEqual({ name: 'auth-login' })
  })

  it('redirects root route with a profile to first accessible route', async () => {
    authState.identity = { userId: 'user-1' }
    loadIdentitySpy.mockResolvedValue(authState.identity)
    const guard = createAuthGuard()
    const result = await guard({ name: 'root', fullPath: '/', path: '/', meta: {}, matched: [{}] } as any, {} as any, next)

    expect(getDefaultRouteSpy).toHaveBeenCalled()
    expect(result).toEqual({ name: 'dashboard' })
  })

  it('redirects unknown route without a profile to login', async () => {
    const guard = createAuthGuard()
    const result = await guard({ name: 'not-found', fullPath: '/missing', path: '/missing', meta: {}, matched: [{}] } as any, {} as any, next)

    expect(result).toBe(true)
  })

  it('allows unknown route with a profile without signing out', async () => {
    authState.identity = { userId: 'user-1' }
    loadIdentitySpy.mockResolvedValue(authState.identity)
    const guard = createAuthGuard()
    const result = await guard({ name: 'not-found', fullPath: '/missing', path: '/missing', meta: {}, matched: [{}] } as any, {} as any, next)

    expect(result).toBe(true)
  })

  it('awaits one in-flight identity load before protecting a direct URL', async () => {
    let resolve: (value: { userId: string }) => void = () => undefined
    loadIdentitySpy.mockReturnValue(
      new Promise((promiseResolve) => {
        resolve = promiseResolve
      })
    )
    const guard = createAuthGuard()
    const result = guard({ name: 'users', fullPath: '/settings/users', path: '/settings/users', meta: { requiresAuth: true }, matched: [{}] } as any, {} as any, next)

    expect(saveRedirectSpy).not.toHaveBeenCalled()
    resolve({ userId: 'user-1' })
    expect(await result).toBe(true)
  })

  it('keeps the current route when identity loading fails', async () => {
    loadIdentitySpy.mockRejectedValue(new Error('network failure'))
    const guard = createAuthGuard()

    await expect(guard({ name: 'users', fullPath: '/settings/users', path: '/settings/users', meta: { requiresAuth: true }, matched: [{}] } as any, {} as any, next)).resolves.toBe(true)
    expect(saveRedirectSpy).not.toHaveBeenCalled()
  })
})

describe('permission guard', () => {
  const allowDetail = { allows: ({ operation }: { operation: string }) => operation === 'detail' }
  const denyAll = { allows: () => false }

  beforeEach(() => {
    getDefaultRouteSpy.mockReset()
    getDefaultRouteSpy.mockReturnValue({ name: 'dashboard' })
  })

  it('uses explicit extraordinary metadata only when no resource action owns route', () => {
    const allowed = createPermissionGuard(allowDetail)({ meta: { permission: 'view-roles' } } as any, {} as any, next)
    const denied = createPermissionGuard(denyAll)({ meta: { permission: 'view-roles' } } as any, {} as any, next)

    expect(allowed).toBe(true)
    expect(denied).toEqual({ name: 'dashboard' })
    expect(getDefaultRouteSpy).toHaveBeenCalledOnce()
  })

  it('allows unregistered routes without explicit permission', () => {
    expect(createPermissionGuard(denyAll)({ meta: {} } as any, {} as any, next)).toBe(true)
  })

  it('checks a registered project create action through the access adapter', () => {
    createResource('project-create-route', 'create-quality-inspection', 'settings-users-create')

    expect(createPermissionGuard(denyAll)({ name: 'settings-users-create', meta: {} } as any, {} as any, next)).toEqual({ name: 'dashboard' })
  })

  it('checks a registered project update action through the access adapter', () => {
    updateResource('project-update-route', 'update-quality-inspection')

    expect(createPermissionGuard(denyAll)({ name: 'settings-users-edit', meta: {} } as any, {} as any, next)).toEqual({ name: 'dashboard' })
  })

  it('still rejects denied browser access for a registered system create action', () => {
    createResource('system-create-route', 'create-users', 'settings-roles-create')

    expect(createPermissionGuard(denyAll)({ name: 'settings-roles-create', meta: {} } as any, {} as any, next)).toEqual({ name: 'dashboard' })
  })

  it('requires every static command permission with the registered operation', () => {
    const granted = new Set<string>()
    const requests: Array<{ operation: string; permission: string | null }> = []
    const access = {
      allows: ({ operation, permission }: { operation: string; permission: string | null }) => {
        requests.push({ operation, permission })
        return permission !== null && granted.has(permission)
      },
    }
    const expectBothPermissions = () => {
      expect(requests).toHaveLength(2)
      expect(requests).toEqual(
        expect.arrayContaining([
          { operation: 'inspect', permission: 'records.audit' },
          { operation: 'inspect', permission: 'records.read' },
        ])
      )
    }
    defineResource({
      key: 'multi-permission-route',
      identity: (record: { id: string }) => record.id,
      actions: {
        inspect: {
          permission: ['records.read', 'records.audit'],
          route: { name: 'settings-users' },
          run: async () => undefined,
        },
      },
    })
    const guard = createPermissionGuard(access)
    const to = { name: 'settings-users', meta: {} } as any

    expect(guard(to, {} as any, next)).toEqual({ name: 'dashboard' })
    expectBothPermissions()
    granted.add('records.audit')
    requests.length = 0
    expect(guard(to, {} as any, next)).toEqual({ name: 'dashboard' })
    expectBothPermissions()
    granted.add('records.read')
    requests.length = 0
    expect(guard(to, {} as any, next)).toBe(true)
    expectBothPermissions()
  })

  it('checks an explicit public route with null and its registered operation', () => {
    const requests: Array<{ operation: string; permission: string | null }> = []
    defineResource({
      key: 'null-permission-route',
      identity: (record: { id: string }) => record.id,
      create: { permission: null, route: { name: 'settings-users-create' }, form: createForm },
    })
    const result = createPermissionGuard({
      allows: (request) => {
        requests.push({ operation: request.operation, permission: request.permission ?? null })
        return request.operation === 'create' && request.permission === null
      },
    })({ name: 'settings-users-create', meta: {} } as any, {} as any, next)

    expect(result).toBe(true)
    expect(requests).toEqual([{ operation: 'create', permission: null }])
  })

  it('discovers lazy route action before resolving direct entry', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/dashboard', name: 'dashboard', component: { template: '<main>dashboard</main>' } },
        {
          path: '/detail/:id',
          name: 'settings-roles-detail',
          component: async () => {
            detailResource('lazy-roles')
            return { default: { template: '<main>detail</main>' } }
          },
        },
      ],
    })
    router.beforeResolve(createPermissionGuard(denyAll))

    await router.push('/detail/7')

    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('falls back to root when no accessible route exists', () => {
    getDefaultRouteSpy.mockReturnValue(null as any)
    const result = createPermissionGuard(denyAll)({ meta: { permission: 'view-roles' } } as any, {} as any, next)
    expect(result).toEqual({ path: '/' })
  })
})

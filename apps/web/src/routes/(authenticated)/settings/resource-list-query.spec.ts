import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const requests = new Map<string, Record<string, string>>()
  const response = async () => new Response(JSON.stringify({ data: [], total: 0 }), { status: 200 })
  const resource = (name: string) => ({
    list: {
      $get: async (input: { query: Record<string, string> }) => {
        requests.set(name, input.query)
        return response()
      },
    },
    detail: { ':id': { $get: response } },
    create: { $post: response },
    update: { ':id': { $patch: response } },
    delete: { ':id': { $delete: response } },
  })

  return {
    requests,
    rpc: { users: resource('users'), roles: resource('roles'), permissions: resource('permissions') },
  }
})

vi.mock('@/framework/rpc', () => ({ rpc: mocks.rpc }))

import { permissionsActions } from './permissions/permissions.actions'
import { rolesActions } from './roles/roles.actions'
import { usersActions } from './users/users.actions'

describe('settings list query adapters', () => {
  beforeEach(() => mocks.requests.clear())

  it('maps the user table sort keys to the users endpoint query', async () => {
    await usersActions.list({
      query: { search: 'Ada', statusCode: 'active', sort_by: 'email', sort: 'desc' },
      searchParameters: { active: true },
    })

    expect(mocks.requests.get('users')).toEqual({
      active: 'true',
      search: 'Ada',
      statusCode: 'active',
      sort: 'email',
      order: 'desc',
    })
  })

  it('maps the role table sort keys to the roles endpoint query', async () => {
    await rolesActions.list({ query: { search: 'admin', sort_by: 'roleCode', sort: 'asc' }, searchParameters: {} })

    expect(mocks.requests.get('roles')).toEqual({ search: 'admin', sort: 'roleCode', order: 'asc' })
  })

  it('maps the permission table sort keys to the permissions endpoint query', async () => {
    await permissionsActions.list({ query: { search: 'view', sort_by: 'permissionCode', sort: 'desc' }, searchParameters: {} })

    expect(mocks.requests.get('permissions')).toEqual({ search: 'view', sort: 'permissionCode', order: 'desc' })
  })
})

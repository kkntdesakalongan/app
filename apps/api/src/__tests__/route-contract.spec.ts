import { describe, expect, it } from 'vitest'
import { app } from '../app'

const routes = [
  'GET /auth/get-session', 'POST /auth/sign-in/email', 'POST /auth/sign-out',
  'GET /files', 'DELETE /files/object', 'GET /files/object', 'POST /files/presigned-url',
  'GET /health', 'GET /me', 'GET /openapi.json',
  'GET /permissions/detail/{id}', 'GET /permissions/list',
  'POST /roles/create', 'DELETE /roles/delete/{id}', 'GET /roles/detail/{id}', 'GET /roles/list', 'PATCH /roles/update/{id}',
  'GET /roles/{roleId}/permissions', 'DELETE /roles/{roleId}/permissions/{permissionId}', 'PUT /roles/{roleId}/permissions/{permissionId}',
  'POST /users/create', 'GET /users/detail/{id}', 'GET /users/list', 'PATCH /users/update/{id}',
  'GET /users/{userId}/role-assignments', 'DELETE /users/{userId}/role-assignments/{roleId}', 'PUT /users/{userId}/role-assignments/{roleId}',
  'DELETE /disaster-reports/delete/{id}', 'GET /disaster-reports/detail/{id}', 'GET /disaster-reports/list', 'PATCH /disaster-reports/update/{id}',
  'POST /map-pins/create', 'DELETE /map-pins/delete/{id}', 'GET /map-pins/detail/{id}', 'GET /map-pins/list', 'PATCH /map-pins/update/{id}',
  'POST /public/disaster-reports/create', 'GET /public/map-pins',
].sort()

describe('HTTP route contract', () => {
  it('keeps the method and path set', async () => {
    const response = await app.request('/api/openapi.json')
    expect(response.status).toBe(200)
    const document = await response.json() as { paths: Record<string, Record<string, unknown>> }
    const actual = Object.entries(document.paths).flatMap(([path, methods]) => Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`)).sort()
    expect(actual).toEqual(routes)
    expect(document).toHaveProperty('servers', [{ url: '/api' }])
  })

  it('keeps public and authenticated access', async () => {
    expect((await app.request('/api/health')).status).toBe(200)
    expect((await app.request('/health')).status).toBe(404)
    expect((await app.request('/public/map-pins')).status).toBe(404)
    expect((await app.request('/api/openapi.json')).status).toBe(200)
    for (const path of ['/me', '/files', '/users/list', '/roles/list', '/permissions/list']) {
      expect((await app.request(`/api${path}`)).status).toBe(401)
    }
  })
})

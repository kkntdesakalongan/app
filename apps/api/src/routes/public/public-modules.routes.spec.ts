import { afterAll, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { app } from '../../app'
import { closeDb, getDb } from '../../db'
import { createSystemSession } from '../../testing/session'
import { disasterReports } from '../(authenticated)/disaster-reports/disaster-reports.table'
import { mapPins } from '../(authenticated)/map-pins/map-pins.table'

const reportIds: string[] = []
const pinIds: string[] = []
afterAll(async () => {
  for (const id of reportIds) await getDb().delete(disasterReports).where(eq(disasterReports.id, id))
  for (const id of pinIds) await getDb().delete(mapPins).where(eq(mapPins.id, id))
  await closeDb()
})
function write(path: string, body: unknown, cookie = '', method = 'POST') {
  return app.request(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) })
}

it('accepts anonymous reports, protects saved content, and validates image bytes', async () => {
  const title = `Flood ${crypto.randomUUID()}`
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII='
  const response = await write('/public/disaster-reports/create', { title, image })
  expect(response.status).toBe(201)
  const saved = (await response.json()).data
  reportIds.push(saved.id)
  expect((await getDb().select().from(disasterReports).where(eq(disasterReports.id, saved.id)))[0]).toMatchObject({ title, image, description: null })
  expect((await app.request(`/api/disaster-reports/detail/${saved.id}`)).status).toBe(401)
  expect((await app.request('/api/disaster-reports/list')).status).toBe(401)
  const limited = await createSystemSession([], 'reports-limited')
  expect((await app.request(`/api/disaster-reports/detail/${saved.id}`, { headers: { Cookie: limited.cookie } })).status).toBe(403)
  expect((await write('/public/disaster-reports/create', { title: '   ' })).status).toBe(400)
  expect((await write('/public/disaster-reports/create', { title, image: 'data:image/png;base64,aGVsbG8=' })).status).toBe(400)
  expect((await write('/public/disaster-reports/create', { title, image: 'data:image/png;base64,%%%%' })).status).toBe(400)
  expect(await getDb().select().from(disasterReports).where(eq(disasterReports.title, title))).toHaveLength(1)
  const admin = await createSystemSession(['detail-disaster-reports', 'update-disaster-reports', 'delete-disaster-reports'], 'reports-admin')
  expect((await write('/disaster-reports/create', { title: 'Admin report' }, admin.cookie)).status).toBe(404)
  expect((await app.request(`/api/disaster-reports/detail/${saved.id}`, { headers: { Cookie: admin.cookie } })).status).toBe(200)
  expect((await write(`/disaster-reports/update/${saved.id}`, { title: 'Updated', image: null }, admin.cookie, 'PATCH')).status).toBe(200)
  expect((await getDb().select().from(disasterReports).where(eq(disasterReports.id, saved.id)))[0]).toMatchObject({ title: 'Updated', image: null })
  expect((await app.request(`/api/disaster-reports/delete/${saved.id}`, { method: 'DELETE', headers: { Cookie: admin.cookie } })).status).toBe(200)
  expect(await getDb().select().from(disasterReports).where(eq(disasterReports.id, saved.id))).toHaveLength(0)
})

it('publishes saved pins but restricts writes and rejects invalid coordinates', async () => {
  const input = { name: `Shelter ${crypto.randomUUID()}`, description: 'Public shelter', latitude: -7.1, longitude: 110.2 }
  expect((await write('/map-pins/create', input)).status).toBe(401)
  const limited = await createSystemSession([], 'pins-limited')
  expect((await write('/map-pins/create', input, limited.cookie)).status).toBe(403)
  const admin = await createSystemSession(['create-map-pins', 'update-map-pins', 'delete-map-pins'], 'pins-admin')
  expect((await write('/map-pins/create', { ...input, latitude: 91 }, admin.cookie)).status).toBe(400)
  const response = await write('/map-pins/create', input, admin.cookie)
  expect(response.status).toBe(201)
  const saved = (await response.json()).data
  pinIds.push(saved.id)
  expect((await (await app.request('/api/public/map-pins')).json())).toContainEqual({ id: saved.id, ...input })
  expect((await write(`/map-pins/update/${saved.id}`, { ...input, name: 'Moved shelter', longitude: 111 }, admin.cookie, 'PATCH')).status).toBe(200)
  expect((await getDb().select().from(mapPins).where(eq(mapPins.id, saved.id)))[0]).toMatchObject({ name: 'Moved shelter', longitude: 111 })
  expect((await app.request(`/api/map-pins/delete/${saved.id}`, { method: 'DELETE', headers: { Cookie: admin.cookie } })).status).toBe(200)
  expect(await getDb().select().from(mapPins).where(eq(mapPins.id, saved.id))).toHaveLength(0)
})

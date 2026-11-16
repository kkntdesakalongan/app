import { afterAll, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { app } from '../../app'
import { closeDb, getDb } from '../../db'
import { createSystemSession } from '../../testing/session'
import { disasterReports } from '../(authenticated)/disaster-reports/disaster-reports.table'
import { mapPins } from '../(authenticated)/map-pins/map-pins.table'

import { reportCategories } from '../(authenticated)/report-categories/report-categories.table'

const categoryIds: string[] = []
const reportIds: string[] = []
const pinIds: string[] = []
afterAll(async () => {
  for (const id of reportIds) await getDb().delete(disasterReports).where(eq(disasterReports.id, id))
  for (const id of pinIds) await getDb().delete(mapPins).where(eq(mapPins.id, id))
  for (const id of categoryIds) await getDb().delete(reportCategories).where(eq(reportCategories.id, id))
  await closeDb()
})
function write(path: string, body: unknown, cookie = '', method = 'POST') {
  return app.request(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) })
}

it('accepts anonymous reports, protects saved content, and validates image bytes', async () => {
  const title = `Flood ${crypto.randomUUID()}`
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII='
  const response = await write('/public/disaster-reports/create', { title, image, latitude: -7.112, longitude: 110.425 })
  expect(response.status).toBe(201)
  const saved = (await response.json()).data
  reportIds.push(saved.id)
  expect((await getDb().select().from(disasterReports).where(eq(disasterReports.id, saved.id)))[0]).toMatchObject({ title, image, description: null, latitude: -7.112, longitude: 110.425 })
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
  const detail = await app.request(`/api/disaster-reports/detail/${saved.id}`, { headers: { Cookie: admin.cookie } })
  expect(detail.status).toBe(200)
  expect((await detail.json()).data).toMatchObject({ latitude: -7.112, longitude: 110.425 })
  expect((await write(`/disaster-reports/update/${saved.id}`, { title: 'Updated', image: null, latitude: null, longitude: null }, admin.cookie, 'PATCH')).status).toBe(200)
  expect((await getDb().select().from(disasterReports).where(eq(disasterReports.id, saved.id)))[0]).toMatchObject({ title: 'Updated', image: null, latitude: null, longitude: null })
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


it('publishes category choices, saves report categories, and protects categories in use', async () => {
  const name = `Banjir ${crypto.randomUUID()}`
  const admin = await createSystemSession(['create-report-categories', 'update-report-categories', 'delete-report-categories', 'update-disaster-reports'], 'categories-admin')
  expect((await write('/report-categories/create', { name })).status).toBe(401)
  const limited = await createSystemSession([], 'categories-limited')
  expect((await write('/report-categories/create', { name }, limited.cookie)).status).toBe(403)
  const created = await write('/report-categories/create', { name }, admin.cookie)
  expect(created.status).toBe(201)
  const category = (await created.json()).data
  categoryIds.push(category.id)
  expect((await (await app.request('/api/public/report-categories')).json()).data).toContainEqual({ id: category.id, name })
  const title = `Category report ${crypto.randomUUID()}`
  const submitted = await write('/public/disaster-reports/create', { title, categoryId: category.id })
  expect(submitted.status).toBe(201)
  const report = (await submitted.json()).data
  reportIds.push(report.id)
  expect((await getDb().select().from(disasterReports).where(eq(disasterReports.id, report.id)))[0]).toMatchObject({ categoryId: category.id })
  const rejected = await write('/public/disaster-reports/create', { title, categoryId: crypto.randomUUID() })
  expect(rejected.status).toBe(400)
  expect((await rejected.json()).issues).toContainEqual({ field: 'categoryId', message: 'Pilih Kategori Laporan yang tersedia.' })
  expect(await getDb().select().from(disasterReports).where(eq(disasterReports.title, title))).toHaveLength(1)
  const remove = () => app.request(`/api/report-categories/delete/${category.id}`, { method: 'DELETE', headers: { Cookie: admin.cookie } })
  expect((await remove()).status).toBe(409)
  expect((await getDb().select().from(reportCategories).where(eq(reportCategories.id, category.id)))[0]).toMatchObject({ name })
  expect((await getDb().select().from(disasterReports).where(eq(disasterReports.id, report.id)))[0]).toMatchObject({ categoryId: category.id })
  const renamed = `${name} baru`
  expect((await write(`/report-categories/update/${category.id}`, { name: renamed }, admin.cookie, 'PATCH')).status).toBe(200)
  expect((await (await app.request('/api/public/report-categories')).json()).data).toContainEqual({ id: category.id, name: renamed })
  expect((await write(`/disaster-reports/update/${report.id}`, { title, categoryId: null }, admin.cookie, 'PATCH')).status).toBe(200)
  expect((await getDb().select().from(disasterReports).where(eq(disasterReports.id, report.id)))[0]).toMatchObject({ categoryId: null })
  expect((await remove()).status).toBe(200)
  expect(await getDb().select().from(reportCategories).where(eq(reportCategories.id, category.id))).toHaveLength(0)
})

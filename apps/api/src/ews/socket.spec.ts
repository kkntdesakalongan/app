import { createServer } from 'node:http'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { installEwsSocket } from './socket'

let server: ReturnType<typeof createServer>
let socket: WebSocket

beforeEach(async () => {
  const stations = [
    ['Southwest', -8, 109],
    ['Northeast', -7, 111],
    ['Inside', -7.5, 110],
    ['South', -8.1, 110],
    ['North', -6.9, 110],
    ['West', -7.5, 108.9],
    ['East', -7.5, 111.1],
    ['Dateline east', -7.5, 175],
    ['Dateline west', -7.5, -175],
  ]
  const html = "var Icon_banjir = L.icon({iconUrl: 'banjir-hijau.svg'});" + stations.map(([name, latitude, longitude]) =>
    `L.marker([${latitude},${longitude}], {icon: Icon_banjir}).addTo(map).bindPopup('<p>${name}</p><table><thead><tr><td>status</td></tr></thead><tbody><tr><th>Normal</th></tr></tbody></table>')`,
  ).join('\n')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(html)))
  server = createServer()
  installEwsSocket(server)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected a TCP address')
  socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/public/ews/ws`)
  await once(socket, 'open')
})

afterEach(async () => {
  vi.unstubAllGlobals()
  if (socket) {
    const closed = once(socket, 'close')
    socket.terminate()
    await closed
  }
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

async function request(message: object): Promise<unknown> {
  const response = once(socket, 'message')
  socket.send(JSON.stringify({ requestId: randomUUID(), ...message }))
  const [data] = await response
  return JSON.parse(data.toString())
}

it('selects stations within inclusive bounds and retains the box for refresh', async () => {
  const expected = {
    type: 'snapshot',
    stations: [
      expect.objectContaining({ name: 'Southwest' }),
      expect.objectContaining({ name: 'Northeast' }),
      expect.objectContaining({ name: 'Inside' }),
    ],
  }
  expect(await request({ type: 'subscribe', filters: { boundingBox: { south: -8, west: 109, north: -7, east: 111 } } })).toMatchObject(expected)
  expect(await request({ type: 'refresh' })).toMatchObject(expected)
  expect(await request({ type: 'subscribe' })).toMatchObject({ type: 'snapshot', stations: expect.any(Array) })
  const unfiltered = await request({ type: 'refresh' })
  expect(unfiltered).toHaveProperty('stations.length', 9)
})

it('selects both sides of the antimeridian and combines the box with other filters', async () => {
  const boundingBox = { south: -8, west: 170, north: -7, east: -170 }
  expect(await request({ type: 'subscribe', filters: { boundingBox } })).toMatchObject({
    type: 'snapshot',
    stations: [expect.objectContaining({ name: 'Dateline east' }), expect.objectContaining({ name: 'Dateline west' })],
  })
  expect(await request({ type: 'subscribe', filters: { boundingBox, search: 'west' } })).toMatchObject({
    type: 'snapshot',
    stations: [expect.objectContaining({ name: 'Dateline west' })],
  })
})

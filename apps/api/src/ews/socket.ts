import { Server } from 'node:http'
import type { ServerType } from '@hono/node-server'
import { WebSocketServer, WebSocket } from 'ws'
import { z } from 'zod'
import { fetchStations, type Station } from './source'

const type = z.enum(['flood', 'landslide', 'tsunami'])
const status = z.enum(['normal', 'warning', 'maintenance', 'telemetry_inactive', 'unknown'])
const range = z.strictObject({ min: z.number().finite().optional(), max: z.number().finite().optional() }).refine(value => (value.min !== undefined || value.max !== undefined) && (value.min === undefined || value.max === undefined || value.min <= value.max))
const filtersSchema = z.strictObject({
  stations: z.array(z.strictObject({ type, statusCodes: z.array(status).min(1).optional() })).min(1).optional(),
  search: z.string().trim().min(1).optional(),
  rainfallMm: range.optional(),
  waterLevelMeters: range.optional(),
  groundMovementCm: range.optional(),
}).refine(filters => !filters.stations || (new Set(filters.stations.map(station => station.type)).size === filters.stations.length && filters.stations.every(station => !station.statusCodes || station.statusCodes.every(code => code === 'unknown' || code === 'normal' || code === 'maintenance' || (code === 'warning' && station.type !== 'tsunami') || code === 'telemetry_inactive'))))
const messageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('subscribe'), requestId: z.uuid(), filters: filtersSchema.default({}) }),
  z.strictObject({ type: z.literal('refresh'), requestId: z.uuid() }),
])
type Filters = z.output<typeof filtersSchema>

function matches(station: Station, filters: Filters): boolean {
  if (filters.stations && !filters.stations.some(selection => selection.type === station.type && (!selection.statusCodes || selection.statusCodes.includes(station.statusCode)))) return false
  if (filters.search && !station.name.toLowerCase().includes(filters.search.toLowerCase())) return false
  for (const key of ['rainfallMm', 'waterLevelMeters', 'groundMovementCm'] as const) {
    const range = filters[key]
    const value = station.readings[key]
    if (range && (value === null || (range.min !== undefined && value < range.min) || (range.max !== undefined && value > range.max))) return false
  }
  return true
}

export function installEwsSocket(server: ServerType): void {
  if (!(server instanceof Server)) throw new Error('EWS requires an HTTP server')
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 16384 })
  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/api/public/ews/ws') return
    sockets.handleUpgrade(request, socket, head, ws => sockets.emit('connection', ws, request))
  })
  sockets.on('connection', ws => {
    let filters: Filters | undefined
    let pending = Promise.resolve()
    ws.on('error', () => {})
    ws.on('message', data => {
      pending = pending.then(async () => {
        let input: unknown
        try { input = JSON.parse(data.toString()) } catch { ws.send(JSON.stringify({ type: 'error', code: 'invalid_message', message: 'Expected a JSON message.' })); return }
        const parsed = messageSchema.safeParse(input)
        if (!parsed.success) {
          const request = z.object({ requestId: z.uuid().optional() }).safeParse(input)
          ws.send(JSON.stringify({ type: 'error', requestId: request.success ? request.data.requestId : undefined, code: 'invalid_message', message: 'Invalid request or filters.' }))
          return
        }
        const message = parsed.data
        if (message.type === 'refresh' && !filters) { ws.send(JSON.stringify({ type: 'error', requestId: message.requestId, code: 'not_subscribed', message: 'Subscribe before refreshing.' })); return }
        const selected = message.type === 'subscribe' ? message.filters : filters
        if (!selected) return
        if (message.type === 'subscribe') filters = selected
        try {
          const result = await fetchStations()
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'snapshot', requestId: message.requestId, fetchedAt: result.fetchedAt, stations: result.stations.filter(station => matches(station, selected)) }))
        } catch (error) {
          const code = error instanceof Error && error.message === 'source_parse_failed' ? 'source_parse_failed' : 'source_fetch_failed'
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', requestId: message.requestId, code, message: 'Could not retrieve EWS data.' }))
        }
      }).catch(() => { if (ws.readyState === WebSocket.OPEN) ws.close(1011, 'Internal error') })
    })
  })
}

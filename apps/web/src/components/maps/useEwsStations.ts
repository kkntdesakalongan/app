import { onBeforeUnmount, onMounted, ref } from 'vue'
import { z } from 'zod/v4'
import { apiUrl } from '@/framework/rpc'

const stationSchema = z.object({
  type: z.enum(['flood', 'landslide', 'tsunami']),
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  statusCode: z.enum(['normal', 'warning', 'maintenance', 'telemetry_inactive', 'unknown']),
  sourceUpdatedAt: z.string().nullable(),
  readings: z.object({
    waterLevelMeters: z.number().nullable(),
    rainfallMm: z.number().nullable(),
    groundMovementCm: z.number().nullable(),
    humidityPercent: z.number().nullable(),
    batteryVolts: z.number().nullable(),
    sensorBatteryVolts: z.number().nullable(),
    hornOhms: z.number().nullable(),
  }),
})
const messageSchema = z.discriminatedUnion('type', [z.object({ type: z.literal('snapshot'), stations: z.array(stationSchema) }), z.object({ type: z.literal('error'), message: z.string() })])
export type EwsStation = z.infer<typeof stationSchema>

export function useEwsStations() {
  const stations = ref<EwsStation[]>([])
  const state = ref<'loading' | 'ready' | 'error'>('loading')
  let socket: WebSocket | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectDelay = 1000
  let stopped = false

  function connect() {
    if (stopped) return
    const url = new URL('public/ews/ws', apiUrl)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    socket = new WebSocket(url)
    socket.addEventListener('open', () => {
      socket?.send(JSON.stringify({ type: 'subscribe', requestId: crypto.randomUUID() }))
    })
    socket.addEventListener('message', (event) => {
      try {
        const message = messageSchema.parse(JSON.parse(String(event.data)))
        if (message.type === 'error') {
          state.value = 'error'
          return
        }
        stations.value = message.stations
        state.value = 'ready'
        reconnectDelay = 1000
      } catch {
        state.value = 'error'
      }
    })
    socket.addEventListener('error', () => {
      state.value = 'error'
    })
    socket.addEventListener('close', () => {
      if (stopped) return
      state.value = 'error'
      reconnectTimer = setTimeout(connect, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
    })
  }

  function retry() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    state.value = 'loading'
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe', requestId: crypto.randomUUID() }))
    } else if (!socket || socket.readyState === WebSocket.CLOSED) {
      connect()
    }
  }

  onMounted(connect)
  onBeforeUnmount(() => {
    stopped = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    socket?.close()
  })
  return { stations, state, retry }
}

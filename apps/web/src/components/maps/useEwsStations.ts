import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { z } from 'zod/v4'
import { apiUrl } from '@/framework/rpc'
import type { EwsFilters } from './ewsFilters'

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
const messageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('snapshot'), requestId: z.uuid(), stations: z.array(stationSchema) }),
  z.object({ type: z.literal('error'), requestId: z.uuid().optional(), message: z.string() }),
])
export type EwsStation = z.infer<typeof stationSchema>

export const kalonganBoundingBox = { south: -7.164, west: 110.427, north: -7.108, east: 110.466 }

export function useEwsStations(filters: Ref<EwsFilters>) {
  const stations = ref<EwsStation[]>([])
  const state = ref<'loading' | 'ready' | 'error'>('loading')
  const errorMessage = ref('')
  let requestId: string | undefined
  let filterTimer: ReturnType<typeof setTimeout> | undefined
  function subscribe() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    if (filterTimer) clearTimeout(filterTimer)
    requestId = crypto.randomUUID()
    state.value = 'loading'
    socket?.send(
      JSON.stringify({
        type: 'subscribe',
        requestId,
        filters: { ...filters.value, boundingBox: kalonganBoundingBox },
      })
    )
  }
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
      subscribe()
    })
    socket.addEventListener('message', (event) => {
      try {
        const message = messageSchema.parse(JSON.parse(String(event.data)))
        if (message.requestId && message.requestId !== requestId) return
        if (message.type === 'error') {
          errorMessage.value = message.message
          state.value = 'error'
          return
        }
        errorMessage.value = ''
        stations.value = message.stations
        state.value = 'ready'
        reconnectDelay = 1000
      } catch {
        errorMessage.value = 'Cannot read early warning data.'
        state.value = 'error'
      }
    })
    socket.addEventListener('error', () => {
      errorMessage.value = 'Cannot connect to early warning stations.'
      state.value = 'error'
    })
    socket.addEventListener('close', () => {
      if (stopped) return
      errorMessage.value ||= 'The early warning connection closed.'
      state.value = 'error'
      reconnectTimer = setTimeout(connect, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
    })
  }

  function retry() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    state.value = 'loading'
    if (socket?.readyState === WebSocket.OPEN) {
      subscribe()
    } else if (!socket || socket.readyState === WebSocket.CLOSED) {
      connect()
    }
  }

  watch(
    () => JSON.stringify(filters.value),
    () => {
      requestId = undefined
      if (filterTimer) clearTimeout(filterTimer)
      if (socket?.readyState !== WebSocket.OPEN) return
      state.value = 'loading'
      filterTimer = setTimeout(subscribe, 300)
    }
  )

  onMounted(connect)
  onBeforeUnmount(() => {
    stopped = true
    if (filterTimer) clearTimeout(filterTimer)
    if (reconnectTimer) clearTimeout(reconnectTimer)
    socket?.close()
  })
  return { stations, state, errorMessage, retry }
}

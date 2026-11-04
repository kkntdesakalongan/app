<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { z } from 'zod/v4'
import { mapPinsSelectSchema } from '@southneuhof/api/src/routes/(authenticated)/map-pins/schema.ts'
import { rpc } from '@/framework/rpc'
import { useCollection, type CollectionLoadContext } from '@southneuhof/loom'
const props = defineProps<{ placement?: boolean }>()
const emit = defineEmits<{ select: [position: { latitude: number; longitude: number }] }>()
const pinSchema = mapPinsSelectSchema.pick({ id: true, name: true, description: true, latitude: true, longitude: true })
async function loadPins({ signal }: CollectionLoadContext) {
  const response = await rpc.public['map-pins'].$get({}, { init: { signal } })
  if (!response.ok) throw new Error('Cannot load locations.')
  return { data: z.array(pinSchema).parse(await response.json()) }
}
const { records: pins, loading, error, refresh } = useCollection(() => ({ load: loadPins, query: {} }))
const host = ref<HTMLElement>()
const tileError = ref(false)
const selected = ref<z.output<typeof pinSchema>>()
let map: L.Map | undefined
let tiles: L.TileLayer | undefined
let markers: L.LayerGroup | undefined
let draft: L.CircleMarker | undefined
let observer: ResizeObserver | undefined
let fitted = false
function renderPins() {
  if (!markers || !map) return
  markers?.clearLayers()
  for (const pin of pins.value) {
    const marker = L.marker([pin.latitude, pin.longitude], {
      title: pin.name,
      keyboard: true,
      icon: L.divIcon({
        className: '',
        html: '<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#b42318;border:3px solid white;box-shadow:0 2px 6px #0006"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      }),
    })
    marker.on('click', () => {
      selected.value = pin
    })
    marker.addTo(markers)
  }
  if (!fitted && pins.value.length && map) {
    map.fitBounds(L.latLngBounds(pins.value.map((pin) => L.latLng(pin.latitude, pin.longitude))), { padding: [40, 40], maxZoom: 14 })
    fitted = true
  }
}
watch(pins, renderPins)
function choose(latitude: number, longitude: number) {
  if (!map) return
  draft?.remove()
  draft = L.circleMarker([latitude, longitude], { radius: 9, color: '#175cd3' }).addTo(map)
  emit('select', { latitude, longitude })
}
function retryTiles() {
  tileError.value = false
  tiles?.redraw()
}
watch(
  () => props.placement,
  (enabled) => {
    if (!enabled) {
      draft?.remove()
      draft = undefined
    }
  }
)
onMounted(() => {
  if (!host.value) return
  map = L.map(host.value, { zoomAnimation: false, fadeAnimation: false }).setView([-2.5, 118], 5)
  tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)
  tiles.on('tileerror', () => {
    tileError.value = true
  })
  markers = L.layerGroup().addTo(map)
  map.on('click', (event: L.LeafletMouseEvent) => {
    if (props.placement) choose(event.latlng.lat, event.latlng.lng)
  })
  observer = new ResizeObserver(() => map?.invalidateSize())
  observer.observe(host.value)
  renderPins()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  map?.remove()
})
</script>
<template>
  <div class="absolute inset-0 isolate">
    <div ref="host" class="absolute inset-0 z-0" aria-label="Location map" />
    <div class="absolute right-3 top-3 z-[1000] flex max-w-[min(22rem,80%)] flex-col gap-2 rounded-lg bg-surface-container-lowest p-3 text-on-surface shadow-lg">
      <slot />
      <p v-if="loading" role="status">Loading locations…</p>
      <p v-else-if="error" role="alert">{{ error.message }} <Button type="button" @click="refresh">Retry locations</Button></p>
      <p v-else-if="!pins.length">No locations yet.</p>
      <p v-if="tileError" role="alert">Map tiles could not load. <Button type="button" @click="retryTiles">Retry map</Button></p>
      <Button
        v-if="placement"
        type="button"
        @click="
          () => {
            const center = map?.getCenter()
            if (center) choose(center.lat, center.lng)
          }
        "
      >
        Use map center
      </Button>
      <p v-if="placement">Select a map position, or move the map and use its center.</p>
      <section v-if="selected" class="flex flex-col gap-2" aria-label="Selected location">
        <h2 class="font-semibold">{{ selected.name }}</h2>
        <p class="whitespace-pre-wrap">{{ selected.description }}</p>
        <slot name="selected" :pin="selected" />
        <Button type="button" @click="selected = undefined">Close location</Button>
      </section>
    </div>
  </div>
</template>

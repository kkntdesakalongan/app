<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import { inject, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { z } from 'zod/v4'
import { mapPinsSelectSchema } from '@southneuhof/api/src/routes/(authenticated)/map-pins/schema.ts'
import { routeLeaveCleanup } from '@/components/routing/routeTransition'
import { rpc } from '@/framework/rpc'
import { useCollection, type CollectionLoadContext } from '@southneuhof/loom'
const pinSchema = mapPinsSelectSchema.pick({ id: true, name: true, description: true, latitude: true, longitude: true })
async function loadPins({ signal }: CollectionLoadContext) {
  const response = await rpc.public['map-pins'].$get({}, { init: { signal } })
  if (!response.ok) throw new Error('Cannot load locations.')
  return { data: z.array(pinSchema).parse(await response.json()) }
}
const { records: pins, loading, error, refresh } = useCollection(() => ({ load: loadPins, query: {} }))
const deferCleanup = inject(routeLeaveCleanup, (cleanup) => cleanup())
const host = ref<HTMLElement>()
const tileError = ref(false)
let map: L.Map | undefined
let tiles: L.TileLayer | undefined
let markers: L.LayerGroup | undefined
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
        popupAnchor: [0, -24],
      }),
    })
    const content = document.createElement('section')
    content.setAttribute('aria-label', 'Location details')
    const heading = document.createElement('h2')
    heading.className = 'text-base font-semibold'
    heading.textContent = pin.name
    content.append(heading)
    if (pin.description) {
      const description = document.createElement('p')
      description.className = 'mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed'
      description.textContent = pin.description
      content.append(description)
    }
    const toolbarHeight = host.value?.parentElement?.querySelector('.map-toolbar')?.getBoundingClientRect().height ?? 100
    marker.bindPopup(content, { className: 'location-popup', maxWidth: 320, autoPanPaddingTopLeft: L.point(20, toolbarHeight + 20) })
    marker.addTo(markers)
  }
  if (!fitted && pins.value.length && map) {
    map.fitBounds(L.latLngBounds(pins.value.map((pin) => L.latLng(pin.latitude, pin.longitude))), { padding: [40, 40], maxZoom: 14 })
    fitted = true
  }
}
watch(pins, renderPins)
function retryTiles() {
  tileError.value = false
  tiles?.redraw()
}
onMounted(() => {
  if (!host.value) return
  const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  map = L.map(host.value, { zoomAnimation: animate, fadeAnimation: animate, markerZoomAnimation: animate, zoomControl: false }).setView([-2.5, 118], 5)
  L.control.zoom({ position: 'bottomleft' }).addTo(map)
  tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)
  tiles.on('tileerror', () => {
    tileError.value = true
  })
  markers = L.layerGroup().addTo(map)
  observer = new ResizeObserver(() => map?.invalidateSize())
  observer.observe(host.value)
  renderPins()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  deferCleanup(() => map?.remove())
})
</script>
<template>
  <div class="location-map absolute inset-0 isolate">
    <div ref="host" class="absolute inset-0 z-0" aria-label="Location map" />
    <div class="map-toolbar absolute inset-x-0 top-0 z-[500] px-5 py-5 text-on-surface sm:px-7 sm:py-6">
      <div class="map-atmosphere pointer-events-none absolute inset-x-0 -bottom-16 top-0" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
      <div class="relative flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0"><slot /></div>
        <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
          <slot name="actions" />
          <Button v-if="error" type="button" variant="text" @click="refresh">Retry locations</Button>
          <Button v-if="tileError" type="button" variant="text" @click="retryTiles">Retry map</Button>
        </div>
      </div>
      <div class="relative mt-2 text-sm" aria-live="polite">
        <p v-if="loading" role="status">Loading locations…</p>
        <p v-else-if="error" role="alert">{{ error.message }}</p>
        <p v-else-if="!pins.length">No locations yet.</p>
        <p v-if="tileError" role="alert">Map tiles could not load.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-atmosphere {
  background: linear-gradient(to bottom, rgb(0 0 0 / 0.1), transparent), linear-gradient(to bottom, rgb(var(--md-sys-color-surface) / 0.65), rgb(var(--md-sys-color-surface) / 0));
}
.map-atmosphere > div {
  position: absolute;
  inset: 0;
  mask-image: linear-gradient(to bottom, black, transparent);
  backdrop-filter: blur(3px);
}
.map-atmosphere > div:nth-child(2) {
  bottom: 25%;
  backdrop-filter: blur(8px);
}
.map-atmosphere > div:nth-child(3) {
  bottom: 55%;
  backdrop-filter: blur(16px);
}
@media (prefers-reduced-transparency: reduce) {
  .map-toolbar {
    background: rgb(var(--md-sys-color-surface));
  }
  .map-atmosphere > div {
    backdrop-filter: none;
  }
}
</style>

<style>
.location-popup .leaflet-popup-content-wrapper,
.location-popup .leaflet-popup-tip {
  background: rgb(var(--md-sys-color-surface-container-lowest));
  color: rgb(var(--md-sys-color-on-surface));
}
.location-popup .leaflet-popup-content {
  margin: 1rem;
}
.location-popup a.leaflet-popup-close-button {
  color: rgb(var(--md-sys-color-on-surface));
}
.public-map-viewport .map-toolbar {
  padding-top: calc(env(safe-area-inset-top, 0px) + 1.25rem);
  padding-left: max(1.25rem, env(safe-area-inset-left, 0px));
  padding-right: max(1.25rem, env(safe-area-inset-right, 0px));
}
.public-map-viewport .leaflet-control-container {
  position: absolute;
  inset: 0;
  height: 100dvh;
  pointer-events: none;
}
.public-map-viewport .leaflet-bottom {
  bottom: env(safe-area-inset-bottom, 0px);
}
.public-map-viewport .leaflet-left {
  left: env(safe-area-inset-left, 0px);
}
.public-map-viewport .leaflet-right {
  right: env(safe-area-inset-right, 0px);
}
</style>

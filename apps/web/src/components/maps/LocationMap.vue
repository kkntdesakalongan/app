<script setup lang="ts">
import Card from '@southneuhof/loom/components/base/Card.vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger, DialogContent, DialogDescription, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import Tooltip from '@southneuhof/loom/components/base/Tooltip.vue'
import { breakpointsTailwind, onClickOutside, useBreakpoints, usePermission, useSupported } from '@vueuse/core'
import { computed, inject, nextTick, onMounted, onBeforeUnmount, ref, useId, watch } from 'vue'
import { motion, useReducedMotion, type $Transition } from 'motion-v'
import { directive as vTippy } from 'vue-tippy'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { z } from 'zod/v4'
import { mapPinsSelectSchema } from '@southneuhof/api/src/routes/(authenticated)/map-pins/schema.ts'
import { routeLeaveCleanup } from '@/components/routing/routeTransition'
import { rpc } from '@/framework/rpc'
import { gisLegend, gisStyle } from './gisStyles'
import GisLayerPicker from './GisLayerPicker.vue'
import { gisLayers, useGisLayers } from './useGisLayers'
import type { EwsFilters } from './ewsFilters'
import { kalonganBoundingBox, useEwsStations, type EwsStation } from './useEwsStations'
import { useCollection, type CollectionLoadContext } from '@southneuhof/loom'
const pinSchema = mapPinsSelectSchema.pick({ id: true, name: true, description: true, latitude: true, longitude: true })
async function loadPins({ signal }: CollectionLoadContext) {
  const response = await rpc.public['map-pins'].$get({}, { init: { signal } })
  if (!response.ok) throw new Error('Cannot load locations.')
  return { data: z.array(pinSchema).parse(await response.json()) }
}
const { records: pins, error, refresh } = useCollection(() => ({ load: loadPins, query: {} }))
const gis = useGisLayers()
const ewsFilters = ref<EwsFilters>({})
const { stations, state: ewsState, errorMessage: ewsError, retry: retryEws } = useEwsStations(ewsFilters)
const detectionFillId = useId()
const deferCleanup = inject(routeLeaveCleanup, (cleanup) => cleanup())
const mobile = useBreakpoints(breakpointsTailwind).smaller('lg')
const layersOpen = ref(false)
const layersAnchor = ref<HTMLElement>()
const MotionPath = motion.path
const reducedMotion = useReducedMotion()
const layersIconTransition = computed<$Transition>(() => (reducedMotion.value ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.85 }))
const legendOpen = ref(!mobile.value)
const legendCard = ref<InstanceType<typeof Card>>()
const host = ref<HTMLElement>()
const tileError = ref(false)
const pinRetry = ref<'idle' | 'loading' | 'failed'>('idle')
const retryingTiles = ref(false)
const pinError = computed(() => error.value?.message ?? (pinRetry.value === 'failed' ? 'Cannot load locations.' : ''))
const mapError = computed(() => [pinError.value, ewsError.value, tileError.value ? 'Map tiles could not load.' : ''].filter(Boolean).join(' '))
const retryingMap = computed(() => pinRetry.value === 'loading' || (ewsState.value === 'loading' && Boolean(ewsError.value)) || retryingTiles.value)
const locationSupported = useSupported(() => Boolean(navigator.geolocation))
const { state: locationPermission, isSupported: permissionSupported } = usePermission('geolocation', { controls: true })
const locationState = ref<'idle' | 'locating' | 'located' | 'denied' | 'error'>('idle')
const userLocationLabel = 'Lokasi Anda'
const showLocationAction = computed(
  () => locationSupported.value && (locationPermission.value === 'prompt' || !permissionSupported.value) && (locationState.value === 'idle' || locationState.value === 'locating')
)
const locationWarning = computed(() => {
  if (locationPermission.value === 'denied' || locationState.value === 'denied') return 'Akses lokasi diblokir. Izinkan akses lokasi di pengaturan situs pada browser Anda.'
  if (locationState.value === 'error') return 'Lokasi tidak dapat ditemukan. Periksa layanan lokasi perangkat, lalu muat ulang halaman.'
  return ''
})
onClickOutside(legendCard, () => {
  legendOpen.value = false
})
watch(mobile, (isMobile) => {
  layersOpen.value = false
  legendOpen.value = !isMobile
})
async function closeLayers() {
  layersOpen.value = false
  await nextTick()
  layersAnchor.value?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.focus({ preventScroll: true })
}
async function retryMap() {
  if (retryingMap.value) return
  if (ewsState.value === 'error') retryEws()
  if (tileError.value) retryTiles()
  if (!pinError.value) return
  pinRetry.value = 'loading'
  try {
    await refresh()
    pinRetry.value = 'idle'
  } catch {
    pinRetry.value = 'failed'
  }
}
let map: L.Map | undefined
let tiles: L.TileLayer | undefined
let tileRetryFailed = false
let markers: L.LayerGroup | undefined
let ewsLayers: L.LayerGroup | undefined
let observer: ResizeObserver | undefined
let gisGroup: L.LayerGroup | undefined
let locationWatch: number | undefined
let locationMarker: L.Marker | undefined
function clearLocation() {
  if (locationWatch !== undefined) navigator.geolocation.clearWatch(locationWatch)
  locationWatch = undefined
  locationMarker?.remove()
  locationMarker = undefined
}
function locate() {
  if (!map || !locationSupported.value || locationWatch !== undefined) return
  locationState.value = 'locating'
  locationWatch = navigator.geolocation.watchPosition(
    ({ coords }) => {
      if (!map || locationWatch === undefined) return
      const position = L.latLng(coords.latitude, coords.longitude)
      if (locationMarker) {
        locationMarker.setLatLng(position)
      } else {
        locationMarker = L.marker(position, {
          title: userLocationLabel,
          alt: userLocationLabel,
          keyboard: false,
          interactive: false,
          icon: L.divIcon({ className: 'map-user-location', iconSize: [16, 16] }),
        }).addTo(map)
        if (!map.getBounds().contains(position)) map.panTo(position, { animate: !reducedMotion.value })
      }
      locationState.value = 'located'
    },
    (reason) => {
      if (locationWatch === undefined) return
      clearLocation()
      locationState.value = reason.code === reason.PERMISSION_DENIED ? 'denied' : 'error'
    },
    { maximumAge: 30_000, timeout: 10_000 }
  )
}
function syncLocationPermission(permission: PermissionState | undefined, previousPermission?: PermissionState) {
  if (permission === 'granted') locate()
  else if (permission === 'denied' || previousPermission === 'granted' || locationState.value === 'denied') {
    clearLocation()
    locationState.value = permission === 'denied' ? 'denied' : 'idle'
  }
}
watch(locationPermission, syncLocationPermission)
function renderGis() {
  if (!gisGroup) return
  gisGroup.clearLayers()
  for (const definition of gisLayers) {
    if (!gis.selected.value.includes(definition.id)) continue
    const data = gis.datasets.value[definition.code]
    if (!data) continue
    const layer = L.geoJSON(data, {
      pane: 'gis-polygons',
      style: (feature) => gisStyle(definition.id, feature),
      onEachFeature: (feature, polygon) => {
        const content = document.createElement('section')
        const heading = document.createElement('h2')
        heading.textContent = definition.label
        heading.className = 'font-semibold'
        content.append(heading)
        const fields = [
          ['hazardClass', 'Kelas bahaya'],
          ['landUse', 'Penggunaan lahan'],
          ['estimatedPopulation', 'Estimasi penduduk'],
          ['location', 'Lokasi'],
          ['parcelId', 'ID persil'],
        ]
        for (const [key, label] of fields) {
          const value = feature.properties?.[key]
          if (value === null || value === undefined) continue
          const line = document.createElement('p')
          line.textContent = `${label}: ${String(value)}`
          content.append(line)
        }
        polygon.bindPopup(content)
      },
    })
    layer.addTo(gisGroup)
  }
}
watch([gis.selected, gis.datasets], renderGis)
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
}
const statusLabels: Record<EwsStation['statusCode'], string> = {
  normal: 'Normal and active',
  warning: 'Danger',
  maintenance: 'Under repair',
  telemetry_inactive: 'Telemetry inactive',
  unknown: 'Unknown',
}
const typeLabels: Record<EwsStation['type'], string> = { flood: 'Flood', landslide: 'Landslide', tsunami: 'Tsunami' }
const iconBaseUrl = `${import.meta.env.BASE_URL}ews-icons/`
const iconStates: Record<EwsStation['statusCode'], string> = { normal: 'normal', warning: 'warning', maintenance: 'maintenance', telemetry_inactive: 'inactive', unknown: 'inactive' }
const legendGroups = [
  { type: 'landslide', statuses: ['telemetry_inactive', 'normal', 'warning', 'maintenance'] },
  { type: 'flood', statuses: ['telemetry_inactive', 'normal', 'warning', 'maintenance'] },
  { type: 'tsunami', statuses: ['telemetry_inactive', 'normal', 'maintenance'] },
] as const
const readings: { key: keyof EwsStation['readings']; label: string; unit: string }[] = [
  { key: 'waterLevelMeters', label: 'Water level', unit: 'm' },
  { key: 'rainfallMm', label: 'Rainfall', unit: 'mm' },
  { key: 'groundMovementCm', label: 'Ground movement', unit: 'cm' },
  { key: 'humidityPercent', label: 'Humidity', unit: '%' },
  { key: 'batteryVolts', label: 'Battery', unit: 'V' },
  { key: 'sensorBatteryVolts', label: 'Sensor battery', unit: 'V' },
  { key: 'hornOhms', label: 'Horn', unit: 'Ω' },
]
function renderEws() {
  if (!ewsLayers) return
  ewsLayers.clearLayers()
  for (const station of stations.value) {
    const iconState = iconStates[station.statusCode]
    const extension = iconState === 'warning' ? 'gif' : 'svg'
    const marker = L.marker([station.latitude, station.longitude], {
      title: `${station.name} — ${statusLabels[station.statusCode]}`,
      keyboard: true,
      icon:
        station.statusCode === 'unknown'
          ? L.divIcon({ className: 'ews-unknown-icon', html: '?', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28] })
          : L.icon({
              iconUrl: `${iconBaseUrl}${station.type}-${iconState}.${extension}`,
              iconSize: [32, 37],
              iconAnchor: [16, 37],
              popupAnchor: [0, -28],
            }),
    })
    const content = document.createElement('section')
    content.setAttribute('aria-label', 'Early warning station details')
    const heading = document.createElement('h2')
    heading.className = 'text-base font-semibold'
    heading.textContent = station.name
    content.append(heading)
    const status = document.createElement('p')
    status.className = 'mt-1 text-sm'
    status.textContent = `${typeLabels[station.type]} · ${statusLabels[station.statusCode]}`
    content.append(status)
    const list = document.createElement('dl')
    list.className = 'mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm'
    for (const reading of readings) {
      const value = station.readings[reading.key]
      if (value === null) continue
      const term = document.createElement('dt')
      term.textContent = reading.label
      const detail = document.createElement('dd')
      detail.textContent = `${value} ${reading.unit}`
      list.append(term, detail)
    }
    if (list.childElementCount) content.append(list)
    const updated = document.createElement('p')
    updated.className = 'mt-2 text-xs'
    updated.textContent = `Source update: ${station.sourceUpdatedAt && /^\d{4}-\d{2}-\d{2}/.test(station.sourceUpdatedAt) ? station.sourceUpdatedAt : 'Unavailable'}`
    content.append(updated)
    const toolbarHeight = host.value?.parentElement?.querySelector('.map-toolbar')?.getBoundingClientRect().height ?? 100
    marker.bindPopup(content, { className: 'location-popup', maxWidth: 320, autoPanPaddingTopLeft: L.point(20, toolbarHeight + 20) })
    L.circle(marker.getLatLng(), {
      radius: 1_000,
      pane: 'ews-ranges',
      stroke: false,
      fillColor: `url(#${detectionFillId})`,
      fillOpacity: 1,
      interactive: false,
      className: 'ews-detection-range',
    }).addTo(ewsLayers)
    marker.addTo(ewsLayers)
  }
}
watch(pins, renderPins)
watch(stations, renderEws)
function retryTiles() {
  if (!tiles) return
  tileRetryFailed = false
  retryingTiles.value = true
  tiles.redraw()
  if (!tiles.isLoading()) retryingTiles.value = false
}
onMounted(() => {
  if (!host.value) return
  const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  map = L.map(host.value, { zoomAnimation: animate, fadeAnimation: animate, markerZoomAnimation: animate, zoomControl: false, zoomSnap: 0.25 }).fitBounds(
    [
      [kalonganBoundingBox.south, kalonganBoundingBox.west],
      [kalonganBoundingBox.north, kalonganBoundingBox.east],
    ],
    { padding: [16, 16], maxZoom: 15 }
  )
  map.createPane('gis-polygons').style.zIndex = '350'
  map.createPane('ews-ranges').style.zIndex = '360'
  const locationMap = map
  const zoom = L.control.zoom({ position: 'bottomleft' })
  watch(
    mobile,
    (isMobile) => {
      if (isMobile) zoom.remove()
      else zoom.addTo(locationMap)
    },
    { immediate: true }
  )
  tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)
  tiles.on('tileerror', () => {
    tileError.value = true
    tileRetryFailed = true
  })
  tiles.on('load', () => {
    if (!retryingTiles.value) return
    tileError.value = tileRetryFailed
    retryingTiles.value = false
  })
  gisGroup = L.layerGroup().addTo(map)
  markers = L.layerGroup().addTo(map)
  ewsLayers = L.layerGroup().addTo(map)
  syncLocationPermission(locationPermission.value)
  observer = new ResizeObserver(() => map?.invalidateSize())
  observer.observe(host.value)
  renderPins()
  renderEws()
})
onBeforeUnmount(() => {
  clearLocation()
  observer?.disconnect()
  deferCleanup(() => map?.remove())
})
</script>
<template>
  <div class="location-map absolute inset-0 isolate">
    <svg width="0" height="0" aria-hidden="true" class="pointer-events-none absolute text-info">
      <defs>
        <radialGradient :id="detectionFillId">
          <stop offset="72%" stop-color="currentColor" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </radialGradient>
      </defs>
    </svg>
    <div ref="host" class="absolute inset-0 z-0" aria-label="Location map" />
    <div class="map-toolbar absolute inset-x-0 top-0 z-[500] px-5 py-5 text-on-surface sm:px-7 sm:py-6">
      <div class="map-atmosphere pointer-events-none absolute inset-x-0 -bottom-16 top-0" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
      <div class="relative flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-1">
          <slot />
          <Button
            v-if="locationWarning"
            v-tippy="{ content: locationWarning, placement: 'bottom-start', trigger: 'mouseenter focus click', delay: 300, maxWidth: 260 }"
            type="button"
            kind="icon"
            variant="standard"
            color="warning"
            ariaLabel="Masalah lokasi"
            class="map-location-warning w-8 min-w-8"
          >
            <template #icon><Icon name="error-warning" /></template>
          </Button>
        </div>
        <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>
    <DialogRoot v-model:open="layersOpen" :modal="false">
      <div class="map-controls absolute flex items-end gap-2">
        <div v-if="showLocationAction || mapError || retryingMap" class="pointer-events-none absolute inset-x-0 bottom-12 z-[500] flex items-center justify-end gap-2" :inert="layersOpen">
          <div v-if="showLocationAction" class="pointer-events-auto min-w-0 flex-1">
            <Button
              type="button"
              variant="filled"
              class="w-full min-w-0 bg-secondary px-3 text-on-secondary after:bg-on-secondary-hover focus-visible:outline-secondary focus-visible:after:bg-on-secondary-active active:after:bg-on-secondary-active aria-disabled:bg-secondary aria-disabled:text-on-secondary"
              :soft-disabled="locationState === 'locating'"
              @click="locate"
            >
              <template #icon
                ><span aria-hidden="true"><Icon name="crosshair" /></span
              ></template>
              <span class="truncate" aria-live="polite">{{ locationState === 'locating' ? 'Mencari lokasi…' : 'Izinkan lokasi' }}</span>
            </Button>
          </div>
          <div v-if="mapError || retryingMap" class="pointer-events-auto size-10 shrink-0" :aria-busy="retryingMap">
            <Tooltip>
              <template #trigger>
                <Button
                  type="button"
                  kind="icon"
                  variant="filled"
                  color="warning"
                  ariaLabel="Refresh map data"
                  class="aria-disabled:bg-warning aria-disabled:text-on-warning"
                  :soft-disabled="retryingMap"
                  @click="retryMap"
                >
                  <template #icon><Icon name="refresh" :class="{ 'motion-safe:animate-spin': retryingMap }" /></template>
                </Button>
              </template>
              <template #content>{{ retryingMap ? 'Refreshing map data…' : mapError }}</template>
            </Tooltip>
          </div>
        </div>
        <Card ref="legendCard" variant="elevated" color="surfaceContainer" class="relative z-[500] min-w-0 flex-1 gap-0 p-0 lg:w-64 lg:flex-none">
          <CollapsibleRoot v-model:open="legendOpen" class="flex flex-col-reverse">
            <CollapsibleTrigger
              class="group flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-on-surface/[8%] focus-visible:outline-none focus-visible:bg-on-surface/[8%]"
            >
              <span class="flex items-center gap-2"
                ><span aria-hidden="true" class="inline-flex text-primary"><Icon name="map-2" size="lg" /></span>Legend</span
              >
              <span aria-hidden="true" class="inline-flex transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180 motion-reduce:transition-none">
                <Icon name="arrow-up-s" />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent class="legend-content">
              <div class="legend-items space-y-2 overflow-y-auto overscroll-contain border-b border-outline-variant/50 px-3 py-2 text-xs">
                <section v-for="layer in gisLayers.filter((item) => gis.selected.value.includes(item.id))" :key="layer.id">
                  <h2 class="font-medium">{{ layer.label }}</h2>
                  <p v-if="layer.id === 'estimasi-penduduk'" class="mt-1">Estimasi berdasarkan luas permukiman.</p>
                  <ul class="mt-1 space-y-1">
                    <li v-for="entry in gisLegend(layer.id)" :key="entry.label" class="flex items-center gap-2">
                      <span class="h-3 w-5 shrink-0 rounded-sm border" :style="{ backgroundColor: layer.id === 'persil-tanah' ? 'transparent' : entry.color, borderColor: entry.color }" /><span>{{
                        entry.label
                      }}</span>
                    </li>
                  </ul>
                </section>
                <section v-for="group in legendGroups" :key="group.type">
                  <h2 class="font-medium">{{ typeLabels[group.type] }}</h2>
                  <ul class="mt-1 space-y-1">
                    <li v-for="status in group.statuses" :key="status" class="flex items-center gap-2">
                      <img :src="`${iconBaseUrl}${group.type}-${iconStates[status]}.${status === 'warning' ? 'gif' : 'svg'}`" alt="" class="size-5 object-contain" />
                      <span>{{ statusLabels[status] }}</span>
                    </li>
                  </ul>
                </section>
                <div class="flex items-center gap-2"><span aria-hidden="true" class="ews-unknown-icon size-5">?</span><span>Unknown status</span></div>
              </div>
            </CollapsibleContent>
          </CollapsibleRoot>
        </Card>
        <div ref="layersAnchor" class="map-layers relative z-[500] size-10 shrink-0">
          <div class="map-layers-surface pointer-events-none absolute bottom-0 right-0 overflow-hidden" :class="{ 'is-open': layersOpen }">
            <Transition name="map-layers-content">
              <DialogContent v-if="layersOpen" class="map-layers-panel absolute bottom-0 right-0 flex flex-col text-on-surface outline-none" @escape-key-down.prevent="closeLayers">
                <DialogDescription class="sr-only">Pilih lapisan yang ingin ditampilkan pada peta.</DialogDescription>
                <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                  <GisLayerPicker :available="gis.available.value" :selected="gis.selected.value" :loading="gis.loading.value" :error="gis.error.value" @toggle="gis.toggle" @retry="gis.refresh" />
                </div>
                <footer class="flex shrink-0 items-center justify-between pl-4">
                  <DialogTitle class="text-sm font-medium leading-5">Map layers</DialogTitle>
                  <Button type="button" kind="icon" variant="tonal" ariaLabel="Close map layers" class="map-layers-button border-0 focus-visible:outline-offset-[-3px]" @click="closeLayers" />
                </footer>
              </DialogContent>
            </Transition>
          </div>
          <DialogTrigger as-child>
            <Button
              v-show="!layersOpen"
              type="button"
              kind="icon"
              :variant="gis.selected.value.length ? 'tonal' : 'elevated'"
              ariaLabel="Map layers"
              class="map-layers-button border-0 focus-visible:outline-offset-[-3px]"
            />
          </DialogTrigger>
          <span class="map-layers-icon" :class="layersOpen || gis.selected.value.length ? 'text-on-secondary-container' : 'text-primary'" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
              <MotionPath :initial="false" :animate="{ d: layersOpen ? 'M 6 6 L 9 9 L 12 12 L 15 15 L 18 18' : 'M 4 8 L 12 4 L 20 8 L 12 12 L 4 8' }" :transition="layersIconTransition" />
              <MotionPath :initial="false" :animate="{ d: layersOpen ? 'M 12 12 L 12 12 L 12 12' : 'M 4 12 L 12 16 L 20 12', opacity: layersOpen ? 0 : 1 }" :transition="layersIconTransition" />
              <MotionPath :initial="false" :animate="{ d: layersOpen ? 'M 6 18 L 12 12 L 18 6' : 'M 4 16 L 12 20 L 20 16' }" :transition="layersIconTransition" />
            </svg>
          </span>
          <span
            v-if="gis.selected.value.length && !layersOpen"
            aria-hidden="true"
            class="pointer-events-none absolute -right-1 -top-1 rounded-full bg-on-secondary-container px-1.5 text-[10px] font-semibold leading-4 text-secondary-container tabular-nums"
            >{{ gis.selected.value.length }}</span
          >
        </div>
      </div>
    </DialogRoot>
  </div>
</template>

<style scoped>
.location-map {
  --map-controls-bottom: var(--map-mobile-controls-bottom, calc(var(--mobile-navigation-pill-height, 56px) + env(safe-area-inset-bottom, 0px) + 1.75rem));
  --map-controls-left: max(1rem, env(safe-area-inset-left, 0px));
  --map-controls-right: max(1rem, env(safe-area-inset-right, 0px));
}
.map-controls {
  bottom: var(--map-controls-bottom);
  left: var(--map-controls-left);
  right: var(--map-controls-right);
}
.map-layers {
  --map-layers-width: min(16rem, calc(100vw - var(--map-controls-left) - var(--map-controls-right)));
  --map-layers-height: min(20rem, calc(100svh - var(--map-controls-bottom) - env(safe-area-inset-top, 0px) - 5rem));
}
.map-layers-button {
  -webkit-tap-highlight-color: transparent;
}
.map-layers-icon {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}
.map-layers-surface {
  width: 100%;
  height: 100%;
  border-radius: 1.25rem;
  transition:
    width 360ms cubic-bezier(0.22, 1, 0.36, 1),
    height 360ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 360ms ease,
    background-color 0s 360ms;
}
.map-layers-surface.is-open {
  @apply bg-surface-container;
  width: var(--map-layers-width);
  height: var(--map-layers-height);
  box-shadow: 0 12px 36px rgb(var(--md-sys-color-shadow) / 0.28);
  transition-delay: 0s;
}
.map-layers-panel {
  width: var(--map-layers-width);
  height: var(--map-layers-height);
  pointer-events: auto;
}
.map-layers-content-enter-active {
  transition: opacity 140ms ease 110ms;
}
.map-layers-content-leave-active {
  pointer-events: none;
  transition: opacity 120ms ease;
}
.map-layers-content-enter-from,
.map-layers-content-leave-to {
  opacity: 0;
}
.legend-items {
  max-height: min(26rem, 42svh, calc(100svh - var(--map-controls-bottom) - env(safe-area-inset-top, 0px) - 8rem));
}
@media (min-width: theme('screens.lg')) {
  .location-map {
    --map-controls-bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
    --map-controls-right: max(0.75rem, env(safe-area-inset-right, 0px));
  }
  .map-controls {
    left: auto;
  }
  .legend-items {
    max-height: min(26rem, calc(100svh - var(--map-controls-bottom) - env(safe-area-inset-top, 0px) - 14rem));
  }
}
.legend-content {
  overflow: hidden;
}
.legend-content[data-state='open'] {
  animation: legend-expand 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
.legend-content[data-state='closed'] {
  animation: legend-collapse 350ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes legend-expand {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: var(--reka-collapsible-content-height);
    opacity: 1;
  }
}
@keyframes legend-collapse {
  from {
    height: var(--reka-collapsible-content-height);
    opacity: 1;
  }
  to {
    height: 0;
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .legend-content {
    animation: none;
  }
  .map-layers-surface,
  .map-layers-content-enter-active,
  .map-layers-content-leave-active {
    transition: none;
  }
}

.map-atmosphere::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgb(0 0 0 / 0.12), transparent 70%), linear-gradient(to bottom, rgb(var(--md-sys-color-surface) / 0.72), rgb(var(--md-sys-color-surface) / 0));
}
.map-atmosphere > div {
  position: absolute;
  inset: 0;
  transform: translateZ(0);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 40%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 0%, black 40%, transparent 100%);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}
.map-atmosphere > div:nth-child(2) {
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 25%, transparent 65%);
  mask-image: linear-gradient(to bottom, black 0%, black 25%, transparent 65%);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}
.map-atmosphere > div:nth-child(3) {
  -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 40%);
  mask-image: linear-gradient(to bottom, black 0%, transparent 40%);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
@media (prefers-reduced-transparency: reduce) {
  .map-toolbar {
    background: rgb(var(--md-sys-color-surface));
  }
  .map-atmosphere::after {
    display: none;
  }
  .map-atmosphere > div {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>

<style>
.location-map .leaflet-ews-ranges-pane {
  opacity: 0.18;
}
.location-map .map-user-location {
  border: 2px solid white;
  border-radius: 50%;
  background: #1a73e8;
  box-shadow: 0 1px 4px #0005;
}
.ews-unknown-icon {
  display: grid;
  place-items: center;
  border: 2px solid white;
  border-radius: 50%;
  background: #374151;
  color: white;
  font-weight: 700;
}
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
.public-map-viewport .location-map {
  --map-mobile-controls-bottom: calc(env(safe-area-inset-bottom, 0px) + 2rem);
}
.public-map-viewport .map-toolbar {
  padding-top: calc(env(safe-area-inset-top, 0px) + 1.25rem);
  padding-left: max(1.25rem, env(safe-area-inset-left, 0px));
  padding-right: max(1.25rem, env(safe-area-inset-right, 0px));
}
.location-map .leaflet-bottom {
  bottom: env(safe-area-inset-bottom, 0px);
}
.location-map .leaflet-left {
  left: env(safe-area-inset-left, 0px);
}
.location-map .leaflet-right {
  right: env(safe-area-inset-right, 0px);
}
</style>

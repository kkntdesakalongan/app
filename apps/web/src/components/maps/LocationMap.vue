<script setup lang="ts">
import Card from '@southneuhof/loom/components/base/Card.vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import Tooltip from '@southneuhof/loom/components/base/Tooltip.vue'
import { breakpointsTailwind, onClickOutside, useBreakpoints } from '@vueuse/core'
import { computed, inject, onMounted, onBeforeUnmount, ref, useId, watch } from 'vue'
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
const deferCleanup = inject(routeLeaveCleanup, (cleanup) => cleanup())
const mobile = useBreakpoints(breakpointsTailwind).smaller('lg')
const activeSheet = ref<'layers' | 'legend' | null>(null)
const mapRail = ref<HTMLElement>()
const mobileSheet = ref<HTMLElement>()
const layersTrigger = ref<HTMLElement>()
const legendTrigger = ref<HTMLElement>()
const layersSheetId = useId()
const legendSheetId = useId()
const host = ref<HTMLElement>()
const tileError = ref(false)
const mapError = computed(() => [error.value?.message, ewsState.value === 'error' ? ewsError.value : '', tileError.value ? 'Map tiles could not load.' : ''].filter(Boolean).join(' '))
function toggleSheet(sheet: 'layers' | 'legend') {
  if (activeSheet.value === sheet) {
    closeSheet(true)
    return
  }
  activeSheet.value = sheet
}
function closeSheet(restoreFocus = false) {
  const closing = activeSheet.value
  if (!closing) return
  activeSheet.value = null
  if (restoreFocus) {
    const trigger = closing === 'layers' ? layersTrigger.value : legendTrigger.value
    trigger?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  }
}
onClickOutside(mobileSheet, () => closeSheet(), { ignore: [mapRail] })
watch(mobile, (isMobile) => {
  if (!isMobile) activeSheet.value = null
})
function focusMobileSheet(element: Element) {
  if (element instanceof HTMLElement) element.focus({ preventScroll: true })
}
function retryMap() {
  if (error.value) void refresh()
  if (ewsState.value === 'error') retryEws()
  if (tileError.value) retryTiles()
}
let map: L.Map | undefined
let tiles: L.TileLayer | undefined
let markers: L.LayerGroup | undefined
let ewsMarkers: L.LayerGroup | undefined
let observer: ResizeObserver | undefined
let gisGroup: L.LayerGroup | undefined
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
  if (!ewsMarkers || !map) return
  ewsMarkers.clearLayers()
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
    marker.addTo(ewsMarkers)
  }
}
watch(pins, renderPins)
watch(stations, renderEws)
function retryTiles() {
  tileError.value = false
  tiles?.redraw()
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
  L.control.zoom({ position: 'bottomleft' }).addTo(map)
  tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)
  tiles.on('tileerror', () => {
    tileError.value = true
  })
  gisGroup = L.layerGroup().addTo(map)
  markers = L.layerGroup().addTo(map)
  ewsMarkers = L.layerGroup().addTo(map)
  observer = new ResizeObserver(() => map?.invalidateSize())
  observer.observe(host.value)
  renderPins()
  renderEws()
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
        </div>
      </div>
    </div>
    <div v-if="!mobile" class="map-side-controls absolute z-[500] flex flex-col items-end gap-2">
      <Tooltip v-if="mapError">
        <template #trigger>
          <Button type="button" kind="icon" variant="filled" color="warning" ariaLabel="Refresh map data" @click="retryMap">
            <template #icon><Icon name="refresh" /></template>
          </Button>
        </template>
        <template #content>{{ mapError }}</template>
      </Tooltip>
      <Card variant="elevated" color="surfaceContainer" class="map-layers w-64 max-w-[calc(100%_-_1.5rem)] gap-0 p-0">
        <CollapsibleRoot :default-open="false">
          <CollapsibleTrigger
            class="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-on-surface/[8%] focus-visible:outline-none focus-visible:bg-on-surface/[8%]"
          >
            <span class="flex items-center gap-2">
              <Icon name="stack" class="text-primary" />
              <span>Lapisan peta</span>
              <span v-if="gis.selected.value.length" class="rounded-full bg-secondary-container px-1.5 text-[11px] font-semibold leading-5 text-on-secondary-container tabular-nums">{{
                gis.selected.value.length
              }}</span>
            </span>
            <Icon name="arrow-up-s" class="transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
          </CollapsibleTrigger>
          <CollapsibleContent class="legend-content">
            <div class="layers-items overflow-y-auto border-t border-outline-variant/50 px-3 py-3">
              <GisLayerPicker :available="gis.available.value" :selected="gis.selected.value" :loading="gis.loading.value" :error="gis.error.value" @toggle="gis.toggle" @retry="gis.refresh" />
            </div>
          </CollapsibleContent>
        </CollapsibleRoot>
      </Card>
      <Card variant="elevated" color="surfaceContainer" class="map-legend w-64 max-w-[calc(100%_-_1.5rem)] gap-0 p-0">
        <CollapsibleRoot :default-open="true">
          <CollapsibleTrigger
            class="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-on-surface/[8%] focus-visible:outline-none focus-visible:bg-on-surface/[8%]"
          >
            <span class="flex items-center gap-2"><Icon name="map-2" class="text-primary" />Legend</span>
            <Icon name="arrow-up-s" class="transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
          </CollapsibleTrigger>
          <CollapsibleContent class="legend-content">
            <div class="legend-items space-y-3 overflow-y-auto border-t border-outline-variant/50 px-4 py-3 text-xs">
              <section v-for="layer in gisLayers.filter((item) => gis.selected.value.includes(item.id))" :key="layer.id">
                <h2 class="font-semibold">{{ layer.label }}</h2>
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
                <h2 class="font-semibold">{{ typeLabels[group.type] }}</h2>
                <ul class="mt-1 space-y-1">
                  <li v-for="status in group.statuses" :key="status" class="flex items-center gap-2">
                    <img :src="`${iconBaseUrl}${group.type}-${iconStates[status]}.${status === 'warning' ? 'gif' : 'svg'}`" alt="" class="h-6 w-6 object-contain" />
                    <span>{{ statusLabels[status] }}</span>
                  </li>
                </ul>
              </section>
              <div class="flex items-center gap-2"><span aria-hidden="true" class="ews-unknown-icon h-6 w-6">?</span><span>Unknown status</span></div>
            </div>
          </CollapsibleContent>
        </CollapsibleRoot>
      </Card>
    </div>
    <div v-if="mobile" ref="mapRail" class="map-right-rail absolute z-[500] flex flex-col items-center gap-2">
      <Tooltip v-if="mapError">
        <template #trigger>
          <Button type="button" kind="icon" variant="filled" color="warning" ariaLabel="Refresh map data" class="h-11 w-11 shadow-md" @click="retryMap">
            <template #icon><Icon name="refresh" /></template>
          </Button>
        </template>
        <template #content>{{ mapError }}</template>
      </Tooltip>
      <div ref="layersTrigger" class="relative">
        <Button
          type="button"
          kind="icon"
          :variant="activeSheet === 'layers' ? 'filled' : gis.selected.value.length ? 'tonal' : 'elevated'"
          ariaLabel="Lapisan peta"
          class="h-11 w-11 shadow-md"
          v-bind="{ 'aria-expanded': activeSheet === 'layers', 'aria-controls': activeSheet === 'layers' ? layersSheetId : undefined }"
          @click="toggleSheet('layers')"
        >
          <template #icon><Icon name="stack" size="lg" /></template>
        </Button>
        <span
          v-if="gis.selected.value.length"
          aria-hidden="true"
          class="pointer-events-none absolute -right-1 -top-1 rounded-full px-1.5 text-[10px] font-semibold leading-4 tabular-nums"
          :class="activeSheet === 'layers' ? 'bg-on-primary text-primary' : 'bg-on-secondary-container text-secondary-container'"
          >{{ gis.selected.value.length }}</span
        >
      </div>
      <div ref="legendTrigger" class="relative">
        <Button
          type="button"
          kind="icon"
          :variant="activeSheet === 'legend' ? 'filled' : 'elevated'"
          ariaLabel="Legend"
          class="h-11 w-11 shadow-md"
          v-bind="{ 'aria-expanded': activeSheet === 'legend', 'aria-controls': activeSheet === 'legend' ? legendSheetId : undefined }"
          @click="toggleSheet('legend')"
        >
          <template #icon><Icon name="map-2" size="lg" /></template>
        </Button>
      </div>
    </div>
    <Transition name="map-sheet" mode="out-in" @enter="focusMobileSheet">
      <section
        v-if="mobile && activeSheet === 'layers'"
        key="layers"
        :id="layersSheetId"
        ref="mobileSheet"
        tabindex="-1"
        :aria-labelledby="layersSheetId + '-title'"
        class="mobile-map-sheet absolute z-[505] flex flex-col overflow-hidden rounded-[1.625rem] bg-surface-container-low text-on-surface shadow-xl outline-none"
        @keydown.esc="closeSheet(true)"
      >
        <header class="flex shrink-0 items-center justify-between gap-2 border-b border-outline-variant/50 px-4 py-3">
          <h2 :id="layersSheetId + '-title'" class="flex items-center gap-2 text-lg font-semibold"><Icon name="stack" class="text-primary" />Lapisan peta</h2>
          <Button type="button" kind="icon" variant="standard" ariaLabel="Tutup lapisan peta" @click="closeSheet(true)">
            <template #icon><Icon name="close" /></template>
          </Button>
        </header>
        <div class="overflow-y-auto overscroll-contain p-4">
          <GisLayerPicker :available="gis.available.value" :selected="gis.selected.value" :loading="gis.loading.value" :error="gis.error.value" @toggle="gis.toggle" @retry="gis.refresh" />
        </div>
      </section>
      <section
        v-else-if="mobile && activeSheet === 'legend'"
        key="legend"
        :id="legendSheetId"
        ref="mobileSheet"
        tabindex="-1"
        :aria-labelledby="legendSheetId + '-title'"
        class="mobile-map-sheet absolute z-[505] flex flex-col overflow-hidden rounded-[1.625rem] bg-surface-container-low text-on-surface shadow-xl outline-none"
        @keydown.esc="closeSheet(true)"
      >
        <header class="flex shrink-0 items-center justify-between gap-2 border-b border-outline-variant/50 px-4 py-3">
          <h2 :id="legendSheetId + '-title'" class="flex items-center gap-2 text-lg font-semibold"><Icon name="map-2" class="text-primary" />Legend</h2>
          <Button type="button" kind="icon" variant="standard" ariaLabel="Tutup legend" @click="closeSheet(true)">
            <template #icon><Icon name="close" /></template>
          </Button>
        </header>
        <div class="space-y-3 overflow-y-auto overscroll-contain p-4 text-xs">
          <section v-for="layer in gisLayers.filter((item) => gis.selected.value.includes(item.id))" :key="layer.id">
            <h3 class="font-semibold">{{ layer.label }}</h3>
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
            <h3 class="font-semibold">{{ typeLabels[group.type] }}</h3>
            <ul class="mt-1 space-y-1">
              <li v-for="status in group.statuses" :key="status" class="flex items-center gap-2">
                <img :src="`${iconBaseUrl}${group.type}-${iconStates[status]}.${status === 'warning' ? 'gif' : 'svg'}`" alt="" class="h-6 w-6 object-contain" />
                <span>{{ statusLabels[status] }}</span>
              </li>
            </ul>
          </section>
          <div class="flex items-center gap-2"><span aria-hidden="true" class="ews-unknown-icon h-6 w-6">?</span><span>Unknown status</span></div>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.location-map {
  --map-controls-bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
  --map-mobile-rail-bottom: calc(var(--mobile-navigation-pill-height, 56px) + env(safe-area-inset-bottom, 0px) + 1.75rem);
}
.map-right-rail {
  bottom: var(--map-mobile-rail-bottom);
  right: max(1rem, env(safe-area-inset-right, 0px));
}
.mobile-map-sheet {
  left: max(0.75rem, env(safe-area-inset-left, 0px));
  right: max(0.75rem, env(safe-area-inset-right, 0px));
  bottom: var(--map-mobile-rail-bottom);
  max-height: min(28rem, calc(100svh - var(--map-mobile-rail-bottom) - env(safe-area-inset-top, 0px) - 6.5rem));
}
.map-sheet-enter-active {
  transition:
    opacity 240ms cubic-bezier(0.16, 1, 0.3, 1),
    translate 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.map-sheet-leave-active {
  transition:
    opacity 180ms cubic-bezier(0.4, 0, 1, 1),
    translate 180ms cubic-bezier(0.4, 0, 1, 1);
}
.map-sheet-enter-from,
.map-sheet-leave-to {
  opacity: 0;
  translate: 0 12px;
}
.map-side-controls {
  right: max(0.75rem, env(safe-area-inset-right, 0px));
  bottom: var(--map-controls-bottom);
}
.layers-items {
  max-height: min(16rem, calc(40svh - 4rem));
}
.legend-items {
  max-height: min(26rem, calc(100svh - var(--map-controls-bottom) - env(safe-area-inset-top, 0px) - 14rem));
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
  .map-sheet-enter-active,
  .map-sheet-leave-active {
    transition: opacity 100ms ease;
  }
  .map-sheet-enter-from,
  .map-sheet-leave-to {
    translate: none;
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
  --map-controls-bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
  --map-mobile-rail-bottom: calc(env(safe-area-inset-bottom, 0px) + 2rem);
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

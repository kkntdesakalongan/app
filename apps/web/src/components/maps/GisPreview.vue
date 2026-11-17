<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import type { FeatureCollection } from 'geojson'
const props = defineProps<{ data: FeatureCollection }>()
const host = ref<HTMLElement>()
let map: L.Map | undefined
let layer: L.GeoJSON | undefined
function render() {
  if (!map) return
  layer?.remove()
  layer = L.geoJSON(props.data, { style: { color: '#2563eb', weight: 1, fillOpacity: 0.3 } }).addTo(map)
  if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [20, 20] })
}
onMounted(() => {
  if (!host.value) return
  map = L.map(host.value)
  L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map)
  render()
})
watch(() => props.data, render)
onBeforeUnmount(() => map?.remove())
</script>
<template><div ref="host" class="relative isolate h-80 w-full rounded-xl" aria-label="Pratinjau data GIS" /></template>

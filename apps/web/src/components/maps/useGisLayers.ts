import { onMounted, ref } from 'vue'
import { z } from 'zod/v4'
import type { FeatureCollection } from 'geojson'
import { gisDatasets } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'
import { gisFeatureCollectionSchema } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'
import { apiUrl } from '@/framework/rpc'
const recordSchema = z.object({ code: z.string(), name: z.string(), layers: z.array(z.string()), available: z.boolean() })
const layerLabels: Record<string, string> = {
  'penggunaan-lahan': 'Penggunaan Lahan',
  'estimasi-penduduk': 'Estimasi Penduduk',
}
export const gisLayers = gisDatasets.flatMap((dataset) => dataset.layers.map((id) => ({ id, label: layerLabels[id] ?? dataset.name, code: dataset.code })))
export function useGisLayers() {
  const available = ref<string[]>([])
  const selected = ref<string[]>([])
  const datasets = ref<Record<string, FeatureCollection>>({})
  const loading = ref(false)
  const error = ref('')
  const loadingCodes = ref<string[]>([])
  const pending = new Map<string, Promise<void>>()
  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      const response = await fetch(new URL('public/gis-data', apiUrl))
      if (!response.ok) throw new Error('Daftar lapisan tidak dapat dimuat.')
      const payload: unknown = await response.json()
      const records = z.object({ data: z.array(recordSchema) }).parse(payload).data
      available.value = records.filter((record) => record.available).map((record) => record.code)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Lapisan tidak dapat dimuat.'
    } finally {
      loading.value = false
    }
  }
  async function load(code: string) {
    const existing = pending.get(code)
    if (existing) return existing
    loadingCodes.value = [...loadingCodes.value, code]
    const request = (async () => {
      const response = await fetch(new URL(`public/gis-data/${encodeURIComponent(code)}`, apiUrl))
      if (!response.ok) throw new Error('Data lapisan tidak dapat dimuat. Coba lagi.')
      const data = gisFeatureCollectionSchema.parse(await response.json())
      datasets.value = { ...datasets.value, [code]: data }
    })()
    pending.set(code, request)
    try {
      await request
    } finally {
      pending.delete(code)
      loadingCodes.value = loadingCodes.value.filter((value) => value !== code)
    }
  }
  async function toggle(id: string, code: string) {
    if (selected.value.includes(id)) {
      selected.value = selected.value.filter((value) => value !== id)
      return
    }
    selected.value = [...selected.value, id]
    error.value = ''
    try {
      if (!datasets.value[code]) await load(code)
    } catch (cause) {
      selected.value = selected.value.filter((value) => !gisLayers.some((layer) => layer.id === value && layer.code === code))
      error.value = cause instanceof Error ? cause.message : 'Lapisan tidak dapat dimuat.'
    }
  }
  onMounted(refresh)
  return { available, selected, datasets, loading, loadingCodes, error, refresh, toggle }
}

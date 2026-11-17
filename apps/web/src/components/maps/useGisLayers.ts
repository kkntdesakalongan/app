import { onMounted, ref } from 'vue'
import { z } from 'zod/v4'
import type { FeatureCollection } from 'geojson'
import { gisDatasets } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'
import { gisFeatureCollectionSchema } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'
import { apiUrl } from '@/framework/rpc'
const recordSchema = z.object({ code: z.string(), name: z.string(), layers: z.array(z.string()), available: z.boolean() })
const layerLabels: Record<string, string> = {
  bahaya: 'Bahaya',
  'penggunaan-lahan': 'Penggunaan Lahan',
  'estimasi-penduduk': 'Estimasi Penduduk',
  'area-longsor': 'Area Longsor',
  'area-terdampak': 'Area Terdampak',
  'persil-tanah': 'Persil Tanah',
}
export const gisLayers = gisDatasets.flatMap((dataset) => dataset.layers.map((id) => ({ id, label: layerLabels[id], code: dataset.code })))
export function useGisLayers() {
  const available = ref<string[]>([])
  const selected = ref<string[]>([])
  const datasets = ref<Record<string, FeatureCollection>>({})
  const loading = ref(false)
  const error = ref('')
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
  async function toggle(id: string, code: string) {
    if (selected.value.includes(id)) {
      selected.value = selected.value.filter((value) => value !== id)
      return
    }
    loading.value = true
    error.value = ''
    try {
      if (!datasets.value[code]) {
        const response = await fetch(new URL(`public/gis-data/${encodeURIComponent(code)}`, apiUrl))
        if (!response.ok) throw new Error('Data lapisan tidak dapat dimuat. Coba lagi.')
        const data = gisFeatureCollectionSchema.parse(await response.json())
        datasets.value = { ...datasets.value, [code]: data }
      }
      selected.value = [...selected.value, id]
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Lapisan tidak dapat dimuat.'
    } finally {
      loading.value = false
    }
  }
  onMounted(refresh)
  return { available, selected, datasets, loading, error, refresh, toggle }
}

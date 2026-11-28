<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FileInput from '@southneuhof/loom/components/inputs/FileInput.vue'
import {
  evacuationSupportingDatasets,
  gisCodeSchema,
  gisFeatureCollectionSchema,
  vulnerabilityDatasets,
  type GisFeatureCollection,
} from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'
import { convertGisFile } from './gisConversion'
import GisPreview from './GisPreview.vue'
const props = defineProps<{ code: string; disabled?: boolean; label?: string; error?: string }>()
const evacuationCode = 'jalur-evakuasi'
const formats = computed(() => {
  const geojson = ['.json', '.geojson']
  if (props.code === evacuationCode || evacuationSupportingDatasets.some(({ code }) => code === props.code)) return ['.gpkg', ...geojson]
  if (vulnerabilityDatasets.some(({ code }) => code === props.code)) return ['.zip', ...geojson]
  return ['.gpkg', '.zip', ...geojson]
})
const model = defineModel<File | null>()
const preview = ref<GisFeatureCollection>()
async function transform(file: File, context: { signal: AbortSignal }) {
  const data = await convertGisFile(file, gisCodeSchema.parse(props.code), context.signal)
  if (context.signal.aborted) throw new DOMException('Dibatalkan', 'AbortError')
  return new File([JSON.stringify(data)], `${file.name}.geojson`, { type: 'application/geo+json' })
}
watch(model, async (file) => {
  preview.value = undefined
  if (!file) return
  const data = gisFeatureCollectionSchema.parse(JSON.parse(await file.text()))
  if (model.value === file) preview.value = data
})
</script>
<template>
  <div class="flex flex-col gap-3">
    <FileInput v-model="model" mode="file" :disabled="disabled" :error="error" :accept="formats" :max-size="25" :transform="transform" />
    <p class="text-sm text-on-surface-variant">
      Konversi berlangsung di perangkat ini. Hanya hasil konversi yang disimpan.
      {{ code === evacuationCode ? 'Periksa posisi rute serta titik TES dan TEA sebelum menyimpan.' : 'Periksa posisi fitur sebelum menyimpan.' }}
    </p>
    <template v-if="preview"
      ><p class="text-sm">{{ preview.features.length.toLocaleString('id-ID') }} fitur siap disimpan.</p>
      <GisPreview :data="preview" :code="code"
    /></template>
  </div>
</template>

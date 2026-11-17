<script setup lang="ts">
import { ref, watch } from 'vue'
import FileInput from '@southneuhof/loom/components/inputs/FileInput.vue'
import { gisCodeSchema, gisFeatureCollectionSchema, type GisFeatureCollection } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'
import { convertGisFile } from './gisConversion'
import GisPreview from './GisPreview.vue'
const props = defineProps<{ code: string; disabled?: boolean; label?: string; error?: string }>()
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
    <FileInput v-model="model" mode="file" :disabled="disabled" :error="error" :accept="['.gpkg', '.zip', '.json', '.geojson']" :max-size="25" :transform="transform" />
    <p class="text-sm text-on-surface-variant">Konversi berlangsung di perangkat ini. Hanya hasil konversi yang disimpan. Periksa posisi area sebelum menyimpan.</p>
    <template v-if="preview"
      ><p class="text-sm">{{ preview.features.length.toLocaleString('id-ID') }} area siap disimpan.</p>
      <GisPreview :data="preview"
    /></template>
  </div>
</template>

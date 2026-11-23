<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import Spinner from '@southneuhof/loom/components/base/Spinner.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import { gisLayers } from './useGisLayers'
defineProps<{ available: string[]; selected: string[]; loading: boolean; loadingCodes: string[]; error: string }>()
defineEmits<{ toggle: [id: string, code: string]; retry: [] }>()
</script>
<template>
  <div class="grid gap-1">
    <p v-if="error" role="alert" class="text-sm text-error">{{ error }} <Button type="button" variant="text" @click="$emit('retry')">Coba lagi</Button></p>
    <Button
      v-for="layer in gisLayers"
      :key="layer.id"
      type="button"
      toggle
      :selected="selected.includes(layer.id)"
      :disabled="loading || !available.includes(layer.code)"
      :variant="selected.includes(layer.id) ? 'tonal' : 'text'"
      class="w-full justify-start px-2 [&>span:nth-child(2)]:flex-1 disabled:bg-transparent disabled:text-on-surface-variant"
      v-bind="{ role: 'checkbox', 'aria-checked': selected.includes(layer.id) }"
      @update:selected="$emit('toggle', layer.id, layer.code)"
    >
      <template #icon
        ><span aria-hidden="true"><Icon :name="selected.includes(layer.id) ? 'checkbox' : 'checkbox-blank'" size="lg" /></span
      ></template>
      <span class="flex min-w-0 flex-1 items-center justify-between text-left"
        ><span>{{ layer.label }}<span v-if="!loading && !available.includes(layer.code)" class="block text-xs">Belum diunggah</span></span
        ><span v-if="loadingCodes.includes(layer.code) && selected.includes(layer.id)" role="status" :aria-label="`Memuat ${layer.label}`"><Spinner class="h-4 w-4 !min-h-0 shrink-0" /></span
      ></span>
    </Button>
  </div>
</template>

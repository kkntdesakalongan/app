<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import { gisLayers } from './useGisLayers'
defineProps<{ available: string[]; selected: string[]; loading: boolean; error: string }>()
defineEmits<{ toggle: [id: string, code: string]; retry: [] }>()
</script>
<template>
  <div class="grid gap-2">
    <p v-if="loading" role="status" class="text-xs text-on-surface-variant">Memuat lapisan…</p>
    <p v-if="error" role="alert" class="text-sm text-error">{{ error }} <Button type="button" variant="text" @click="$emit('retry')">Coba lagi</Button></p>
    <Button
      v-for="layer in gisLayers"
      :key="layer.id"
      type="button"
      toggle
      :selected="selected.includes(layer.id)"
      :disabled="loading || !available.includes(layer.code)"
      :variant="selected.includes(layer.id) ? 'tonal' : 'text'"
      class="w-full justify-start px-2"
      v-bind="{ role: 'checkbox', 'aria-checked': selected.includes(layer.id) }"
      @update:selected="$emit('toggle', layer.id, layer.code)"
    >
      <template #icon
        ><span aria-hidden="true"><Icon :name="selected.includes(layer.id) ? 'checkbox-circle' : 'checkbox-blank-circle'" /></span
      ></template>
      <span class="text-left">{{ layer.label }}<span v-if="!available.includes(layer.code)" class="block text-xs">Belum diunggah</span></span>
    </Button>
  </div>
</template>

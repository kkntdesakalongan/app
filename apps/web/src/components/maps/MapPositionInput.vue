<script setup lang="ts">
import LocationMap from './LocationMap.vue'
defineProps<{ modelValue?: { latitude: number; longitude: number } | null; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: { latitude: number; longitude: number }] }>()
</script>
<template>
  <div class="flex flex-col gap-2">
    <p v-if="modelValue">Selected position: {{ modelValue.latitude.toFixed(6) }}, {{ modelValue.longitude.toFixed(6) }}</p>
    <div class="relative h-80"><LocationMap :placement="!disabled" @select="emit('update:modelValue', $event)" /></div>
  </div>
</template>

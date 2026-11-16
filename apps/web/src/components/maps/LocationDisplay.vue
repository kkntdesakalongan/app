<script setup lang="ts">
import type { Coordinate } from '@southneuhof/loom'
import OpenStreetMap from '@southneuhof/loom/components/utils/OpenStreetMap.vue'

defineProps<{ value?: Coordinate | null }>()
</script>

<template>
  <OpenStreetMap v-if="value" :center="value" :location="value" disabled />
  <span v-else>-</span>
</template>

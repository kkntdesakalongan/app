<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import LocationMap from '@/components/maps/LocationMap.vue'
</script>
<template>
  <LocationMap>
    <h1 class="text-xl font-semibold tracking-tight">Location map</h1>
    <template #actions><Button variant="text" href="/disaster-reports/new">Report a disaster</Button></template>
  </LocationMap>
</template>

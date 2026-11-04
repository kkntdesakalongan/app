<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LocationMap from '@/components/maps/LocationMap.vue'
</script>
<template>
  <LocationMap
    ><h1 class="font-semibold">Location map</h1>
    <RouterLink to="/disaster-reports/new">Report a disaster</RouterLink></LocationMap
  >
</template>

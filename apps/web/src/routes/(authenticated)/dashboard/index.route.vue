<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LocationMap from '@/components/maps/LocationMap.vue'
import { permissions } from '@/stores/permissions'
const access = permissions()
</script>
<template>
  <LocationMap>
    <h1 class="font-semibold">Location map</h1>
    <RouterLink v-if="access.can('create-map-pins')" to="/map-pins/create">Create location</RouterLink>
    <RouterLink v-if="access.can('view-map-pins')" to="/map-pins">Manage locations</RouterLink>
    <template #selected="{ pin }"><RouterLink v-if="access.can('update-map-pins')" :to="`/map-pins/${pin.id}/edit`">Edit location</RouterLink></template>
  </LocationMap>
</template>

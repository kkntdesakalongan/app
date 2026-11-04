<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import LocationMap from '@/components/maps/LocationMap.vue'
import { permissions } from '@/stores/permissions'
const access = permissions()
definePage({ meta: { fullBleed: true } })
</script>
<template>
  <LocationMap>
    <h1 class="text-xl font-semibold tracking-tight">Location map</h1>
    <template #actions>
      <Button variant="text" v-if="access.can('create-map-pins')" href="/map-pins/create">Create location</Button>
      <Button variant="text" v-if="access.can('view-map-pins')" href="/map-pins">Manage locations</Button>
    </template>
    <template #selected="{ pin }"><Button variant="text" v-if="access.can('update-map-pins')" :href="`/map-pins/${pin.id}/edit`">Edit location</Button></template>
  </LocationMap>
</template>

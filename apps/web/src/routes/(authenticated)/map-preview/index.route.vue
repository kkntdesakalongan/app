<script setup lang="ts">
import { ref } from 'vue'
import type { Coordinate } from '@southneuhof/loom'
import NavigationHeader from '@southneuhof/loom/components/views/NavigationHeader.vue'
import LocationInput from '@southneuhof/loom/components/composites/form-inputs/LocationInput.vue'
import { locationOperations } from '@/framework/adapters/location'

const location = ref<Coordinate | null | undefined>(null)
</script>

<template>
  <div class="flex flex-col gap-2">
    <NavigationHeader title="Pratinjau peta" />
    <p>Cari lokasi, klik peta, atau geser penanda untuk memilih koordinat.</p>
    <LocationInput v-model="location" label="Lokasi" map-provider="openstreetmap" :operations="locationOperations" />
  </div>
</template>

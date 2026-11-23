<script setup lang="ts">
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import LocationMap from '@/components/maps/LocationMap.vue'
definePage({ meta: { fullBleed: true } })
</script>
<template>
  <LocationMap>
    <h1 class="text-xl font-semibold tracking-tight">WebGIS</h1>
    <template #actions
      ><Button variant="filled" href="/create-report?from=dashboard"
        ><template #icon
          ><span aria-hidden="true"><Icon name="alarm-warning" /></span></template
        >Buat Laporan</Button
      ></template
    >
  </LocationMap>
</template>

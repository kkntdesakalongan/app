<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import LocationMap from '@/components/maps/LocationMap.vue'
import { identityStatus, loadIdentity } from '@/framework/identity'

definePage({ meta: { fullBleed: true } })

const accessAction = computed(() =>
  identityStatus.value === 'authenticated' ? ({ to: { name: 'dashboard' }, label: 'Admin', icon: 'admin' } as const) : ({ to: { name: 'auth-login' }, label: 'Masuk', icon: 'login-box' } as const)
)

onMounted(() => {
  void loadIdentity().catch(() => undefined)
})
</script>

<template>
  <LocationMap>
    <h1 class="text-xl font-semibold tracking-tight">WebGIS</h1>
    <template #actions>
      <RouterLink :to="accessAction.to" custom v-slot="{ href, navigate }">
        <Button variant="tonal" :href="href" class="map-access" @click="navigate">
          <template #icon
            ><span aria-hidden="true"><Icon :name="accessAction.icon" /></span
          ></template>
          <span class="map-access-label">{{ accessAction.label }}</span>
        </Button>
      </RouterLink>
      <Button variant="filled" href="/create-report" class="map-report">
        <template #icon
          ><span aria-hidden="true"><Icon name="alarm-warning" /></span
        ></template>
        Buat Laporan
      </Button>
    </template>
  </LocationMap>
</template>

<style scoped>
.map-access {
  padding-inline: 0.75rem;
}
@media (max-width: 480px) {
  .map-report {
    padding-inline: 0.75rem;
  }
}
@media (max-width: 423px) {
  .map-toolbar:has(.map-location-warning) .map-access {
    @apply w-10 min-w-10 gap-0 px-0;
  }
  .map-toolbar:has(.map-location-warning) .map-access-label {
    @apply sr-only;
  }
}
@media (max-width: 379px) {
  .map-access {
    width: 2.5rem;
    min-width: 2.5rem;
    gap: 0;
    padding-inline: 0;
  }
  .map-access-label {
    @apply sr-only;
  }
  .map-report {
    padding-inline: 0.5rem;
  }
}
</style>

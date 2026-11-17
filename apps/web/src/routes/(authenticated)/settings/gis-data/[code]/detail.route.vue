<script setup lang="ts">
import { DetailView } from '@southneuhof/loom'
import Button from '@southneuhof/loom/components/base/Button.vue'
import { useRoute, useRouter } from 'vue-router'
import { resource } from '../gis-data.resource'
import { permissions } from '@/stores/permissions'
const access = permissions()
const router = useRouter()
const route = useRoute('settings-gis-data-detail')
const code = String(route.params.code)
</script>
<template>
  <DetailView v-bind="resource.detail({ id: code })" title="Data GIS"
    ><template #controls><Button v-if="access.can('update-gis-data')" :href="router.resolve({ name: 'settings-gis-data-edit', params: { code } }).href">Unggah berkas</Button></template></DetailView
  >
</template>

<route>{ "meta": { "permission": "update-gis-data" } }</route>
<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { useRoute } from 'vue-router'
import { resource } from '../gis-data.resource'
const route = useRoute('settings-gis-data-edit')
</script>
<template>
  <FormView v-bind="resource.update({ id: String(route.params.code) })" title="Unggah Data GIS" :default-to="{ name: 'settings-gis-data-detail', params: { code: String(route.params.code) } }" />
</template>

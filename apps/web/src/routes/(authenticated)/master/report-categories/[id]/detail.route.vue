<script setup lang="ts">
import { DetailView } from '@southneuhof/loom'
import { useRoute } from 'vue-router'
import { resource } from '../report-categories.resource'
const route = useRoute('master-report-categories-detail')
</script>
<template><DetailView v-bind="resource.detail({ id: String(route.params.id) })" title="Kategori Laporan" /></template>

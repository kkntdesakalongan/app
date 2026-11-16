<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { useRoute } from 'vue-router'
import { resource } from '../report-categories.resource'
const route = useRoute('master-report-categories-edit')
</script>
<template><FormView v-bind="resource.update({ id: String(route.params.id) })" title="Ubah Kategori Laporan" /></template>

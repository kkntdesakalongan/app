<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { resource } from './report-categories.resource'
</script>
<template><ListView v-bind="resource.list()" title="Kategori Laporan" /></template>

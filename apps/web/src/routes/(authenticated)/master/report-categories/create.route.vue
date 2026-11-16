<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { resource } from './report-categories.resource'
</script>
<template><FormView v-bind="resource.create()" title="Tambah Kategori Laporan" /></template>

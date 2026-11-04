<script setup lang="ts">
import { DetailView } from '@southneuhof/loom'
import { useRoute } from 'vue-router'
import { resource } from '../map-pins.resource'
const route = useRoute('map-pins-detail')
</script>
<template><DetailView v-bind="resource.detail({ id: String(route.params.id) })" title="Map pins" /></template>

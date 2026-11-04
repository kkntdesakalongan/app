<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { useRoute } from 'vue-router'
import { resource } from '../map-pins.resource'
const route = useRoute('map-pins-edit')
</script>
<template><FormView v-bind="resource.update({ id: String(route.params.id) })" title="Edit map pins" /></template>

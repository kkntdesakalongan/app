<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { resource } from './map-pins.resource'
</script>
<template><FormView v-bind="resource.create()" title="Create location" /></template>

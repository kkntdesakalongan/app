<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { resource } from './map-pins.resource'
</script>
<template><ListView v-bind="resource.list()" title="Map pins" /></template>

<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { resource } from './gis-data.resource'
</script>
<template><ListView v-bind="resource.list()" title="Data GIS" /></template>

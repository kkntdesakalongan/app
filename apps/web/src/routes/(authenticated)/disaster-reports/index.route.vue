<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { resource } from './disaster-reports.resource'
</script>
<template><ListView v-bind="resource.list()" title="Disaster reports" /></template>

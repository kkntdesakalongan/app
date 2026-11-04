<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { resource } from './disaster-reports.resource'
</script>
<template><FormView v-bind="resource.create()" title="Create disaster reports" /></template>

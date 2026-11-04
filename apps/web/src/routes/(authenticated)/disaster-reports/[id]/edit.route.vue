<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { useRoute } from 'vue-router'
import { resource } from '../disaster-reports.resource'
const route = useRoute('disaster-reports-edit')
</script>
<template><FormView v-bind="resource.update({ id: String(route.params.id) })" title="Edit disaster reports" /></template>

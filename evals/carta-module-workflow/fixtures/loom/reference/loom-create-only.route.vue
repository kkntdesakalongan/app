<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { serviceRequestResource } from '@/framework/__eval/plan066/loom-create-only.module'
</script>

<template><FormView v-bind="serviceRequestResource.create" title="Create service request" /></template>

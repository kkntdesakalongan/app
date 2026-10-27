<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { permissionResource } from './permissions.resource'
</script>
<template><ListView v-bind="permissionResource.list()" title="Permissions" /></template>

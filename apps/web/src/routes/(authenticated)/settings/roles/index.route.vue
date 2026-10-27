<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { roles } from './roles.resource'
</script>

<template>
  <ListView v-bind="roles.list()" title="Roles" />
</template>

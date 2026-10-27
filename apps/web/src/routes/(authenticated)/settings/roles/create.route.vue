<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { roles } from './roles.resource'
</script>

<template>
  <FormView v-bind="roles.create()" title="Create Role" />
</template>

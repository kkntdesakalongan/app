<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { users } from './users.resource'
</script>

<template>
  <div>
    <ListView v-bind="users.list()" title="Users" />
  </div>
</template>

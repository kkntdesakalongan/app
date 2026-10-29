<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { users } from './users.resource'
</script>

<template><FormView v-bind="users.create()" title="Create User" /></template>

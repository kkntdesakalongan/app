<script setup lang="ts">
import { useRoute } from 'vue-router'
import { DetailView } from '@southneuhof/loom'
import { users } from '../users.resource'

const route = useRoute('settings-users-detail')
</script>

<template><DetailView v-bind="users.detail({ id: String(route.params.userId) })" /></template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { users } from '../users.resource'

const route = useRoute('settings-users-edit')
</script>

<template><FormView v-bind="users.update({ id: String(route.params.userId) })" title="Edit User" /></template>

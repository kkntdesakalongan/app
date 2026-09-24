<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { users } from '../users.resource'

// Not listed in the parent tab array, so it is reachable from the update
// control and by URL, but is never a tab.

const route = useRoute('settings-users-edit')
const userId = computed(() => route.params.userId)
const form = computed(() => {
  const page = users.update({ id: userId.value })
  const submit = page.form.submit
  return {
    ...page,
    form: {
      ...page.form,
      submit: async (input: Parameters<typeof submit>[0]) => {
        const current = await users.detail({ id: userId.value }).detail.load({ searchParameters: {} })
        if (!current) throw new Error('User not found.')
        if (current.statusCode === 'active' && input.statusCode && input.statusCode !== 'active' && !window.confirm('Disabling this user will end all active sessions. Continue?'))
          throw new Error('Status change cancelled.')
        return submit(input)
      },
    },
  }
})
</script>

<template>
  <FormView v-bind="form" title="Edit User" />
</template>

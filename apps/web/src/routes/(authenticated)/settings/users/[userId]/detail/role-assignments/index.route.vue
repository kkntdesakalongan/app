<route>{ "meta": { "permission": "view-role-assignments" } }</route>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { ListView } from '@southneuhof/loom'
import Switch from '@southneuhof/loom/components/inputs/Switch.vue'
import { errorMessage } from '@/framework/adapters/data/normalize'
import { roleAssignments } from './role-assignments.resource'
import type { RoleAssignment } from './role-assignments.schema'

const route = useRoute('settings-users-detail-role-assignments')
const userId = computed(() => String(route.params.userId))
const pending = ref(new Set<string>())

function canToggle(row: RoleAssignment) {
  return roleAssignments.actions.set.withContext({ record: row }).can(userId.value, String(row.id), !row.assigned)
}

const list = computed(() => ({
  ...roleAssignments.list,
  table: { ...roleAssignments.list.table, searchParameters: { userId: userId.value } },
}))

function isPending(roleId: string) {
  return pending.value.has(roleId)
}

async function toggle(row: RoleAssignment) {
  const roleId = String(row.id)
  const command = roleAssignments.actions.set.withContext({ record: row })
  if (!command.can(userId.value, roleId, !row.assigned) || isPending(roleId)) return
  const assigned = !row.assigned
  pending.value = new Set(pending.value).add(roleId)
  try {
    await command.run(userId.value, roleId, assigned)
  } catch (error) {
    toast.error(errorMessage(error, 'Role assignment update failed.'))
  } finally {
    const remaining = new Set(pending.value)
    remaining.delete(roleId)
    pending.value = remaining
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <ListView title="Role Assignments" v-bind="list">
      <template #row-actions="{ record }">
        <Switch
          :model-value="record.assigned"
          v-bind="{ role: 'switch', 'data-role': record.id, 'aria-checked': record.assigned, 'aria-label': `Role ${record.name}` }"
          :disabled="isPending(record.id) || !canToggle(record)"
          @update:model-value="toggle(record)"
        />
      </template>
    </ListView>
  </div>
</template>

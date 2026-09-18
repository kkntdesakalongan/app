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
  return roleAssignments.actions.set.can(userId.value, String(row.id), !row.assigned)
}

const list = computed(() =>
  roleAssignments.list({
    searchParameters: { userId: userId.value },
  })
)

function isPending(roleId: string) {
  return pending.value.has(roleId)
}

function roleRow(record: Record<string, unknown>) {
  return record as unknown as RoleAssignment
}

async function toggle(row: RoleAssignment) {
  const roleId = String(row.id)
  if (!canToggle(row) || isPending(roleId)) return
  const assigned = !row.assigned
  pending.value = new Set(pending.value).add(roleId)
  try {
    await roleAssignments.actions.set.run(userId.value, roleId, assigned)
    await roleAssignments.invalidate()
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
          :model-value="roleRow(record).assigned"
          role="switch"
          :data-role="roleRow(record).id"
          :aria-checked="roleRow(record).assigned"
          :disabled="isPending(String(roleRow(record).id)) || !canToggle(roleRow(record))"
          :aria-label="`Role ${roleRow(record).name}`"
          @update:model-value="toggle(roleRow(record))"
        />
      </template>
    </ListView>
  </div>
</template>

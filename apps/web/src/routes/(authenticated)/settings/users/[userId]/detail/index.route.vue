<script lang="ts">
export default { render: () => null }
</script>

<script setup lang="ts">
import { useResourceRuntime } from '@southneuhof/loom'

definePage({
  beforeEnter: (to) => {
    if (to.name !== 'settings-users-detail') return true
    if (!useResourceRuntime().adapters.access.allows({ operation: 'detail', permission: 'view-role-assignments' })) return true
    return {
      name: 'settings-users-detail-role-assignments',
      params: { userId: to.params.userId },
      query: Object.fromEntries(Object.entries(to.query).filter(([key]) => key.includes('.'))),
    }
  },
})
</script>

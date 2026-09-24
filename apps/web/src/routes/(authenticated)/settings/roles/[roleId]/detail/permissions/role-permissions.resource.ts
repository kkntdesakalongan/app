import { defineResource, defineTable } from '@southneuhof/loom'
import { appLabels } from '@/configs/labels'
import { rolePermissionsActions } from './role-permissions.actions'
import { rolePermissionRecordSchema, rolePermissionsQuerySchema } from './role-permissions.schema'

const rolePermissionLabels = { ...appLabels, permissionCode: 'Permission code', name: 'Permission name', description: 'Description', assigned: 'Assigned' }

const rolePermissionsTable = defineTable({
  schema: rolePermissionRecordSchema,
  labels: rolePermissionLabels,
  columns: {
    permissionCode: { sortable: true },
    name: { sortable: true },
    description: { class: 'line-clamp-3 overflow-ellipsis' },
    assigned: { sortable: true },
  },
})

export const rolePermissions = defineResource({
  key: 'role-permissions',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'list-role-permissions',
    table: { ...rolePermissionsTable, querySchema: rolePermissionsQuerySchema, load: rolePermissionsActions.list },
  },
  actions: {
    set: {
      run: rolePermissionsActions.set,
      permission: (roleId: string, permissionId: string, assigned: boolean) => (assigned ? 'create-role-permissions' : 'delete-role-permissions'),
    },
  },
})

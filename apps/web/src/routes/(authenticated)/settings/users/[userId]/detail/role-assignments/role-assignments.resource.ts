import { defineFields, defineResource } from '@southneuhof/loom'
import { roleAssignmentsActions } from './role-assignments.actions'
import { roleAssignmentsSchema } from './role-assignments.schema'

const fields = defineFields(roleAssignmentsSchema, {
  roleCode: { label: 'Code' },
  name: { label: 'Name' },
  description: { label: 'Description' },
})

export const roleAssignments = defineResource(roleAssignmentsSchema, {
  key: 'role-assignments',
  actions: {
    list: {
      run: roleAssignmentsActions.list,
      fields: [fields.roleCode, fields.name, fields.description, 'active'],
      permission: 'view-role-assignments',
      route: { name: 'settings-users-detail-role-assignments' },
      pagination: false,
    },
    set: {
      run: roleAssignmentsActions.set,
      permission: ['create-role-assignments', 'delete-role-assignments'],
    },
  },
})

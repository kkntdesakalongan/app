import { defineResource, defineTable } from '@southneuhof/loom'
import { appDisplayPresets } from '@/configs/display-presets'
import { appLabels } from '@/configs/labels'
import { roleAssignmentsActions } from './role-assignments.actions'
import { roleAssignmentRecordSchema, roleAssignmentsQuerySchema } from './role-assignments.schema'

const assignmentLabels = { ...appLabels, roleCode: 'Code', name: 'Name', description: 'Description' }

const roleAssignmentsTable = defineTable({
  schema: roleAssignmentRecordSchema,
  labels: assignmentLabels,
  columns: {
    roleCode: {},
    name: {},
    description: { class: 'line-clamp-3 overflow-ellipsis' },
    active: appDisplayPresets.active,
  },
})

export const roleAssignments = defineResource({
  key: 'role-assignments',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'view-role-assignments',
    table: { ...roleAssignmentsTable, querySchema: roleAssignmentsQuerySchema, pagination: false, load: roleAssignmentsActions.list },
  },
  actions: {
    set: {
      run: roleAssignmentsActions.set,
      permission: ['create-role-assignments', 'delete-role-assignments'],
    },
  },
})

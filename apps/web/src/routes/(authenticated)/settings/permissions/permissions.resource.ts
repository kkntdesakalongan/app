import { defineDetail, defineResource, defineTable } from '@southneuhof/loom'
import { appDisplayPresets } from '@/configs/display-presets'
import { appLabels } from '@/configs/labels'
import { permissionsActions } from './permissions.actions'
import { permissionsRecordSchema, permissionsTableQuerySchema } from './permissions.schema'

const permissionLabels = { ...appLabels, permissionCode: 'Code', name: 'Name', description: 'Description' }

const permissionsTable = defineTable({
  schema: permissionsRecordSchema,
  labels: permissionLabels,
  columns: {
    permissionCode: { sortable: true },
    name: { sortable: true },
    description: { class: 'line-clamp-3 overflow-ellipsis' },
    active: appDisplayPresets.active,
  },
})

const permissionDetail = defineDetail({
  schema: permissionsRecordSchema,
  labels: permissionLabels,
  fields: {
    permissionCode: {},
    name: {},
    description: {},
    active: appDisplayPresets.active,
  },
})

export const permissionResource = defineResource({
  key: 'permissions',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'view-permissions',
    route: { name: 'settings-permissions' },
    table: { ...permissionsTable, querySchema: permissionsTableQuerySchema, load: permissionsActions.list },
  },
  detail: {
    permission: 'view-permissions',
    route: { name: 'settings-permissions-detail', params: (id) => ({ permissionId: String(id) }) },
    title: 'Permission',
    detail: () => ({ ...permissionDetail, load: permissionsActions.detail }),
  },
})

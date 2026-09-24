import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { appDisplayPresets } from '@/configs/display-presets'
import { appInputPresets } from '@/configs/input-presets'
import { appLabels } from '@/configs/labels'
import { rolesActions } from './roles.actions'
import { rolesCreateSchema, rolesRecordSchema, rolesTableQuerySchema, rolesUpdateSchema } from './roles.schema'

const roleLabels = { ...appLabels, roleCode: 'Role Code', name: 'Role Name', description: 'Description', createdAt: 'Created At' }

const rolesTable = defineTable({
  schema: rolesRecordSchema,
  labels: roleLabels,
  columns: {
    roleCode: { sortable: true },
    name: { sortable: true },
    active: appDisplayPresets.active,
  },
})

const roleDetail = defineDetail({
  schema: rolesRecordSchema,
  labels: roleLabels,
  fields: {
    roleCode: {},
    name: {},
    description: {},
    active: appDisplayPresets.active,
    createdAt: appDisplayPresets.createdAt,
  },
})

const roleForm = defineForm({
  schema: rolesCreateSchema,
  labels: roleLabels,
  fields: {
    roleCode: { renderer: 'text' },
    name: appInputPresets.name,
    description: appInputPresets.description,
    active: appInputPresets.active,
  },
  submit: rolesActions.create,
})

const roleUpdateForm = defineForm({
  schema: rolesUpdateSchema,
  labels: roleLabels,
  fields: {
    roleCode: { renderer: 'text' },
    name: appInputPresets.name,
    description: appInputPresets.description,
    active: appInputPresets.active,
  },
})

export const roles = defineResource({
  key: 'roles',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'view-roles',
    route: { name: 'settings-roles' },
    table: { ...rolesTable, querySchema: rolesTableQuerySchema, load: rolesActions.list },
  },
  create: {
    permission: 'create-roles',
    route: { name: 'settings-roles-create' },
    form: roleForm,
  },
  detail: {
    permission: 'view-roles',
    route: { name: 'settings-roles-detail', params: (id) => ({ roleId: String(id) }) },
    title: 'Detail Role',
    detail: () => ({ ...roleDetail, load: rolesActions.detail }),
  },
  update: {
    permission: 'update-roles',
    route: { name: 'settings-roles-edit', params: (id) => ({ roleId: String(id) }) },
    form: ({ id }) => ({
      ...roleUpdateForm,
      load: async (context) => {
        const record = await rolesActions.detail(context)
        return record ? { roleCode: record.roleCode, name: record.name, description: record.description, active: record.active } : undefined
      },
      submit: (output) => rolesActions.update(id, output),
    }),
  },
  delete: { permission: 'delete-roles', run: rolesActions.delete },
})

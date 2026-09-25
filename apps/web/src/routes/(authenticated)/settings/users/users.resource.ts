import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { roles } from '../roles/roles.resource'
import { appDisplayPresets } from '@/configs/display-presets'
import { appInputPresets } from '@/configs/input-presets'
import { appLabels } from '@/configs/labels'
import { usersActions } from './users.actions'
import { createUserFormSchema, userRecordSchema, userUpdateFormSchema } from './users.schema'

const userLabels = { ...appLabels, roleIds: 'Roles', password: 'Password', createdAt: 'Created At', updatedAt: 'Updated At' }

const usersTable = defineTable({
  schema: userRecordSchema,
  labels: userLabels,
  columns: {
    name: { sortable: true },
    email: { sortable: true },
    statusCode: { ...appDisplayPresets.statusCode, align: 'center' },
    createdAt: { ...appDisplayPresets.createdAt, class: 'min-w-max whitespace-nowrap' },
  },
})

const userDetail = defineDetail({
  schema: userRecordSchema,
  labels: userLabels,
  fields: {
    name: {},
    email: {},
    statusCode: appDisplayPresets.statusCode,
    createdAt: appDisplayPresets.createdAt,
    updatedAt: appDisplayPresets.updatedAt,
  },
})

const userCreateForm = defineForm({
  schema: createUserFormSchema,
  labels: userLabels,
  fields: {
    name: appInputPresets.name,
    email: appInputPresets.email,
    password: { renderer: 'text', props: { type: 'password' } },
    roleIds: {
      renderer: 'checkbox-group',
      props: {
        load: roles.list.table.load,
        namespace: roles.list.table.namespace,
        pick: 'id',
        view: 'name',
        searchParameters: { active: true },
      },
    },
  },
  submit: usersActions.create,
})

const userUpdateForm = defineForm({
  schema: userUpdateFormSchema,
  labels: userLabels,
  fields: { name: appInputPresets.name, statusCode: appInputPresets.statusCode },
})

export const users = defineResource({
  key: 'users',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'view-users',
    route: { name: 'settings-users' },
    table: { ...usersTable, load: usersActions.list },
  },
  create: {
    permission: 'create-users',
    route: { name: 'settings-users-create' },
    form: userCreateForm,
  },
  detail: {
    permission: 'view-users',
    route: { name: 'settings-users-detail', params: (id) => ({ userId: String(id) }) },
    title: 'User Detail',
    detail: () => ({ ...userDetail, load: usersActions.detail }),
  },
  update: {
    permission: 'update-users',
    route: { name: 'settings-users-edit', params: (id) => ({ userId: String(id) }) },
    form: ({ id }) => ({
      ...userUpdateForm,
      load: async (context) => {
        const record = await usersActions.detail(context)
        return record ? { name: record.name, statusCode: record.statusCode } : undefined
      },
      submit: (output: (typeof userUpdateFormSchema)['_output']) => usersActions.update(id, output),
    }),
  },
})

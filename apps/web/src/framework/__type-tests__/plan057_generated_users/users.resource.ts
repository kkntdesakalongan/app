import { defineResource, defineTable, defineDetail, defineForm } from '@southneuhof/loom'
import { createHonoResourceActions } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { usersRecordSchema, usersUpdateSchema } from './users.schema'
import type { User } from './users.schema'

const api = createHonoResourceActions(rpc['users'])

const displayFragments = {
  statusCode: { renderer: 'chip', props: { options: { active: { label: 'Active' }, expired: { label: 'Expired' } } } },
} as const

const labels = {
  name: 'Name',
  email: 'Email',
  statusCode: 'Status',
}

const usersTable = defineTable({
  schema: usersRecordSchema,
  labels,
  columns: {
    name: { sortable: true },
    email: {},
    statusCode: { ...displayFragments.statusCode },
  },
})

const usersDetail = defineDetail({
  schema: usersRecordSchema,
  labels,
  fields: {
    name: {},
    email: {},
    statusCode: { ...displayFragments.statusCode },
  },
})

const updateForm = defineForm({
  schema: usersUpdateSchema,
  labels,
  fields: {
    name: { renderer: 'text' },
  },
})

export const users = defineResource({
  key: 'users',
  identity: (record: Pick<User, 'id'>) => record.id,
  detail: {
    permission: 'view-users',
    route: { name: 'settings-users-detail', params: (id) => ({ userId: String(id) }) },
    title: 'User',
    detail: ({ id }) => ({
      ...usersDetail,
      load: (context) => api.detail({ ...context, id }),
    }),
  },
  list: {
    permission: 'view-users',
    route: { name: 'settings-users' },
    table: { ...usersTable, load: api.list },
  },
  update: {
    permission: 'update-users',
    route: { name: 'settings-users-edit', params: (id) => ({ userId: String(id) }) },
    form: ({ id }) => ({
      ...updateForm,
      load: async (context) => {
        const record = await api.detail({ ...context, id })
        return record ? { name: record.name } : undefined
      },
      submit: (output) => api.update(id, output),
    }),
  },
})

export type { User, UserCreate, UserUpdate } from './users.schema'

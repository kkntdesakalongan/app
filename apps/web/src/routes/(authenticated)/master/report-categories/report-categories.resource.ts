import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { appDisplayPresets } from '@/configs/display-presets'
import { actions } from './report-categories.actions'
import { createSchema, recordSchema } from './report-categories.schema'

const labels = { name: 'Nama', createdAt: 'Dibuat pada', updatedAt: 'Diubah pada' }
const form = defineForm({ schema: createSchema, labels, fields: { name: { renderer: 'text' } } })
export const resource = defineResource({
  key: 'report-categories',
  identity: (record: { id: string }) => record.id,
  actions: { list: actions.list },
  list: {
    permission: 'view-report-categories',
    route: { name: 'master-report-categories' },
    table: { ...defineTable({ schema: recordSchema, labels, columns: { name: { sortable: true }, createdAt: appDisplayPresets.createdAt } }), load: actions.list },
  },
  create: { permission: 'create-report-categories', route: { name: 'master-report-categories-create' }, form: { ...form, submit: actions.create } },
  detail: {
    permission: 'view-report-categories',
    route: { name: 'master-report-categories-detail', params: (id) => ({ id: String(id) }) },
    detail: () => ({ ...defineDetail({ schema: recordSchema, labels, fields: { name: {}, createdAt: appDisplayPresets.createdAt, updatedAt: appDisplayPresets.updatedAt } }), load: actions.detail }),
  },
  update: {
    permission: 'update-report-categories',
    route: { name: 'master-report-categories-edit', params: (id) => ({ id: String(id) }) },
    form: ({ id }) => ({ ...form, load: actions.detail, submit: (value: (typeof createSchema)['_output']) => actions.update(id, value) }),
  },
  delete: { permission: 'delete-report-categories', run: (record) => actions.delete(record.id) },
})

import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { appDisplayPresets } from '@/configs/display-presets'
import { actions } from './disaster-reports.actions'
import { recordSchema } from './disaster-reports.schema'
import { reportFormSchema, reportPayload } from './report-form'

const fields = {
  title: { renderer: 'text' },
  description: { renderer: 'textarea' },
  image: { renderer: 'image', props: { mode: 'file', maxSize: 5, accept: ['image/png', 'image/jpeg', 'image/webp'] } },
} as const
const labels = { title: 'Title', name: 'Name', description: 'Description', image: 'Image', latitude: 'Latitude', longitude: 'Longitude' }
const form = defineForm({ schema: reportFormSchema, labels, fields })
export const resource = defineResource({
  key: 'disaster-reports',
  identity: (record: { id: string }) => record.id,
  actions: { list: actions.list },
  list: {
    permission: 'view-disaster-reports',
    route: { name: 'disaster-reports' },
    table: { ...defineTable({ schema: recordSchema, labels, columns: { title: { sortable: true }, createdAt: appDisplayPresets.createdAt } }), load: actions.list },
  },
  create: {
    permission: 'create-disaster-reports',
    route: { name: 'disaster-reports-create' },
    form: { ...form, submit: async (value: (typeof reportFormSchema)['_output']) => actions.create(await reportPayload(value)) },
  },
  detail: {
    permission: 'view-disaster-reports',
    route: { name: 'disaster-reports-detail', params: (id) => ({ id: String(id) }) },
    detail: () => ({ ...defineDetail({ schema: recordSchema, labels, fields: { title: {}, description: {} } }), load: actions.detail }),
  },
  update: {
    permission: 'update-disaster-reports',
    route: { name: 'disaster-reports-edit', params: (id) => ({ id: String(id) }) },
    form: ({ id }) => ({
      ...form,
      fields: { ...fields, removeImage: { renderer: 'checkbox', label: 'Remove saved image' } },
      load: async (context) => {
        const record = await actions.detail(context)
        return record ? { title: record.title, description: record.description, image: null } : undefined
      },
      submit: async (value: (typeof reportFormSchema)['_output']) => actions.update(id, await reportPayload(value)),
    }),
  },
  delete: { permission: 'delete-disaster-reports', run: (record) => actions.delete(record.id) },
})

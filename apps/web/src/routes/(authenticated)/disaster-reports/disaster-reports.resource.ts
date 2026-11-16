import { categoryField, publicCategoryActions } from '../master/report-categories/category-field'
import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { appDisplayPresets } from '@/configs/display-presets'
import { actions } from './disaster-reports.actions'
import { recordSchema, detailSchema } from './disaster-reports.schema'
import { reportFormSchema, reportPayload } from './report-form'

const fields = {
  title: { renderer: 'text' },
  description: { renderer: 'textarea' },
  categoryId: categoryField,
  image: { renderer: 'image', props: { mode: 'file', maxSize: 5, accept: ['image/png', 'image/jpeg', 'image/webp'] } },
} as const
const labels = { title: 'Title', name: 'Name', description: 'Description', categoryName: 'Kategori Laporan', image: 'Image', createdAt: 'Submitted at', latitude: 'Latitude', longitude: 'Longitude' }
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
  detail: {
    permission: 'view-disaster-reports',
    route: { name: 'disaster-reports-detail', params: (id) => ({ id: String(id) }) },
    detail: () => ({
      ...defineDetail({ schema: detailSchema, labels, fields: { title: {}, description: {}, categoryName: {}, createdAt: appDisplayPresets.createdAt, image: {} } }),
      load: async (context) => {
        const record = await actions.detail(context)
        if (!record) return undefined
        const categories = await publicCategoryActions['report-categories']({ signal: context.signal, query: {}, searchParameters: {} })
        return { ...record, categoryName: categories.data.find((category) => category.id === record.categoryId)?.name ?? null }
      },
    }),
  },
  update: {
    permission: 'update-disaster-reports',
    route: { name: 'disaster-reports-edit', params: (id) => ({ id: String(id) }) },
    form: ({ id }) => ({
      ...form,
      fields: { ...fields, removeImage: { renderer: 'checkbox', label: 'Remove saved image' } },
      load: async (context) => {
        const record = await actions.detail(context)
        return record ? { title: record.title, description: record.description, categoryId: record.categoryId, image: null } : undefined
      },
      submit: async (value: (typeof reportFormSchema)['_output']) => actions.update(id, await reportPayload(value)),
    }),
  },
  delete: { permission: 'delete-disaster-reports', run: (record) => actions.delete(record.id) },
})

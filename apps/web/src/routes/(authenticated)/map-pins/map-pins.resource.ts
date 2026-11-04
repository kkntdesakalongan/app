import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { appDisplayPresets } from '@/configs/display-presets'
import { actions } from './map-pins.actions'
import { createSchema, recordSchema } from './map-pins.schema'

import MapPositionInput from '@/components/maps/MapPositionInput.vue'
const formSchema = createSchema
  .omit({ latitude: true, longitude: true })
  .extend({ position: createSchema.pick({ latitude: true, longitude: true }) })
  .transform(({ position, ...value }) => ({ ...value, ...position }))
const fields = { name: { renderer: 'text' }, description: { renderer: 'textarea' }, position: { renderer: MapPositionInput, label: 'Map position' } } as const
const labels = { title: 'Title', name: 'Name', description: 'Description', image: 'Image', latitude: 'Latitude', longitude: 'Longitude' }
const form = defineForm({ schema: formSchema, labels, fields })
export const resource = defineResource({
  key: 'map-pins',
  identity: (record: { id: string }) => record.id,
  actions: { list: actions.list },
  list: {
    permission: 'view-map-pins',
    route: { name: 'map-pins' },
    table: { ...defineTable({ schema: recordSchema, labels, columns: { name: { sortable: true }, createdAt: appDisplayPresets.createdAt } }), load: actions.list },
  },
  create: { permission: 'create-map-pins', route: { name: 'map-pins-create' }, form: { ...form, submit: actions.create } },
  detail: {
    permission: 'view-map-pins',
    route: { name: 'map-pins-detail', params: (id) => ({ id: String(id) }) },
    detail: () => ({ ...defineDetail({ schema: recordSchema, labels, fields: { name: {}, description: {}, latitude: {}, longitude: {} } }), load: actions.detail }),
  },
  update: {
    permission: 'update-map-pins',
    route: { name: 'map-pins-edit', params: (id) => ({ id: String(id) }) },
    form: ({ id }) => ({
      ...form,
      load: async (context) => {
        const record = await actions.detail(context)
        return record ? { name: record.name, description: record.description, position: { latitude: record.latitude, longitude: record.longitude } } : undefined
      },
      submit: (value: (typeof createSchema)['_output']) => actions.update(id, value),
    }),
  },
  delete: { permission: 'delete-map-pins', run: (record) => actions.delete(record.id) },
})

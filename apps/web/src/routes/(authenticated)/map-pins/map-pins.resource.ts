import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { appDisplayPresets } from '@/configs/display-presets'
import { actions } from './map-pins.actions'
import { createSchema, recordSchema } from './map-pins.schema'

import { z } from 'zod/v4'
import { locationOperations } from '@/framework/adapters/location'
const formSchema = createSchema
  .omit({ latitude: true, longitude: true })
  .extend({ position: z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) }) })
  .transform(({ position, ...value }) => ({ ...value, latitude: position.lat, longitude: position.lng }))
const fields = {
  name: { renderer: 'text' },
  description: { renderer: 'textarea' },
  position: { renderer: 'location', label: 'Map position', props: { mapProvider: 'openstreetmap', operations: locationOperations } },
} as const
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
        return record ? { name: record.name, description: record.description, position: { lat: record.latitude, lng: record.longitude } } : undefined
      },
      submit: (value: (typeof createSchema)['_output']) => actions.update(id, value),
    }),
  },
  delete: { permission: 'delete-map-pins', run: (record) => actions.delete(record.id) },
})

import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { gisDataSelectSchema } from '@southneuhof/api/src/routes/(authenticated)/gis-data/schema.ts'
import { appDisplayPresets } from '@/configs/display-presets'
import { z } from 'zod/v4'
import { toast } from 'vue-sonner'
import GisSourceInput from '@/components/maps/GisSourceInput.vue'
import { gisLayers } from '@/components/maps/useGisLayers'
import { actions, uploadGisSource } from './gis-data.actions'
const labels = { name: 'Dataset', layers: 'Lapisan', filename: 'Berkas', featureCount: 'Jumlah fitur', updatedAt: 'Diubah pada', available: 'Status' }
const status = { read: (record: { available: boolean }) => (record.available ? 'Tersedia' : 'Belum diunggah') }
const uploadSchema = z.object({ source: z.custom<File>((value) => typeof File !== 'undefined' && value instanceof File, 'Pilih berkas sumber.') })
export const resource = defineResource({
  key: 'gis-data',
  identity: (record: { code: string }) => record.code,
  list: {
    permission: 'view-gis-data',
    route: { name: 'settings-gis-data' },
    table: { ...defineTable({ schema: gisDataSelectSchema, labels, columns: { name: {}, available: status, filename: {}, updatedAt: appDisplayPresets.updatedAt } }), load: actions.list },
  },
  update: {
    permission: 'update-gis-data',
    route: { name: 'settings-gis-data-edit', params: (id) => ({ code: String(id) }) },
    form: ({ id }) => ({
      ...defineForm({
        schema: uploadSchema,
        fields: { source: { renderer: GisSourceInput, label: 'Berkas sumber', props: { code: String(id) } } },
        submit: async ({ source }) => {
          const saved = gisDataSelectSchema.extend({ cleanupWarning: z.string().optional() }).parse(await uploadGisSource(id, source))
          if (saved.cleanupWarning) toast.warning(saved.cleanupWarning)
          return saved
        },
      }),
      load: async (context: Parameters<typeof actions.detail>[0]) => {
        const record = await actions.detail(context)
        return record ? { ...record, source: undefined } : undefined
      },
    }),
  },
  detail: {
    permission: 'view-gis-data',
    route: { name: 'settings-gis-data-detail', params: (id) => ({ code: String(id) }) },
    detail: () => ({
      ...defineDetail({
        schema: gisDataSelectSchema,
        labels,
        fields: {
          name: {},
          layers: { read: (record: { layers: string[] }) => record.layers.map((id) => gisLayers.find((layer) => layer.id === id)?.label ?? id).join(', ') },
          available: status,
          filename: {},
          featureCount: {},
          updatedAt: appDisplayPresets.updatedAt,
        },
      }),
      load: actions.detail,
    }),
  },
})

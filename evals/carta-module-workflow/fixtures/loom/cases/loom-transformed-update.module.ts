import { z } from 'zod/v4'
import { defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { listAmounts, loadAmount, saveAmount, type AmountRecord } from './loom-transformed-update.services'

export const updateSchema = z.object({
  displayName: z.string().min(1),
  amountText: z.string().transform((value) => Number(value) * 100),
}).transform(({ displayName, amountText }) => ({ displayName, amountMinor: amountText }))

const updateForm = defineForm({
  schema: updateSchema,
  labels: { displayName: 'Name', amountText: 'Amount' },
  fields: {
    displayName: { renderer: 'text' },
    amountText: { renderer: 'text', props: { type: 'text' } },
  },
})

const amountRecordSchema = z.object({ id: z.string(), displayName: z.string(), amountMinor: z.number() })
const amountTable = defineTable({
  schema: amountRecordSchema,
  columns: { displayName: {}, id: {} },
})

export const amountResource = defineResource({
  key: 'loom-eval-amounts',
  identity: (record: Pick<AmountRecord, 'id'>) => record.id,
  list: {
    permission: null,
    route: { name: 'loom-eval-amounts' },
    table: { ...amountTable, load: listAmounts },
  },
  update: {
    permission: null,
    route: { name: 'loom-eval-amounts-edit', params: (id) => ({ amountId: id }) },
    form: ({ id }) => ({
      ...updateForm,
      load: async () => {
        const record = await loadAmount({ id, searchParameters: {} })
        return record ? { displayName: record.displayName, amountText: String(record.amountMinor) } : undefined
      },
      submit: (output) => saveAmount(id, output),
    }),
  },
})

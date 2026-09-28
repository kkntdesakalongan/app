import { z } from 'zod/v4'
import { defineForm, defineResource } from '@southneuhof/loom'

const createForm = defineForm({
  schema: z.object({ name: z.string() }),
  fields: { name: { renderer: 'text' } },
  submit: async (input) => ({ id: 'amount-new', ...input }),
})

export const invalidResource = defineResource({
  key: 'loom-eval-invalid-amount',
  identity: (record: { id: string }) => record.id,
  create: {
    permission: null,
    form: createForm,
    typo: true,
  },
})

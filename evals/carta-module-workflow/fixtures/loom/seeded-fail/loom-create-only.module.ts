import { z } from 'zod/v4'
import { defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { createServiceRequest, type CreatedServiceRequest } from './loom-create-only.services'

const createSchema = z.object({ name: z.string().min(1) })
const createForm = defineForm({
  schema: createSchema,
  labels: { name: 'Request name' },
  fields: { name: { renderer: 'text' } },
  submit: createServiceRequest,
})

const requestRecordSchema = z.object({ id: z.string(), name: z.string() })
const requestTable = defineTable({ schema: requestRecordSchema, columns: { id: {}, name: {} } })
const noRequests: CreatedServiceRequest[] = []

export const serviceRequestResource = defineResource({
  key: 'loom-eval-create-only',
  identity: (record: CreatedServiceRequest) => record.id,
  list: {
    permission: null,
    table: { ...requestTable, load: async () => ({ data: noRequests }) },
  },
  create: {
    permission: null,
    route: { name: 'loom-eval-create-only-create' },
    form: createForm,
  },
})

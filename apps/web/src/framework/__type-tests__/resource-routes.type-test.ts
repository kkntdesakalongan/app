import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import type { RecordLoadContext } from '@southneuhof/loom'
import { z } from 'zod/v4'

type Row = { id: string; name: string }

const recordSchema = z.object({ id: z.string(), name: z.string() })
const createSchema = z.object({ name: z.string() })
const updateSchema = z.object({ name: z.string().optional() })
const table = defineTable({ schema: recordSchema, columns: { name: { sortable: true } } })
const detail = defineDetail({ schema: recordSchema, fields: { name: {} } })
const createForm = defineForm({
  schema: createSchema,
  fields: { name: { renderer: 'text' } },
  submit: async (input) => ({ id: 'created', ...input }),
})
const updateForm = defineForm({ schema: updateSchema, fields: { name: { renderer: 'text' } } })
const loadDetail = async ({ id }: RecordLoadContext): Promise<Row> => ({ id: String(id), name: 'One' })

const resource = defineResource({
  key: 'typed-routes',
  identity: (record: Row) => record.id,
  list: {
    permission: 'view-users',
    route: { name: 'settings-users' },
    table: { ...table, load: async () => ({ data: [{ id: '1', name: 'One' }] }) },
  },
  create: { permission: 'create-users', route: { name: 'settings-users-create' }, form: createForm },
  detail: {
    permission: 'view-users',
    route: { name: 'settings-users-detail', params: (id) => ({ userId: id }) },
    detail: () => ({ ...detail, load: loadDetail }),
  },
  update: {
    permission: 'update-users',
    route: { name: 'settings-users-edit', params: (id) => ({ userId: id }) },
    form: ({ id }) => ({
      ...updateForm,
      load: async () => ({ name: 'One' }),
      submit: async (input: (typeof updateSchema)['_output']) => ({ id, name: input.name ?? 'One' }),
    }),
  },
})

resource.list.table.load({ query: {}, searchParameters: {} })
resource.create.form.submit({ name: 'One' })
resource.detail({ id: '1' }).detail.load({ searchParameters: {} })
resource.update({ id: '1' }).form.submit({ name: 'Updated' })

const invalidRoute = {
  permission: 'view-users',
  route: { name: 'settings-users-detail', params: { roleId: '1' } },
  table: { ...table, load: async () => ({ data: [{ id: '1', name: 'One' }] }) },
}

defineResource({
  key: 'invalid-route',
  identity: (record: Row) => record.id,
  // @ts-expect-error The route uses a userId parameter.
  list: invalidRoute,
})

const missingUpdateLoad = ({ id }: { id: string }) => ({
  ...updateForm,
  submit: async (input: z.output<typeof updateSchema>) => ({ id, name: input.name ?? 'One' }),
})

const invalidUpdateResource = {
  key: 'missing-update-load',
  identity: (record: Row) => record.id,
  update: {
    permission: 'update-users',
    form: missingUpdateLoad,
  },
}
// @ts-expect-error An update form must load the record into its draft.
defineResource(invalidUpdateResource)

import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import type { FormDefinition, RawSchema, ResourceCustomCommand } from '@southneuhof/loom'
import { z } from 'zod/v4'

type Assert<TValue extends true> = TValue
type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? ((<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2 ? true : false) : false
type RouteNameOf<TValue> = Exclude<TValue, undefined> extends { name: infer TName } ? TName : never

const recordSchema = z.object({ id: z.string(), label: z.string() })
const inputSchema = z.object({ label: z.string() })
const form = defineForm({
  schema: inputSchema,
  fields: { label: { renderer: 'text' } },
  submit: async (input) => ({ id: input.label }),
})
const compactFormSchema: RawSchema<z.input<typeof inputSchema>, z.output<typeof inputSchema>> = form.schema
const formDefinition: FormDefinition<z.input<typeof inputSchema>, z.output<typeof inputSchema>, { id: string }, 'label'> = form
const recordLabel = (record: z.output<typeof recordSchema>) => record.label.toUpperCase()
const table = defineTable({ schema: recordSchema, columns: { label: { read: recordLabel, sortable: true, sortKey: 'label' } } })
const detail = defineDetail({ schema: recordSchema, fields: { label: { read: recordLabel } } })
const compactTableSchema: RawSchema<object, z.output<typeof recordSchema>> = table.schema
const compactDetailSchema: RawSchema<object, z.output<typeof recordSchema>> = detail.schema
const tableAccessor: (record: z.output<typeof recordSchema>) => string = table.columns.label.read
const detailAccessor: (record: z.output<typeof recordSchema>) => string = detail.fields.label.read
const resource = defineResource({
  key: 'type-contract',
  identity: (record: { id: string }) => record.id,
  create: { permission: null, form },
})
const boundResult: Promise<{ id: string }> = resource.create.form.submit({ label: 'one' })
const boundAfterSubmit: NonNullable<typeof resource.create.afterSubmit> = async ({ result }) => {
  const id: string = result.id
  void id
}
const routedResource = defineResource({
  key: 'route-contract',
  identity: (record: { id: string }) => record.id,
  actions: {
    inspect: {
      permission: null,
      route: { name: 'settings-users' },
      run: async (id: string) => ({ id, inspected: true as const }),
    },
  },
})
const actionRoute: { name: 'settings-users' } | undefined = routedResource.actions.inspect.route
const customResult: Promise<{ id: string; inspected: true }> = routedResource.actions.inspect.run('one')
type FormSelectionIsCompact = Assert<Equal<keyof typeof form.fields, 'label'>>
type TableSelectionIsCompact = Assert<Equal<keyof typeof table.columns, 'label'>>
type DetailSelectionIsCompact = Assert<Equal<keyof typeof detail.fields, 'label'>>
type ResourceKeyIsPreserved = Assert<Equal<typeof resource.key, 'type-contract'>>
type CreatePermissionIsPreserved = Assert<Equal<typeof resource.permissions.create, null>>
type CustomActionSelectionIsPreserved = Assert<Equal<keyof typeof routedResource.actions, 'inspect'>>
type CustomActionRouteNameIsPreserved = Assert<Equal<RouteNameOf<typeof routedResource.actions.inspect.route>, 'settings-users'>>
const customCommand: ResourceCustomCommand<(id: string) => Promise<{ id: string }>, string, { id: string }> = {
  run: async (id) => ({ id }),
  permission: 'records.read',
}

// @ts-expect-error Construction guards and intermediate bags stay outside the public type surface.
import type { ResourceDefinitionGuard, ResourceDefinitionInput, ResourceFormBag, ResourceListPage, BoundSubmit, FormSubmitResult } from '@southneuhof/loom'

void [compactFormSchema, formDefinition, compactTableSchema, compactDetailSchema, tableAccessor, detailAccessor, boundResult, boundAfterSubmit, actionRoute, customResult, customCommand]

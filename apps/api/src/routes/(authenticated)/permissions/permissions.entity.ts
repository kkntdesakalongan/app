import { createEntity } from '@southneuhof/sprindle/entity'
import { permissionCreateSchema, permissionSelectSchema, permissionUpdateSchema } from './schema'
import { permissions } from './permissions.table'

export const permission = createEntity({
  table: permissions,
  schemas: {
    create: permissionCreateSchema,
    update: permissionUpdateSchema,
    select: permissionSelectSchema,
  },
})

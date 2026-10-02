import { createEntity } from '@southneuhof/sprindle/entity'
import { roleCreateSchema, roleSelectSchema, roleUpdateSchema } from './schema'
import { roles } from './roles.table'

export const role = createEntity({
  table: roles,
  schemas: {
    create: roleCreateSchema,
    update: roleUpdateSchema,
    select: roleSelectSchema,
  },
})

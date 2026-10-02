import { createEntity } from '@southneuhof/sprindle/entity'
import { userCreateSchema, userSelectSchema, userUpdateSchema } from './schema'
import { users } from './users.table'

export const user = createEntity({
  table: users,
  schemas: {
    create: userCreateSchema,
    update: userUpdateSchema,
    select: userSelectSchema,
  },
});

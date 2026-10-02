import { defineDomainPart } from '@southneuhof/sprindle/model'
import { role } from './roles.entity'
import { roleAssignments, rolePermissions, roles } from './roles.table'

export const domain = defineDomainPart({
  tables: {
    roles,
    rolePermissions,
    roleAssignments,
  },
  entities: [role],
})

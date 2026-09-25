import type { OptionLoad } from '@southneuhof/loom'
import type { z } from 'zod/v4'
import { permissionsActions } from '@/routes/(authenticated)/settings/permissions/permissions.actions'
import { rolesActions } from '@/routes/(authenticated)/settings/roles/roles.actions'
import { rolesRecordSchema } from '@/routes/(authenticated)/settings/roles/roles.schema'
import { usersActions } from '@/routes/(authenticated)/settings/users/users.actions'

const usersQuery: Parameters<typeof usersActions.list>[0]['query'] = {
  sort_by: 'email',
  sort: 'desc',
  statusCode: 'active',
}
const rolesQuery: Parameters<typeof rolesActions.list>[0]['query'] = {
  sort_by: 'roleCode',
  sort: 'asc',
}
const permissionsQuery: Parameters<typeof permissionsActions.list>[0]['query'] = {
  sort_by: 'permissionCode',
}
const roleOptionLoader: OptionLoad<z.output<typeof rolesRecordSchema>> = rolesActions.list

// @ts-expect-error The users list does not accept a role sort key.
usersActions.list({ query: { sort_by: 'roleCode' }, searchParameters: {} })
// @ts-expect-error The roles list does not accept the user status filter.
rolesActions.list({ query: { statusCode: 'active' }, searchParameters: {} })
// @ts-expect-error The permissions list does not accept the user status filter.
permissionsActions.list({ query: { statusCode: 'active' }, searchParameters: {} })
// @ts-expect-error Direction is restricted to the shared Collection query values.
usersActions.list({ query: { sort: 'sideways' }, searchParameters: {} })

void [usersQuery, rolesQuery, permissionsQuery, roleOptionLoader]
